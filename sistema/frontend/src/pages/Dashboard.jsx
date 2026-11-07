import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Brain, Buildings, Camera, CheckCircle, Handshake, MapPin, Plus, UsersThree } from '@phosphor-icons/react';
import { api, fmtMoney, getUser, STATUS } from '../lib/api';
import DataTable from '../components/DataTable';
import { PageHeader, StatusBadge, LoadingState, EmptyState } from '../components/UI';

const ETAPAS = { apresentado: 'Apresentado', visita: 'Visita', proposta: 'Proposta', negociacao: 'Negociação' };
const PROPOSTA = { em_elaboracao: 'proposta em elaboração', enviada: 'proposta enviada', em_analise: 'proposta em análise', contraproposta: 'contraproposta' };
const endereco = i => `${i.endereco}${i.numero ? `, ${i.numero}` : ''}`;
const diasParado = iso => Math.floor((Date.now() - new Date(iso)) / 86400000);

export default function Dashboard() {
  const [d, setD] = useState(null); const [error, setError] = useState(''); const location = useLocation();
  const load = () => { setError(''); api('/dashboard').then(setD).catch(e => setError(e.message)); };
  useEffect(load, []);
  const columns = useMemo(() => [
    { id: 'imovel', header: 'Imóvel', accessorFn: i => `${i.codigo} ${i.endereco} ${i.bairro}`, cell: ({ row: { original: i } }) => <div className="property-cell"><span className="property-thumbnail">{i.fotos?.[0] ? <img src={`/uploads/${i.fotos[0].arquivo}`} alt="" /> : <Buildings size={23} weight="duotone" />}</span><div><Link to={`/imoveis/${i.id}`}>{endereco(i)}</Link><span>{i.codigo}<i />{i.bairro || i.cidade}</span></div></div> },
    { id: 'valor', header: 'Valor', accessorFn: i => i.tipo === 'venda' ? Number(i.precoVenda) : [i.aluguel, i.condominio, i.iptu].reduce((a,b) => a + (Number(b) || 0), 0), cell: ({ getValue, row }) => <div className="value-cell"><strong>{fmtMoney(getValue())}</strong><span>{row.original.tipo === 'venda' ? 'Venda' : 'Custo mensal'}</span></div> },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue()} /> },
    { id: 'actions', header: '', enableHiding: false, cell: ({ row }) => <Link className="row-link" to={`/imoveis/${row.original.id}`} aria-label={`Abrir imóvel ${row.original.codigo}`}><ArrowUpRight size={18} /></Link> },
  ], []);
  const name = getUser()?.nome?.split(' ')[0] || 'equipe';
  const pendencias = d ? [
    { icon: Camera, titulo: 'Disponíveis sem foto', texto: 'A apresentação sai sem imagem.', itens: d.pendencias.semFoto },
    { icon: Brain, titulo: 'Disponíveis sem análise de mercado', texto: 'O relatório de inteligência ainda não foi gerado.', itens: d.pendencias.semAnalise },
  ].filter(p => p.itens.length) : [];

  return <><PageHeader eyebrow="Painel de controle" title={`Bem-vindo, ${name}`} description="O que pede atenção hoje e como está o portfólio." actions={<Link className="btn btn-primary" to="/imoveis/novo" state={{ backgroundLocation: location }}><Plus size={18} />Novo imóvel</Link>} />
    {error ? <div className="alert error" role="alert">{error}<button className="btn btn-ghost btn-sm" onClick={load}>Tentar novamente</button></div> : !d ? <LoadingState /> : <>
    <div className="cards dashboard-kpis">{[
      { label: 'Imóveis no portfólio', value: d.imoveis, detail: 'Patrimônio em perspectiva', icon: Buildings, to: '/imoveis', color: 'green' },
      { label: 'Imóveis disponíveis', value: d.disponiveis, detail: `${d.imoveis ? Math.round(d.disponiveis / d.imoveis * 100) : 0}% do portfólio disponível`, icon: CheckCircle, to: '/imoveis?status=disponivel', color: 'mint' },
      { label: 'Empresas ativas', value: d.empresas, detail: 'Conexões para expandir', icon: UsersThree, to: '/empresas', color: 'gold' },
      { label: 'Oportunidades', value: d.oportunidades, detail: 'Apresentações registradas', icon: Handshake, to: '/oportunidades', color: 'blue' },
    ].map(({ label, value, detail, icon: Icon, to, color }) => <Link className={`kpi kpi-${color}`} to={to} key={label}><div className="kpi-top"><span>{label}</span><Icon size={21} weight="duotone" /></div><strong className="kpi-number">{String(value).padStart(2, '0')}</strong><div className="kpi-bottom"><span>{detail}</span><ArrowUpRight size={15} /></div></Link>)}</div>

    <div className="dashboard-grid">
      <div className="dashboard-side">
        <section className="panel">
          <div className="panel-head"><div><h2>Ações em andamento</h2><p>Negociações abertas, as paradas há mais tempo primeiro.</p></div><Link className="text-link" to="/oportunidades">Ver todas <ArrowRight size={15} /></Link></div>
          {d.acoesAbertas.length ? <ul className="agenda-list">{d.acoesAbertas.map(o => {
            const dias = diasParado(o.atualizadoEm);
            return <li key={o.id}>
              <span className="agenda-main"><strong>{o.empresa.nome}</strong><small>{o.imovel.codigo} · {endereco(o.imovel)}</small></span>
              <span className="agenda-meta">
                <StatusBadge status={o.etapa} label={ETAPAS[o.etapa] || o.etapa} />
                <small>{o.proximaAcao ? `Próximo passo: ${o.proximaAcao}` : PROPOSTA[o.propostaStatus] || (dias === 0 ? 'Atualizada hoje' : `Sem movimento há ${dias} ${dias === 1 ? 'dia' : 'dias'}`)}</small>
              </span>
              <Link className="row-link" to={`/oportunidades?empresaId=${o.empresa.id}`} aria-label={`Abrir ações com ${o.empresa.nome}`}><ArrowUpRight size={18} /></Link>
            </li>;
          })}</ul> : <EmptyState icon={Handshake} title="Nenhuma negociação aberta" description="Apresente um imóvel a um cliente para começar." />}
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Pendências do portfólio</h2><p>O que falta para os imóveis disponíveis serem apresentados completos.</p></div></div>
          {pendencias.length ? pendencias.map(({ icon: Icon, titulo, texto, itens }) => <div className="pending-group" key={titulo}>
            <div className="pending-head"><span className="collection-stat-icon"><Icon size={18} /></span><div><strong>{titulo}</strong><small>{texto}</small></div><span className="pending-count">{itens.length}</span></div>
            <ul className="pending-list">{itens.map(i => <li key={i.id}><Link to={`/imoveis/${i.id}`}><span className="collection-code">{i.codigo}</span>{endereco(i)}</Link><small>{i.bairro}</small></li>)}</ul>
          </div>) : <EmptyState icon={CheckCircle} title="Tudo em dia" description="Todos os imóveis disponíveis têm foto e análise de mercado." />}
        </section>
      </div>
      <aside className="dashboard-side">
        <section className="panel recent-panel"><div className="panel-head"><div><h2>Últimos imóveis</h2><p>Os pontos mais recentes do portfólio.</p></div><Link className="text-link" to="/imoveis">Ver todos <ArrowRight size={15} /></Link></div><DataTable exportName="dashboard-imoveis.csv" columns={columns} data={d.recentes} search={false} pagination={false} compact columnVisibility={false} emptyTitle="Seu portfólio começa aqui" emptyDescription="Cadastre o primeiro imóvel para acompanhar sua operação." /><div className="panel-note"><MapPin size={14} />Dados atualizados a partir dos seus cadastros.</div></section>
        <section className="panel portfolio-panel"><div className="panel-head"><div><div className="eyebrow">Seu portfólio</div><h2>Distribuição dos imóveis</h2></div></div><div className="portfolio-total"><strong>{d.imoveis}</strong><span>imóveis cadastrados</span></div><div className="portfolio-bar" aria-hidden="true">{d.porStatus.filter(s => s._count > 0).map(s => <span className={`bar-${s.status}`} key={s.status} style={{ flex: s._count }} />)}</div><div className="portfolio-legend">{Object.entries(STATUS).map(([status, label]) => { const count = d.porStatus.find(s => s.status === status)?._count || 0; return <Link to={`/imoveis?status=${status}`} key={status}><span><i className={`bar-${status}`} />{label}</span><strong>{count}</strong></Link>; })}</div></section>
        <Link className="dashboard-quick" to="/empresas/nova" state={{ backgroundLocation: location }}><span><UsersThree size={24} weight="duotone" /></span><div><strong>Expanda sua rede</strong><p>Cadastre uma nova empresa.</p></div><ArrowUpRight size={19} /></Link>
      </aside>
    </div></>}
  </>;
}
