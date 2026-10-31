import { useCallback, useEffect, useMemo, useState } from 'react';
import Selecao from '../components/Selecao';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowRight, Buildings, CheckCircle, Handshake, Plus } from '@phosphor-icons/react';
import { api, fmtMoney, fmtNum, STATUS, TIPOS_IMOVEL } from '../lib/api';
import DataTable from '../components/DataTable';
import { PageHeader, StatusBadge } from '../components/UI';
import './collections.css';

const CATEGORIAS = { loja: 'Loja', predio: 'Prédio', terreno: 'Terreno', outro: 'Outro' };

export default function Imoveis() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get('status') || '';
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState(statusParam && STATUS[statusParam] ? statusParam : '');
  const [tipo, setTipo] = useState('');
  const [categoria, setCategoria] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setList(await api('/imoveis')); } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load, location.key]);
  useEffect(() => {
    const next = statusParam && STATUS[statusParam] ? statusParam : '';
    setStatus(next);
  }, [statusParam]);
  const updateStatus = (value) => {
    setStatus(value);
    const next = new URLSearchParams(searchParams);
    if (value) next.set('status', value); else next.delete('status');
    setSearchParams(next, { replace: true });
  };
  const filtered = useMemo(() => list.filter(i =>
    (!status || i.status === status) && (!tipo || i.tipo === tipo) && (!categoria || i.categoria === categoria)
  ), [list, status, tipo, categoria]);
  const columns = useMemo(() => [
    { id: 'imovel', header: 'Imóvel', accessorFn: i => `${i.codigo} ${i.titulo || ''} ${i.endereco} ${i.numero || ''} ${i.bairro || ''}`, cell: ({ row }) => {
      const i = row.original;
      return <Link className="collection-property" to={`/imoveis/${i.id}`}>
        {i.fotos?.[0] ? <img className="collection-property-photo" src={`/uploads/${i.fotos[0].arquivo}`} alt="" loading="lazy" /> : <span className="collection-property-photo is-placeholder"><Buildings size={25} weight="light" /></span>}
        <span className="collection-cell-stack"><span className="collection-code">{i.codigo}</span><strong>{i.endereco}{i.numero ? `, ${i.numero}` : ''}</strong><small>{i.bairro || 'Bairro não informado'}</small></span>
      </Link>;
    } },
    { accessorKey: 'categoria', header: 'Categoria', cell: ({ getValue }) => getValue() ? <span className="collection-tag">{CATEGORIAS[getValue()] || getValue()}</span> : <span className="muted">—</span> },
    { id: 'localizacao', header: 'Localização', accessorFn: i => `${i.cidade}/${i.uf}`, cell: ({ row }) => <span className="collection-cell-stack"><span>{row.original.cidade}</span><small>{row.original.uf}</small></span> },
    { accessorKey: 'areaTotal', header: 'ABL', cell: ({ getValue }) => <span className="collection-nowrap">{fmtNum(getValue(), 'm²')}</span> },
    { id: 'custo', header: 'Investimento', accessorFn: i => i.tipo === 'venda' ? Number(i.precoVenda || 0) : [i.aluguel, i.condominio, i.iptu].reduce((n, v) => n + Number(v || 0), 0), cell: ({ row, getValue }) => <span className="collection-cell-stack"><strong className="collection-money">{fmtMoney(getValue())}</strong><small>{row.original.tipo === 'venda' ? 'Valor de venda' : 'Custo mensal total'}</small></span> },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue()} label={STATUS[getValue()]} /> },
    { id: 'acoes', header: '', enableSorting: false, enableHiding: false, cell: ({ row }) => <Link className="icon-button" to={`/imoveis/${row.original.id}`} aria-label={`Abrir imóvel ${row.original.codigo}`}><ArrowRight size={18} /></Link> },
  ], []);
  const count = value => loading || error ? '—' : value;

  return <div className="collection-page">
    <PageHeader eyebrow="Portfólio imobiliário" title="Imóveis" description="Os melhores endereços para o próximo grande negócio." actions={<Link className="btn btn-gold" to="/imoveis/novo" state={{ backgroundLocation: location }}><Plus size={18} weight="bold" /> Novo imóvel</Link>} />
    <div className="collection-stats">
      <div><span className="collection-stat-icon"><Buildings size={21} /></span><span><small>Imóveis no portfólio</small><strong>{count(list.length)}</strong></span></div>
      <div><span className="collection-stat-icon is-green"><CheckCircle size={21} /></span><span><small>Disponíveis</small><strong>{count(list.filter(i => i.status === 'disponivel').length)}</strong></span></div>
      <div><span className="collection-stat-icon is-gold"><Handshake size={21} /></span><span><small>Em análise</small><strong>{count(list.filter(i => i.status === 'em_analise').length)}</strong></span></div>
    </div>
    <section className="panel collection-panel">
      <div className="collection-section-head">
        <div><h2>Seu portfólio</h2><p>Consulte, organize e encontre o imóvel certo.</p></div>
      </div>
      <DataTable columns={columns} data={filtered} loading={loading} error={error} searchPlaceholder="Buscar imóvel, código ou bairro..." exportName="imoveis.csv" emptyAction={<Link className="btn btn-primary btn-sm" to="/imoveis/novo" state={{ backgroundLocation: location }}><Plus size={16} /> Novo imóvel</Link>} emptyTitle="Nenhum imóvel encontrado" emptyDescription="Ajuste os filtros ou cadastre um imóvel para começar." toolbar={<>
        <Selecao aria-label="Filtrar por categoria" value={categoria} onChange={e => setCategoria(e.target.value)}><option value="">Todas as categorias</option>{Object.entries(CATEGORIAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Selecao>
        <Selecao aria-label="Filtrar por tipo de negócio" value={tipo} onChange={e => setTipo(e.target.value)}><option value="">Todos os negócios</option>{Object.entries(TIPOS_IMOVEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Selecao>
        <Selecao aria-label="Filtrar por status" value={status} onChange={e => updateStatus(e.target.value)}><option value="">Todos os status</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Selecao>
        {(status || tipo || categoria) && <button className="btn btn-ghost btn-sm" onClick={() => { updateStatus(''); setTipo(''); setCategoria(''); }}>Limpar filtros</button>}
        {error && <button className="btn btn-ghost btn-sm" onClick={load}>Tentar novamente</button>}
      </>} />
    </section>
  </div>;
}
