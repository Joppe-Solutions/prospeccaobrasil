import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, FileText, FolderOpen } from '@phosphor-icons/react';
import { api, getToken } from '../lib/api';
import DataTable from '../components/DataTable';
import { PageHeader } from '../components/UI';
import './collections.css';

const TIPOS = {
  planta: 'Planta', inteligencia: 'Inteligência de mercado', pre_analise: 'Pré-análise',
  rig: 'RIG / Habite-se', avcb: 'AVCB', convencao: 'Convenção', iptu_doc: 'IPTU',
  doc_locatario: 'Doc. locatário', contrato: 'Contrato', proposta: 'Proposta', certidao: 'Certidão', outro: 'Outro',
};
const fmtData = (v) => v ? String(v).slice(0, 10).split('-').reverse().join('/') : '—';

export default function Documentos() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true); setError('');
    api('/documentos').then(setDocs).catch(e => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const columns = useMemo(() => [
    { accessorKey: 'nome', header: 'Documento', cell: ({ row }) => (
      <span className="collection-cell-stack">
        <strong><FileText size={15} style={{ verticalAlign: -2, marginRight: 6 }} />{row.original.nome}</strong>
        <small>{TIPOS[row.original.tipo] || row.original.tipo} · {fmtData(row.original.criadoEm)}</small>
      </span>
    ) },
    { id: 'imovel', header: 'Imóvel', accessorFn: d => `${d.imovel?.codigo || ''} ${d.imovel?.endereco || ''} ${d.imovel?.cidade || ''}`, cell: ({ row }) => (
      <Link className="collection-cell-stack collection-title-link" to={`/imoveis/${row.original.imovel?.id}`}>
        <span className="collection-code">{row.original.imovel?.codigo || '—'}</span>
        <small>{row.original.imovel?.endereco || ''}{row.original.imovel?.cidade ? ` · ${row.original.imovel.cidade}` : ''}</small>
      </Link>
    ) },
    { id: 'acoes', header: '', enableSorting: false, enableHiding: false, cell: ({ row }) => {
      const d = row.original;
      const href = d.arquivo ? `/uploads/${encodeURIComponent(d.arquivo)}?token=${getToken()}` : d.url;
      return href ? <a className="icon-button" href={href} target="_blank" rel="noopener noreferrer" title="Abrir documento" aria-label={`Abrir ${d.nome}`}><ArrowUpRight size={17} /></a> : null;
    } },
  ], []);

  return <div className="collection-page">
    <PageHeader
      eyebrow="CADASTROS"
      title="Documentação"
      description="RGI, IPTU, plantas, contratos, propostas, certidões e anexos dos imóveis."
    />
    <section className="panel collection-panel">
      <div className="collection-section-head">
        <div><h2>Todos os documentos</h2><p>Documentos públicos e internos conforme sua permissão.</p></div>
        <span className="collection-section-symbol"><FolderOpen size={22} /></span>
      </div>
      <DataTable
        columns={columns}
        data={docs}
        loading={loading}
        error={error}
        searchPlaceholder="Buscar documento ou imóvel..."
        exportName="documentos.csv"
        emptyTitle="Nenhum documento"
        emptyDescription="Anexe documentos no detalhe de cada imóvel."
        toolbar={error && <button className="btn btn-ghost btn-sm" onClick={load}>Tentar novamente</button>}
      />
    </section>
  </div>;
}
