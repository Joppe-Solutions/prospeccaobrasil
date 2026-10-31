import { useEffect, useState } from 'react';

// Aviso único do sistema (snackbar): qualquer tela chama avisar('Imóvel salvo.') e o Layout mostra.
const ouvintes = new Set();
let atual = null;
let timer = null;

export function avisar(texto, { tipo = 'sucesso', duracao = 4000 } = {}) {
  clearTimeout(timer);
  atual = texto ? { texto, tipo, id: Date.now() } : null;
  ouvintes.forEach(fn => fn(atual));
  if (atual) timer = setTimeout(() => avisar(''), duracao);
}

export function useAviso() {
  const [aviso, setAviso] = useState(atual);
  useEffect(() => { ouvintes.add(setAviso); return () => ouvintes.delete(setAviso); }, []);
  return aviso;
}
