import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Brain } from '@phosphor-icons/react';
import { api, getToken } from '../lib/api';
import DataTable from '../components/DataTable';
import { PageHeader } from '../components/UI';
import './collections.css';

const fmtData = (v) => v ? String(v).slice(0, 10).split('-').reverse().join('/') : '—';

export default function Inteligencia() {
  const [analises, setAnalises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true); setError('');
    api('/inteligencia').then(setAnalises).catch(e => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const columns = useMemo(() => [
    { id: 'imovel', header: 'Imóvel', accessorFn: a => `${a.imovel?.codigo || ''} ${a.imovel?.endereco || ''} ${a.imovel?.cidade || ''}`, cell: ({ row }) => (
      <Link className="collection-cell-stack collection-title-link" to={`/imoveis/${row.original.imovel?.id}`}>
        <span className="collection-code">{row.original.imovel?.codigo || '—'}</span>
        <strong>{row.original.imovel?.titulo || row.original.imovel?.endereco || 'Imóvel'}</strong>
        <small>{[row.original.imovel?.cidade, row.original.imovel?.uf].filter(Boolean).join(' / ') || '—'}</small>
      </Link>
    ) },
    { accessorKey: 'score', header: 'Score', cell: ({ getValue }) => <strong>{getValue() ?? '—'}</strong> },
    { accessorKey: 'resumo', header: 'Resumo', cell: ({ getValue }) => <span style={{ maxWidth: 420, display: 'inline-block' }}>{getValue() || '—'}</span> },
    { accessorKey: 'modelo', header: 'Origem', cell: ({ getValue }) => <small>{getValue() || 'motor-interno'}</small> },
    { accessorKey: 'criadoEm', header: 'Gerada em', cell: ({ getValue }) => fmtData(getValue()) },
    { id: 'acoes', header: '', enableSorting: false, enableHiding: false, cell: ({ row }) => (
      <div className="collection-row-actions">
        <a className="icon-button" href={`/inteligencia/${row.original.id}?token=${getToken()}`} target="_blank" rel="noopener noreferrer" title="Abrir documento completo" aria-label="Abrir documento completo"><ArrowUpRight size={17} /></a>
        <Link className="icon-button" to={`/imoveis/${row.original.imovel?.id}`} title="Abrir imóvel" aria-label="Abrir imóvel"><ArrowUpRight size={17} /></Link>
      </div>
    ) },
  ], []);

  return <div className="collection-page">
    <PageHeader
      eyebrow="CADASTROS"
      title="Inteligência de mercado"
      description="Triagens heurísticas de viabilidade geradas a partir dos dados cadastrados de cada imóvel."
    />
    <div className="alert" role="note" style={{ marginBottom: 16 }}>
      As análises são heurísticas geradas a partir do cadastro — não constituem estudo de mercado nem substituem avaliação profissional.
    </div>
    <section className="panel collection-panel">
      <div className="collection-section-head">
        <div><h2>Análises geradas</h2><p>Histórico de triagens por imóvel.</p></div>
        <span className="collection-section-symbol"><Brain size={22} /></span>
      </div>
      <DataTable
        columns={columns}
        data={analises}
        loading={loading}
        error={error}
        searchPlaceholder="Buscar por imóvel ou cidade..."
        exportName="inteligencia.csv"
        emptyTitle="Nenhuma análise"
        emptyDescription="Gere a inteligência de mercado no detalhe de cada imóvel."
        toolbar={error && <button className="btn btn-ghost btn-sm" onClick={load}>Tentar novamente</button>}
      />
    </section>
  </div>;
}
