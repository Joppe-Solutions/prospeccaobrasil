import { useEffect, useState } from 'react';
import Selecao from './Selecao';
import { api } from '../lib/api';

const OUTRA = 'outra';

// Empresa do cadastro CNPJ: dropdown com as empresas de Clientes; "Outra empresa" libera a digitação do nome.
export default function EmpresaVinculo({ id, className = 'field', empresaId, empresaNome, onChange }) {
  const [empresas, setEmpresas] = useState([]);
  const [digitando, setDigitando] = useState(!empresaId && !!empresaNome);
  useEffect(() => { api('/empresas').then(setEmpresas).catch(() => setEmpresas([])); }, []);
  function escolher(valor) {
    setDigitando(valor === OUTRA);
    const e = empresas.find(o => String(o.id) === valor);
    onChange({ empresaId: e ? e.id : null, empresaNome: e ? e.nome : '' });
  }
  return <div className={className}>
    <label htmlFor={id}>Empresa</label>
    <Selecao id={id} value={digitando ? OUTRA : empresaId ?? ''} onChange={e => escolher(e.target.value)}>
      <option value="">Selecione a empresa</option>
      {empresas.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
      <option value={OUTRA}>Outra empresa (digitar o nome)</option>
    </Selecao>
    {digitando && <input id={`${id}-nome`} className="empresa-vinculo-nome" aria-label="Nome da empresa" autoFocus value={empresaNome} onChange={e => onChange({ empresaId: null, empresaNome: e.target.value })} placeholder="Nome da empresa" />}
  </div>;
}
