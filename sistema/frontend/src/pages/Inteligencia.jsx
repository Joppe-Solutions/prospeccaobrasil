import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowsClockwise, Brain, CheckCircle, FileText, MapPin, Sparkle, UsersThree, Warning } from '@phosphor-icons/react';
import { api, useArquivoToken } from '../lib/api';
import DataTable from '../components/DataTable';
import { PageHeader } from '../components/UI';
import './collections.css';
import './business.css';

const fmtData = (v) => v ? new Date(v).toLocaleDateString('pt-BR') : '—';
const CONTEUDO = [
  [UsersThree, 'Bairro', 'População, domicílios, faixa etária e renda do Censo 2022, comparados ao município.'],
  [MapPin, 'Rua e entorno', 'Comércio, serviços e transporte a 500 m e 1 km, tipo da via e geradores de fluxo mais próximos.'],
  [Sparkle, 'Triagem do ponto', 'Pontos fortes, pontos de atenção e segmentos sugeridos a partir do cadastro do imóvel.'],
];

// Um relatório por imóvel: a lista parte do portfólio e mostra o que já foi gerado.
export default function Inteligencia() {
  const [imoveis, setImoveis] = useState([]);
  const [analises, setAnalises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gerando, setGerando] = useState(null);
  const [filtro, setFiltro] = useState('');
  const arquivoToken = useArquivoToken();

  const load = useCallback(async () => {
    setError('');
    try {
      const [i, a] = await Promise.all([api('/imoveis'), api('/inteligencia')]);
      setImoveis(i); setAnalises(a);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function gerar(imovel) {
    setGerando(imovel.id); setError('');
    try { await api(`/imoveis/${imovel.id}/analise`, { method: 'POST' }); await load(); }
    catch (e) { setError(e.message); } finally { setGerando(null); }
  }

  // /inteligencia vem da mais recente para a mais antiga: a primeira de cada imóvel é a atual
  const linhas = useMemo(() => {
    const atual = new Map();
    for (const a of analises) if (a.imovel && !atual.has(a.imovel.id)) atual.set(a.imovel.id, a);
    return imoveis.map(i => ({ ...i, analise: atual.get(i.id) || null }));
  }, [imoveis, analises]);
  const comRelatorio = linhas.filter(l => l.analise).length;
  const visiveis = linhas.filter(l => !filtro || (filtro === 'com' ? l.analise : !l.analise));

  const columns = useMemo(() => [
    { id: 'imovel', header: 'Imóvel', accessorFn: i => `${i.codigo} ${i.titulo || ''} ${i.endereco} ${i.bairro || ''} ${i.cidade}`, cell: ({ row: { original: i } }) => (
      <Link className="collection-cell-stack collection-title-link" to={`/imoveis/${i.id}`}>
        <span className="collection-code">{i.codigo}</span>
        <strong>{i.titulo || `${i.endereco}${i.numero ? `, ${i.numero}` : ''}`}</strong>
        <small>{[i.bairro, i.cidade, i.uf].filter(Boolean).join(' · ')}</small>
      </Link>
    ) },
    { id: 'bairro', header: 'Bairro', accessorFn: i => i.bairro || '', cell: ({ getValue }) => getValue() || <span className="muted" title="Sem bairro, o relatório traz só os dados do município"><Warning size={14} /> Não informado</span> },
    { id: 'relatorio', header: 'Relatório', accessorFn: i => i.analise?.criadoEm || '', cell: ({ row: { original: i } }) => i.analise
      ? <span className="collection-cell-stack"><span><CheckCircle size={14} color="#398156" weight="fill" /> Gerado em {fmtData(i.analise.criadoEm)}</span></span>
      : <span className="muted">Ainda não gerado</span> },
    { id: 'score', header: 'Triagem', accessorFn: i => i.analise?.score ?? -1, cell: ({ getValue }) => getValue() < 0 ? <span className="muted">—</span> : <strong title="Score de triagem do cadastro (0 a 100)">{getValue()}</strong> },
    { id: 'acoes', header: '', enableSorting: false, enableHiding: false, cell: ({ row: { original: i } }) => (
      <div className="collection-row-actions">
        {i.analise && <a className="btn btn-ghost btn-sm" href={`/inteligencia/${i.analise.id}?token=${arquivoToken}`} target="_blank" rel="noopener noreferrer"><FileText size={15} /> Abrir relatório</a>}
        <button type="button" className={`btn btn-sm ${i.analise ? 'btn-ghost' : 'btn-gold'}`} disabled={gerando !== null} onClick={() => gerar(i)} aria-label={`${i.analise ? 'Atualizar' : 'Gerar'} relatório do imóvel ${i.codigo}`}>
          {i.analise ? <ArrowsClockwise size={15} /> : <Brain size={15} />} {gerando === i.id ? 'Gerando…' : i.analise ? 'Atualizar' : 'Gerar relatório'}
        </button>
      </div>
    ) },
  ], [arquivoToken, gerando]);

  const count = v => loading ? '—' : v;
  return <div className="collection-page">
    <PageHeader eyebrow="CONHECIMENTO" title="Inteligência de Mercado" description="Um relatório por imóvel, com o perfil do bairro, o entorno da rua e a triagem do ponto." />
    <div className="collection-stats">
      <div><span className="collection-stat-icon"><Brain size={21} /></span><span><small>Imóveis no portfólio</small><strong>{count(linhas.length)}</strong></span></div>
      <div><span className="collection-stat-icon is-green"><CheckCircle size={21} /></span><span><small>Com relatório</small><strong>{count(comRelatorio)}</strong></span></div>
      <div><span className="collection-stat-icon is-gold"><Warning size={21} /></span><span><small>Sem relatório</small><strong>{count(linhas.length - comRelatorio)}</strong></span></div>
    </div>
    <section className="panel business-panel">
      <h2>O que o relatório traz</h2>
      <div className="business-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>{CONTEUDO.map(([Icon, titulo, texto]) => <article className="business-panel" key={titulo}><h2><Icon size={18} /> {titulo}</h2><p>{texto}</p></article>)}</div>
      <p>Fontes: IBGE (Censo 2022 e estimativas de população) e OpenStreetMap. A triagem do ponto é uma leitura automática do cadastro e não substitui estudo de mercado. Valores de aluguel de referência ficam em <Link to="/benchmark">Benchmark</Link>.</p>
    </section>
    <section className="panel collection-panel">
      <div className="collection-section-head">
        <div><h2>Relatórios por imóvel</h2><p>Gere, atualize ou abra o documento de cada ponto.</p></div>
        <div className="collection-tabs" aria-label="Filtrar por relatório">{[['', 'Todos'], ['com', 'Com relatório'], ['sem', 'Sem relatório']].map(([v, l]) => <button key={v || 'todos'} className={filtro === v ? 'is-active' : ''} aria-pressed={filtro === v} onClick={() => setFiltro(v)}>{l}</button>)}</div>
      </div>
      <DataTable columns={columns} data={visiveis} loading={loading} error={error} searchPlaceholder="Buscar imóvel, bairro ou cidade..." exportName="inteligencia.csv"
        emptyTitle="Nenhum imóvel encontrado" emptyDescription="Cadastre um imóvel para gerar o relatório de inteligência."
        toolbar={error && <button className="btn btn-ghost btn-sm" onClick={load}>Tentar novamente</button>} />
    </section>
  </div>;
}
