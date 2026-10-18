#!/usr/bin/env python3
"""Gera sistema/api/src/data/censo2022-setores-rj.json: setores censitários do estado do RJ
(Censo 2022) com centroide, para somar a população e a renda num raio em torno do imóvel.

Uso: python3 scripts/build-censo2022-setores.py <pasta>

A pasta deve conter (https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/):
  Agregados_por_Setores_Censitarios/malha_com_atributos/setores/gpkg/UF/RJ/RJ_setores_CD2022.gpkg
  Agregados_por_Setores_Censitarios/Agregados_por_Setor_csv/  -> Agregados_por_setores_{basico,demografia}_BR.csv
  Agregados_por_Setores_Censitarios_Rendimento_do_Responsavel/ -> Agregados_por_setores_renda_responsavel_BR.csv

Precisa do ogr2ogr (GDAL) para tirar o centroide dos polígonos. Cada setor vira uma lista:
[lat, lon, área km², população, domicílios, domicílios ocupados, domicílios vagos, homens, mulheres,
 11 faixas etárias (0–4 ... 70+), responsáveis, renda média, renda mediana, 11 faixas de homens].
"""
import csv, json, os, subprocess, sys, tempfile

SRC = sys.argv[1]
UF = '33'
OUT = os.path.join(os.path.dirname(__file__), '..', 'sistema', 'api', 'src', 'data', 'censo2022-setores-rj.json')

def num(v):
    v = (v or '').strip().replace(',', '.')
    if v in ('', '.', 'X'):
        return None
    f = float(v)
    return int(f) if f.is_integer() else round(f, 2)

def ler(nome):
    with open(os.path.join(SRC, nome), encoding='latin1', newline='') as f:
        linhas = csv.DictReader(f, delimiter=';')
        chave = next(c for c in linhas.fieldnames if c.upper() == 'CD_SETOR')  # o arquivo de demografia usa "CD_setor"
        return {r[chave]: r for r in linhas if r[chave].startswith(UF)}

with tempfile.TemporaryDirectory() as tmp:
    centroides = os.path.join(tmp, 'c.csv')
    subprocess.run(['ogr2ogr', '-f', 'CSV', centroides, os.path.join(SRC, 'RJ_setores_CD2022.gpkg'), '-dialect', 'sqlite', '-sql',
                    'SELECT CD_SETOR, ST_Y(ST_Centroid(geom)) AS lat, ST_X(ST_Centroid(geom)) AS lon FROM RJ_setores_CD2022'], check=True)
    with open(centroides, encoding='utf8', newline='') as f:
        pontos = {r['CD_SETOR']: (round(float(r['lat']), 5), round(float(r['lon']), 5)) for r in csv.DictReader(f) if r['lat']}

basico, demo, renda = ler('Agregados_por_setores_basico_BR.csv'), ler('Agregados_por_setores_demografia_BR.csv'), ler('Agregados_por_setores_renda_responsavel_BR.csv')
setores = []
for cd, b in basico.items():
    pop = num(b['v0001'])
    if not pop or cd not in pontos:
        continue
    d, r = demo.get(cd, {}), renda.get(cd, {})
    setores.append([*pontos[cd], round(num(b['AREA_KM2']) or 0, 4), pop, num(b['v0002']), num(b['v0007']), num(b['v0009']),
                    num(d.get('V01007')), num(d.get('V01008')), *[num(d.get(f'V010{n}')) for n in range(31, 42)],
                    num(r.get('V06001')), num(r.get('V06004')), num(r.get('V06006')), *[num(d.get(f'V010{n:02d}')) for n in range(9, 20)]])

setores.sort()
with open(OUT, 'w', encoding='utf8') as f:
    json.dump({'fonte': 'IBGE — Censo Demográfico 2022, Agregados por setores censitários (RJ)', 'setores': setores}, f, separators=(',', ':'))
print(len(setores), 'setores ->', round(os.path.getsize(OUT) / 1e6, 2), 'MB')
