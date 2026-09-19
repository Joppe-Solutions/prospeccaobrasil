import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Buildings, MapPin, PencilSimple, Plus, Storefront, UsersThree } from '@phosphor-icons/react';
import { api, fmtNum } from '../lib/api';
import DataTable from '../components/DataTable';
import { Avatar, PageHeader, StatusBadge } from '../components/UI';
import './collections.css';

export default function Empresas() {
  const location = useLocation();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [segmento, setSegmento] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setList(await api('/empresas')); } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load, location.key]);
  const segmentos = useMemo(() => [...new Set(list.map(e => e.segmento).filter(Boolean))].sort(), [list]);
  const filtered = useMemo(() => list.filter(e => !segmento || e.segmento === segmento), [list, segmento]);
  const columns = useMemo(() => [
    { id: 'empresa', header: 'Empresa', accessorFn: e => `${e.nome} ${e.cnpj || ''}`, cell: ({ row }) => <div className="collection-identity"><Avatar name={row.original.nome} /><span className="collection-cell-stack"><Link className="collection-title-link" to={`/empresas/${row.original.id}/editar`} state={{ backgroundLocation: location }}>{row.original.nome}</Link><small>{row.original.cnpj || 'CNPJ não informado'}</small></span></div> },
    { accessorKey: 'segmento', header: 'Segmento', cell: ({ getValue }) => getValue() ? <span className="collection-tag">{getValue()}</span> : <span className="muted">Não informado</span> },
    { id: 'contato', header: 'Contato principal', accessorFn: e => `${e.contatoNome || ''} ${e.email || ''} ${e.telefone || ''}`, cell: ({ row }) => <span className="collection-cell-stack"><span>{row.original.contatoNome || 'Não informado'}</span><small>{row.original.telefone || row.original.email || 'Sem contato cadastrado'}</small></span> },
    { id: 'area', header: 'Área de interesse', accessorFn: e => `${e.areaMinima || ''} ${e.areaMaxima || ''}`, cell: ({ row }) => <span className="collection-nowrap">{row.original.areaMinima || row.original.areaMaxima ? `${fmtNum(row.original.areaMinima)} – ${fmtNum(row.original.areaMaxima)} m²` : '—'}</span> },
    { accessorKey: 'regioesInteresse', header: 'Regiões', cell: ({ getValue }) => <span className="collection-regions" title={getValue() || ''}>{getValue() || '—'}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue()} label={getValue() === 'ativo' ? 'Ativa' : getValue() === 'inativo' ? 'Inativa' : getValue()} /> },
    { id: 'acoes', header: '', enableSorting: false, enableHiding: false, cell: ({ row }) => <Link className="icon-button" to={`/empresas/${row.original.id}/editar`} state={{ backgroundLocation: location }} aria-label={`Editar ${row.original.nome}`}><PencilSimple size={18} /></Link> },
  ], [location]);
  const count = value => loading || error ? '—' : value;
  return <div className="collection-page">
    <PageHeader eyebrow="RELACIONAMENTOS" title="Empresas" description="Conecte marcas, entenda demandas e expanda possibilidades." actions={<Link className="btn btn-gold" to="/empresas/nova" state={{ backgroundLocation: location }}><Plus size={18} weight="bold" /> Nova empresa</Link>} />
    <div className="collection-stats"><div><span className="collection-stat-icon"><Buildings size={21} /></span><span><small>Empresas cadastradas</small><strong>{count(list.length)}</strong></span></div><div><span className="collection-stat-icon is-green"><UsersThree size={21} /></span><span><small>Relacionamentos ativos</small><strong>{count(list.filter(e => e.status === 'ativo').length)}</strong></span></div><div><span className="collection-stat-icon is-gold"><Storefront size={21} /></span><span><small>Segmentos de atuação</small><strong>{count(segmentos.length)}</strong></span></div></div>
    <section className="panel collection-panel"><div className="collection-section-head"><div><h2>Sua rede de negócios</h2><p>Perfis de expansão e contatos em um só lugar.</p></div><span className="collection-section-symbol"><MapPin size={20} /></span></div>
      <DataTable columns={columns} data={filtered} loading={loading} error={error} searchPlaceholder="Buscar empresa, segmento ou contato..." exportName="empresas.csv" emptyTitle="Nenhuma empresa encontrada" emptyDescription="Cadastre uma empresa e comece a conectar demandas ao seu portfólio." toolbar={<><label className="collection-select"><Storefront size={16} /><select aria-label="Filtrar segmento" value={segmento} onChange={e => setSegmento(e.target.value)}><option value="">Todos os segmentos</option>{segmentos.map(s => <option key={s}>{s}</option>)}</select></label>{segmento && <button className="btn btn-ghost btn-sm" onClick={() => setSegmento('')}>Limpar filtro</button>}{error && <button className="btn btn-ghost btn-sm" onClick={load}>Tentar novamente</button>}</>} />
    </section>
  </div>;
}
