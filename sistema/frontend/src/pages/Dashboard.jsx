import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Buildings, CheckCircle, Handshake, MapPin, Plus, UsersThree } from '@phosphor-icons/react';
import { api, fmtMoney, getUser, STATUS } from '../lib/api';
import DataTable from '../components/DataTable';
import { PageHeader, StatusBadge, LoadingState } from '../components/UI';

export default function Dashboard() {
  const [d, setD] = useState(null); const [error, setError] = useState(''); const location = useLocation();
  const load = () => { setError(''); api('/dashboard').then(setD).catch(e => setError(e.message)); };
  useEffect(load, []);
  const columns = useMemo(() => [
    { id: 'imovel', header: 'Imóvel', accessorFn: i => `${i.codigo} ${i.endereco} ${i.bairro}`, cell: ({ row: { original: i } }) => <div className="property-cell"><span className="property-thumbnail">{i.fotos?.[0] ? <img src={`/uploads/${i.fotos[0].arquivo}`} alt="" /> : <Buildings size={23} weight="duotone" />}</span><div><Link to={`/imoveis/${i.id}`}>{i.endereco}{i.numero ? `, ${i.numero}` : ''}</Link><span>{i.codigo}<i />{i.bairro || i.cidade}</span></div></div> },
    { id: 'valor', header: 'Valor', accessorFn: i => i.tipo === 'venda' ? Number(i.precoVenda) : [i.aluguel, i.condominio, i.iptu].reduce((a,b) => a + (Number(b) || 0), 0), cell: ({ getValue, row }) => <div className="value-cell"><strong>{fmtMoney(getValue())}</strong><span>{row.original.tipo === 'venda' ? 'Venda' : 'Custo mensal'}</span></div> },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue()} /> },
    { id: 'actions', header: '', enableHiding: false, cell: ({ row }) => <Link className="row-link" to={`/imoveis/${row.original.id}`} aria-label={`Abrir imóvel ${row.original.codigo}`}><ArrowUpRight size={18} /></Link> },
  ], []);
  const name = getUser()?.nome?.split(' ')[0] || 'equipe';
  return <><PageHeader eyebrow="PAINEL DE CONTROLE" title="Visão geral" description="Um olhar completo sobre suas próximas oportunidades." actions={<Link className="btn btn-primary" to="/imoveis/novo" state={{ backgroundLocation: location }}><Plus size={18} />Novo imóvel</Link>} />
    <section className="dashboard-welcome"><div className="welcome-copy"><div className="eyebrow">BEM-VINDO, {name.toUpperCase()}</div><h2>O próximo grande negócio<br />começa com uma <em>boa conexão.</em></h2><p>Seu portfólio, suas parcerias e sua expansão. Tudo em um só lugar.</p><Link to="/oportunidades">Explorar oportunidades <ArrowRight size={16} /></Link></div><img src="/images/brand-architecture.png" alt="Maquete conceitual de arquitetura comercial" /><div className="welcome-caption"><span>PROSPECÇÃO BRASIL</span><small>Conectando marcas e lugares.</small></div></section>
    {error ? <div className="alert error" role="alert">{error}<button className="btn btn-ghost btn-sm" onClick={load}>Tentar novamente</button></div> : !d ? <LoadingState /> : <>
    <div className="cards dashboard-kpis">{[
      { label: 'Imóveis no portfólio', value: d.imoveis, detail: 'Patrimônio em perspectiva', icon: Buildings, to: '/imoveis', color: 'green' },
      { label: 'Imóveis disponíveis', value: d.disponiveis, detail: `${d.imoveis ? Math.round(d.disponiveis / d.imoveis * 100) : 0}% do portfólio disponível`, icon: CheckCircle, to: '/imoveis?status=disponivel', color: 'mint' },
      { label: 'Empresas ativas', value: d.empresas, detail: 'Conexões para expandir', icon: UsersThree, to: '/empresas', color: 'gold' },
      { label: 'Oportunidades', value: d.oportunidades, detail: 'Apresentações registradas', icon: Handshake, to: '/oportunidades', color: 'blue' },
    ].map(({ label, value, detail, icon: Icon, to, color }) => <Link className={`kpi kpi-${color}`} to={to} key={label}><div className="kpi-top"><span>{label}</span><Icon size={21} weight="duotone" /></div><strong className="kpi-number">{String(value).padStart(2, '0')}</strong><div className="kpi-bottom"><span>{detail}</span><ArrowUpRight size={15} /></div></Link>)}</div>
    <div className="dashboard-grid"><section className="panel recent-panel"><div className="panel-head"><div><h2>Últimos imóveis</h2><p>Os pontos mais recentes do seu portfólio.</p></div><Link className="text-link" to="/imoveis">Ver todos <ArrowRight size={15} /></Link></div><DataTable columns={columns} data={d.recentes} search={false} pagination={false} compact emptyTitle="Seu portfólio começa aqui" emptyDescription="Cadastre o primeiro imóvel para acompanhar sua operação." /><div className="panel-note"><MapPin size={14} />Dados atualizados a partir dos seus cadastros.</div></section>
    <aside className="dashboard-side"><section className="panel portfolio-panel"><div className="panel-head"><div><div className="eyebrow">SEU PORTFÓLIO</div><h2>Distribuição dos imóveis</h2></div></div><div className="portfolio-total"><strong>{d.imoveis}</strong><span>imóveis cadastrados</span></div><div className="portfolio-bar" aria-hidden="true">{d.porStatus.filter(s => s._count > 0).map(s => <span className={`bar-${s.status}`} key={s.status} style={{ flex: s._count }} />)}</div><div className="portfolio-legend">{Object.entries(STATUS).map(([status, label]) => { const count = d.porStatus.find(s => s.status === status)?._count || 0; return <Link to={`/imoveis?status=${status}`} key={status}><span><i className={`bar-${status}`} />{label}</span><strong>{count}</strong></Link>; })}</div></section><Link className="dashboard-quick" to="/empresas/nova" state={{ backgroundLocation: location }}><span><UsersThree size={24} weight="duotone" /></span><div><strong>Expanda sua rede</strong><p>Cadastre uma nova empresa.</p></div><ArrowUpRight size={19} /></Link></aside></div></>}
  </>;
}
