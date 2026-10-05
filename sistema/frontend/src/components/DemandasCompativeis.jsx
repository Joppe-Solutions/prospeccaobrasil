import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowSquareOut, Check, Handshake, Question, X } from '@phosphor-icons/react';
import { api } from '../lib/api';
import Modal from './Modal';
import { EmptyState, LoadingState } from './UI';

const ICONES = { atende: Check, nao_atende: X, sem_dado: Question };
const LEGENDA = { atende: 'Atende', nao_atende: 'Não atende', sem_dado: 'Imóvel sem esse dado' };
const ETAPAS = { apresentado: 'Apresentado', visita: 'Em visita', proposta: 'Proposta', negociacao: 'Negociação', fechado: 'Fechado', perdido: 'Perdido' };

function Demanda({ demanda, ofertavel, enviando, onApresentar }) {
  return <li className="match-item">
    <header>
      <div className="collection-cell-stack">
        <Link className="collection-title-link" to={`/demandas/${demanda.id}`}><strong>{demanda.titulo}</strong> <ArrowSquareOut size={12} /></Link>
        <small>{demanda.empresa.nome}</small>
      </div>
      {demanda.oportunidade
        ? <span className="collection-tag">Já apresentado · {ETAPAS[demanda.oportunidade.etapa] || demanda.oportunidade.etapa}</span>
        : ofertavel && <button type="button" className="btn btn-ghost btn-sm" disabled={enviando} onClick={() => onApresentar(demanda)}><Handshake size={16} /> Apresentar imóvel</button>}
    </header>
    <ul className="match-criteria">
      {demanda.criterios.map(c => {
        const Icon = ICONES[c.status];
        return <li key={c.chave} className={`is-${c.status}`} title={LEGENDA[c.status]}>
          <Icon size={12} weight="bold" aria-label={LEGENDA[c.status]} />
          <span><strong>{c.rotulo}:</strong> {c.exigido}{c.imovel && c.chave !== 'negocio' ? ` · imóvel: ${c.imovel}` : ''}</span>
        </li>;
      })}
    </ul>
  </li>;
}

export default function DemandasCompativeis({ imovel, onClose, onChange }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const load = useCallback(async () => {
    try { setData(await api(`/imoveis/${imovel.id}/demandas-compativeis`)); } catch (e) { setError(e.message); }
  }, [imovel.id]);
  useEffect(() => { load(); }, [load]);

  async function apresentar(demanda) {
    setEnviando(true); setError('');
    try {
      await api('/oportunidades', { method: 'POST', body: JSON.stringify({ imovelId: imovel.id, empresaId: demanda.empresa.id, demandaId: demanda.id }) });
      await load(); onChange?.();
    } catch (e) { setError(e.message); } finally { setEnviando(false); }
  }

  const grupos = data ? [
    ['Compatíveis', 'Atendem a todas as diretrizes avaliadas.', data.demandas.filter(d => d.nivel === 'compativel')],
    ['Quase compatíveis', 'Apenas um critério fora da diretriz.', data.demandas.filter(d => d.nivel === 'parcial')],
  ].filter(g => g[2].length) : [];

  return <Modal wide closeOnOverlay onClose={onClose} title={`Diretrizes de expansão · ${imovel.codigo}`} description="Demandas ativas cujas premissas este imóvel atende.">
    {error && <div className="alert error" role="alert">{error}</div>}
    {!data && !error && <LoadingState />}
    {data && !data.ofertavel && <div className="alert">Imóvel fora de oferta (status atual). As demandas abaixo são apenas referência.</div>}
    {data && !grupos.length && <EmptyState title="Nenhuma demanda compatível" description="Nenhuma demanda ativa tem diretrizes que este imóvel atenda." />}
    {grupos.map(([titulo, descricao, itens]) => <section key={titulo} className="match-group">
      <h3>{titulo} <span>{itens.length}</span></h3><p>{descricao}</p>
      <ul className="match-list">{itens.map(d => <Demanda key={d.id} demanda={d} ofertavel={data.ofertavel} enviando={enviando} onApresentar={apresentar} />)}</ul>
    </section>)}
  </Modal>;
}
