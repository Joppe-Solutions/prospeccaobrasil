#!/usr/bin/env python3
"""Gera sistema/api/src/data/censo2022.json a partir dos Agregados do Censo 2022 (IBGE).

Uso: python3 scripts/build-censo2022.py <pasta com os CSV descompactados>

Arquivos (https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/):
  Agregados_por_Setores_Censitarios/Agregados_por_{Bairro,Municipio}_csv/  -> *_basico_BR, *_demografia_BR
  Agregados_por_Setores_Censitarios_Rendimento_do_Responsavel/            -> *_renda_responsavel_BR

Cada registro vira uma lista na ordem de CAMPOS (ver api/src/services/censo2022.js).
"""
import csv, json, os, sys

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', 'sistema', 'api', 'src', 'data', 'censo2022.json')

def num(v):
    v = (v or '').strip().replace(',', '.')
    if v in ('', '.', 'X'):
        return None
    f = float(v)
    return int(f) if f.is_integer() else round(f, 2)

def ler(nome, chave):
    with open(os.path.join(SRC, nome), encoding='latin1', newline='') as f:
        return {r[chave]: r for r in csv.DictReader(f, delimiter=';')}

def registros(nivel, chave):
    basico = ler(f'Agregados_por_{nivel}_basico_BR.csv', chave)
    demo = ler(f'Agregados_por_{nivel}_demografia_BR.csv', chave)
    renda = ler(f'Agregados_por_{nivel}_renda_responsavel_BR.csv', chave)
    for cd, b in basico.items():
        d, r = demo.get(cd, {}), renda.get(cd, {})
        yield cd, b, [
            num(b['AREA_KM2']), num(b['v0001']), num(b['v0002']), num(b['v0007']), num(b['v0005']),
            num(b['v0009']), num(b['v0008']), num(d.get('V01007')), num(d.get('V01008')),
            *[num(d.get(f'V010{n}')) for n in range(31, 42)],  # 0-4 ... 70+
            num(r.get('V06001')), num(r.get('V06004')), num(r.get('V06006')),
        ]

municipios = {cd: [b['NM_MUN'], *v] for cd, b, v in registros('municipios', 'CD_MUN')}
bairros = {}
for cd, b, v in registros('bairros', 'CD_BAIRRO'):
    bairros.setdefault(b['CD_MUN'], []).append([b['NM_BAIRRO'], *v])

with open(OUT, 'w', encoding='utf8') as f:
    json.dump({'fonte': 'IBGE — Censo Demográfico 2022, Agregados por bairros e municípios', 'municipios': municipios, 'bairros': bairros}, f, ensure_ascii=False, separators=(',', ':'))
print(len(municipios), 'municípios,', sum(len(v) for v in bairros.values()), 'bairros em', len(bairros), 'municípios ->', round(os.path.getsize(OUT) / 1e6, 2), 'MB')
