import { useEffect, useState } from 'react';

export function getToken() { return localStorage.getItem('pb_token'); }
export function getUser() { try { return JSON.parse(localStorage.getItem('pb_user')); } catch { return null; } }
export function logout() { localStorage.removeItem('pb_token'); localStorage.removeItem('pb_user'); location.href = '/login'; }

export async function api(path, opts = {}) {
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: {
      ...(opts.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...opts.headers,
    },
  });
  if (res.status === 401) { logout(); throw new Error('Sessão expirada'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
  return data;
}

export const fmtMoney = (v) => v == null || Number(v) === 0 ? '—' : 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
export const fmtNum = (v, u = '') => v == null ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + (u ? ' ' + u : '');
export const STATUS = { disponivel: 'Disponível', negociacao: 'Em negociação', locado: 'Locado', vendido: 'Vendido', inativo: 'Inativo' };
// A ordem das chaves é a ordem do campo "Tipo" no formulário
export const TIPOS_IMOVEL = { locacao: 'Locação', passagem_ponto: 'Passagem de ponto comercial', venda: 'Ativo comercial à venda' };

// Token curto (10 min) para links que abrem em nova aba: documentos privados, comprovantes e
// relatórios. O token de sessão nunca vai na URL.
export function useArquivoToken() {
  const [token, setToken] = useState('');
  useEffect(() => {
    let ativo = true;
    const renovar = () => api('/auth/token-arquivo').then(r => { if (ativo) setToken(r.token); }).catch(() => {});
    renovar();
    const timer = setInterval(renovar, 4 * 60 * 1000);
    return () => { ativo = false; clearInterval(timer); };
  }, []);
  return token;
}

export const MAPS_AUTO = 'https://www.google.com/maps/search/?api=1&query=';
// Mesmo link que a API grava ao salvar: Google Maps pelas coordenadas do imóvel ou, sem elas, pelo endereço.
export function mapsUrl(i) {
  if (i.googleMapsUrl && !i.googleMapsUrl.startsWith(MAPS_AUTO)) return i.googleMapsUrl;
  // Coordenadas exatas (copiadas do Google Maps) valem mais que o endereço digitado
  if (i.latitude != null && i.longitude != null && i.latitude !== '' && i.longitude !== '' && Number.isFinite(Number(i.latitude)) && Number.isFinite(Number(i.longitude))) return MAPS_AUTO + encodeURIComponent(`${Number(i.latitude)},${Number(i.longitude)}`);
  const consulta = [[i.endereco, i.numero].filter(Boolean).join(', '), i.bairro, i.cidade, i.uf, i.cep].filter(Boolean).join(', ');
  return consulta ? MAPS_AUTO + encodeURIComponent(consulta) : '';
}

// Envia fotos de um imóvel (a API aceita 10 por requisição) e devolve as criadas, na ordem.
export async function enviarFotos(imovelId, files) {
  const criadas = [];
  for (let n = 0; n < files.length; n += 10) {
    const body = new FormData();
    files.slice(n, n + 10).forEach(f => body.append('fotos', f));
    criadas.push(...await api(`/imoveis/${imovelId}/fotos`, { method: 'POST', body }));
  }
  return criadas;
}

// "-22.9068, -43.1729" (o que o Google Maps copia ao clicar no ponto) → { lat, lon } ou null
export function lerCoordenadas(texto) {
  const m = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*(?:[,;]\s*|\s+)(-?\d{1,3}(?:\.\d+)?)\s*$/.exec(String(texto ?? ''));
  if (!m) return null;
  const lat = Number(m[1]), lon = Number(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null;
}
// Mesmo formato, com os limites (latitude ±90, longitude ±180), para o atributo `pattern` do campo
const LAT = '-?(?:90(?:\\.0+)?|[0-8]?\\d(?:\\.\\d+)?)';
const LON = '-?(?:180(?:\\.0+)?|1[0-7]\\d(?:\\.\\d+)?|\\d{1,2}(?:\\.\\d+)?)';
export const PADRAO_COORDENADAS = `\\s*${LAT}\\s*(?:[,;]\\s*|\\s+)${LON}\\s*`;

export const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

export const TIPOS_PARCEIRO = { consultor: 'Consultor', advogado: 'Advogado', corretor: 'Corretor', imobiliaria: 'Imobiliária', indicador: 'Indicador' };
// Pessoa definida pelo tipo (indicador pode ser física ou jurídica)
export const PESSOA_PARCEIRO = { consultor: 'pf', advogado: 'pf', corretor: 'pf', imobiliaria: 'pj' };

// Registro profissional do parceiro: "CRECI-PF RJ-12345" (corretor), "CRECI-PJ RJ-9876" (imobiliária), "OAB RJ-123456" (advogado)
export function registroProfissional(p) {
  if (!p) return '';
  if (['corretor', 'imobiliaria'].includes(p.tipo) && p.creci) return `CRECI-${p.tipo === 'imobiliaria' ? 'PJ' : 'PF'} ${p.creciUf ? `${p.creciUf}-` : ''}${p.creci}`;
  if (p.tipo === 'advogado' && p.oab) return `OAB ${p.oabUf ? `${p.oabUf}-` : ''}${p.oab}`;
  return '';
}
