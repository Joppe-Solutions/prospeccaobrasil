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
export const TIPOS_IMOVEL = { locacao: 'Locação', venda: 'Venda direta', passagem_ponto: 'Passagem de ponto' };

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
