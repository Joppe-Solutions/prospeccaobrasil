import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle, Handshake, MapPin, PencilSimple, Plus, Presentation, Trash, WarningCircle } from '@phosphor-icons/react';
import { api, fmtMoney } from '../lib/api';
import { DinheiroInput } from '../components/NumberFields';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { PageHeader } from '../components/UI';
import './collections.css';

const ETAPAS = { apresentado: 'Apresentado', visita: 'Visita', proposta: 'Proposta', negociacao: 'Negociação', fechado: 'Fechado', perdido: 'Perdido' };
const MODALIDADES = { expansao_redes: 'Expansão de redes', locacao_direta: 'Locação direta', passagem_ponto: 'Passagem de ponto comercial', venda_ativo: 'Ativos à venda' };
const PROPOSTA = { sem_proposta: 'Sem proposta', em_elaboracao: 'Em elaboração', enviada: 'Enviada', em_analise: 'Em análise pelo cliente', contraproposta: 'Contraproposta', aceita: 'Aceita', recusada: 'Recusada' };
const PROPOSTA_FIELDS = { propostaStatus: 'sem_proposta', propostaValor: '', propostaEnviadaEm: '', propostaRetornoEm: '', propostaObservacao: '' };
const fmtData = v => v ? new Date(`${v}T12:00:00`).toLocaleDateString('pt-BR') : '';
const EMPTY = { ...PROPOSTA_FIELDS, finalidade: '', proximaAcao: '', proximaAcaoEm: '', imovelId: '', empresaId: '', etapa: 'apresentado', modalidade: '', observacao: '' };

export default function Oportunidades() {
  const [search, setSearch] = useSearchParams();
  const [modality, setModality] = useState('');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [stage, setStage] = useState('');
  const [propostaFiltro, setPropostaFiltro] = useState('');
  const [bairro, setBairro] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [options, setOptions] = useState({ imoveis: [], empresas: [] });
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [moving, setMoving] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setList(await api('/oportunidades')); } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function openCreate() {
    setForm({ ...EMPTY, empresaId: search.get('empresaId') || '' }); setFormError(''); setModal({ type: 'create' }); setOptionsLoading(true);
    try { const [imoveis, empresas] = await Promise.all([api('/imoveis'), api('/empresas')]); setOptions({ imoveis, empresas }); }
    catch (e) { setFormError(e.message); }
    finally { setOptionsLoading(false); }
  }
  async function openEdit(o) {
    setForm({ ...Object.fromEntries(Object.keys(PROPOSTA_FIELDS).map(k => [k, o[k] ?? PROPOSTA_FIELDS[k]])), finalidade: o.finalidade || '', proximaAcao: o.proximaAcao || '', proximaAcaoEm: o.proximaAcaoEm || '', imovelId: o.imovelId, empresaId: o.empresaId, etapa: o.etapa, modalidade: o.modalidade || '', observacao: o.observacao || '' });
    setFormError(''); setModal({ type: 'edit', oportunidade: o });
  }
  async function save(e) {
    e.preventDefault(); setFormError(''); setBusy(true);
    try {
      await api(modal.type === 'create' ? '/oportunidades' : `/oportunidades/${modal.oportunidade.id}`, { method: modal.type === 'create' ? 'POST' : 'PUT', body: JSON.stringify(form) });
      setNotice(modal.type === 'create' ? 'Oportunidade criada com sucesso.' : 'Oportunidade atualizada.'); setModal(null); await load();
    } catch (e) { setFormError(e.message); } finally { setBusy(false); }
  }
  async function move(o, etapa) {
    setMoving(o.id); setError(''); setNotice('');
    try { const updated = await api(`/oportunidades/${o.id}`, { method: 'PUT', body: JSON.stringify({ etapa }) }); setList(items => items.map(item => item.id === o.id ? updated : item)); }
    catch (e) { setError(e.message); } finally { setMoving(null); }
  }
  async function remove() {
    setBusy(true); setFormError('');
    try { await api(`/oportunidades/${deleting.id}`, { method: 'DELETE' }); setDeleting(null); setNotice('Oportunidade excluída.'); await load(); }
    catch (e) { setFormError(e.message); } finally { setBusy(false); }
  }

  const bairros = useMemo(() => [...new Set(list.map(o => o.imovel?.bairro).filter(Boolean))].sort(), [list]);
  const filtered = useMemo(() => list.filter(o =>
    (!stage || o.etapa === stage) && (!propostaFiltro || (o.propostaStatus || 'sem_proposta') === propostaFiltro) && (!bairro || o.imovel?.bairro === bairro) && (!modality || o.modalidade === modality) && (!search.get('empresaId') || String(o.empresaId) === search.get('empresaId'))
  ), [list, stage, propostaFiltro, bairro, modality, search]);

  const columns = [
    { id: 'imovel', header: 'Imóvel', accessorFn: o => `${o.imovel?.codigo || ''} ${o.imovel?.endereco || ''} ${o.imovel?.bairro || ''}`, cell: ({ row }) => <Link className="collection-cell-stack collection-title-link" to={`/imoveis/${row.original.imovelId}`}><span className="collection-code">{row.original.imovel?.codigo}</span><strong>{row.original.imovel?.endereco || 'Imóvel indisponível'}</strong><small>{row.original.imovel?.bairro}</small></Link> },
    { id: 'empresa', header: 'Empresa / Contato', accessorFn: o => `${o.empresa?.nome || ''} ${o.empresa?.segmento || ''} ${o.empresa?.contatoNome || ''}`, cell: ({ row }) => {
      const e = row.original.empresa;
      const contato = [e?.contatoNome, e?.telefone || e?.email].filter(Boolean).join(' · ');
      return <span className="collection-cell-stack"><strong>{e?.nome || 'Empresa indisponível'}</strong><small>{e?.segmento || 'Sem segmento'}</small>{contato ? <small>{contato}</small> : <small className="muted">Sem contato</small>}</span>;
    } },
    { accessorKey: 'modalidade', header: 'Modalidade', cell: ({ getValue }) => MODALIDADES[getValue()] || 'Não definida' },
    { id: 'proposta', header: 'Proposta', accessorFn: o => PROPOSTA[o.propostaStatus] || 'Sem proposta', cell: ({ row: { original: o } }) => {
      const st = o.propostaStatus || 'sem_proposta';
      const linha = [o.propostaEnviadaEm && `enviada ${fmtData(o.propostaEnviadaEm)}`, o.propostaValor != null && fmtMoney(o.propostaValor), o.propostaRetornoEm && `retorno ${fmtData(o.propostaRetornoEm)}`].filter(Boolean).join(' · ');
      return <span className="collection-cell-stack"><span className={`proposta-badge proposta-${st}`}>{PROPOSTA[st]}</span>{linha && <small title={o.propostaObservacao || ''}>{linha}</small>}</span>;
    } },
    { accessorKey: 'proximaAcao', header: 'Próxima ação', cell: ({ row }) => <span className="collection-cell-stack"><span>{row.original.proximaAcao || '—'}</span><small>{row.original.proximaAcaoEm}</small></span> },
    { accessorKey: 'etapa', header: 'Etapa', cell: ({ row, getValue }) => <select className={`collection-stage-select stage-${getValue()}`} value={getValue()} disabled={moving === row.original.id} aria-label={`Etapa de ${row.original.imovel?.codigo} para ${row.original.empresa?.nome}`} onChange={e => move(row.original, e.target.value)}>{Object.entries(ETAPAS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select> },
    { id: 'apresentacao', header: 'Link', enableSorting: false, cell: ({ row }) => <a className="collection-title-link" href={`/apresentacao/${row.original.imovelId}`} target="_blank" rel="noreferrer" aria-label={`Abrir apresentação de ${row.original.imovel?.codigo}`}><Presentation size={18} /> Abrir</a> },
    { accessorKey: 'observacao', header: 'Observações', cell: ({ getValue }) => <span className="collection-regions" title={getValue() || ''}>{getValue() || '—'}</span> },
    { accessorKey: 'atualizadoEm', header: 'Última atualização', cell: ({ getValue }) => new Date(getValue()).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) },
    { id: 'acoes', header: '', enableSorting: false, enableHiding: false, cell: ({ row }) => <div className="collection-row-actions"><button className="icon-button" aria-label={`Editar oportunidade de ${row.original.empresa?.nome}`} onClick={() => openEdit(row.original)}><PencilSimple size={18} /></button><button className="icon-button collection-delete" aria-label={`Excluir oportunidade de ${row.original.empresa?.nome}`} onClick={() => { setFormError(''); setDeleting(row.original); }}><Trash size={18} /></button></div> },
  ];
  return <div className="collection-page">
    <PageHeader eyebrow="RELACIONAMENTO COMERCIAL" title="Ações das operações" description="Expansão de redes, locação direta, passagem de ponto e ativos à venda — do início à conclusão." actions={<button className="btn btn-gold" onClick={openCreate}><Plus size={18} weight="bold" /> Novo relacionamento</button>} />
    {notice && <div className="alert success" role="status"><CheckCircle size={18} />{notice}<button className="collection-dismiss" onClick={() => setNotice('')} aria-label="Fechar mensagem">×</button></div>}
    <div className="opportunity-pipeline">{Object.entries(ETAPAS).map(([value, label], idx) => <button key={value} className={`pipeline-step stage-${value} ${stage === value ? 'is-selected' : ''}`} onClick={() => setStage(s => s === value ? '' : value)} aria-pressed={stage === value}><span className="pipeline-step-label"><i />{label}</span><strong>{loading || error ? '—' : list.filter(o => o.etapa === value).length}</strong>{idx < 5 && <ArrowRight className="pipeline-arrow" size={16} />}</button>)}</div>
    <section className="panel collection-panel"><div className="collection-section-head"><div><h2>{stage ? `Oportunidades · ${ETAPAS[stage]}` : 'Todas as oportunidades'}</h2><p>Atualize as etapas e mantenha a negociação em movimento.</p></div><span className="collection-section-symbol"><Handshake size={22} /></span></div>
      <DataTable columns={columns} data={filtered} loading={loading} error={error} searchPlaceholder="Buscar imóvel, empresa ou observação..." exportName="oportunidades.csv" emptyTitle="O próximo negócio começa aqui" emptyDescription="Crie uma oportunidade conectando um imóvel a uma empresa." toolbar={<>
        <label className="collection-select"><MapPin size={16} /><select aria-label="Filtrar por bairro" value={bairro} onChange={e => setBairro(e.target.value)}><option value="">Todos os bairros</option>{bairros.map(b => <option key={b} value={b}>{b}</option>)}</select></label>
        <select aria-label="Filtrar proposta" value={propostaFiltro} onChange={e => setPropostaFiltro(e.target.value)}><option value="">Todas as propostas</option>{Object.entries(PROPOSTA).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <select aria-label="Filtrar modalidade" value={modality} onChange={e => setModality(e.target.value)}><option value="">Todas as modalidades</option>{Object.entries(MODALIDADES).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select>
        {search.get('empresaId') && <button className="btn btn-ghost btn-sm" onClick={() => setSearch({})}>Cliente: {list.find(o => String(o.empresaId) === search.get('empresaId'))?.empresa?.nome || 'selecionado'} ×</button>}
        {(stage || propostaFiltro || bairro || modality) && <button className="btn btn-ghost btn-sm" onClick={() => { setStage(''); setPropostaFiltro(''); setBairro(''); setModality(''); }}>Limpar filtros</button>}
        {error && <button className="btn btn-ghost btn-sm" onClick={load}>Tentar novamente</button>}
      </>} />
    </section>
    {modal && <Modal title={modal.type === 'create' ? 'Nova oportunidade' : 'Editar oportunidade'} description="Conecte um cliente ao imóvel que atende às premissas dele." onClose={() => !busy && setModal(null)} footer={<><button className="btn btn-ghost" disabled={busy} onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-primary" type="submit" form="opportunity-form" disabled={busy || optionsLoading || (modal.type === 'create' && (!options.imoveis.length || !options.empresas.length))}>{busy ? 'Salvando...' : modal.type === 'create' ? 'Criar oportunidade' : 'Salvar alterações'}<ArrowRight size={17} /></button></>}>
      <form id="opportunity-form" className="collection-modal-form" onSubmit={save}>
        {formError && <div className="alert error" role="alert">{formError}</div>}
        {modal.type === 'create' ? <><div className="field"><label htmlFor="op-imovel">Imóvel <span className="required" aria-hidden="true">*</span></label><select id="op-imovel" required disabled={optionsLoading} value={form.imovelId} onChange={e => setForm({ ...form, imovelId: e.target.value })}><option value="">{optionsLoading ? 'Carregando imóveis...' : 'Selecione o imóvel'}</option>{options.imoveis.map(i => <option key={i.id} value={i.id}>{i.codigo} · {i.endereco}{i.numero ? `, ${i.numero}` : ''}</option>)}</select></div><div className="field"><label htmlFor="op-empresa">Empresa <span className="required" aria-hidden="true">*</span></label><select id="op-empresa" required disabled={optionsLoading} value={form.empresaId} onChange={e => setForm({ ...form, empresaId: e.target.value })}><option value="">{optionsLoading ? 'Carregando empresas...' : 'Selecione a empresa'}</option>{options.empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}</select></div>{!optionsLoading && (!options.imoveis.length || !options.empresas.length) && <div className="collection-form-note"><WarningCircle size={19} /><span>Cadastre ao menos um imóvel e uma empresa para criar uma oportunidade.</span></div>}</> : <div className="collection-form-summary"><Handshake size={24} /><span><strong>{modal.oportunidade.empresa?.nome}</strong><small>{modal.oportunidade.imovel?.codigo} · {modal.oportunidade.imovel?.endereco}</small></span></div>}
        <div className="field"><label htmlFor="op-finalidade">Finalidade</label><select id="op-finalidade" value={form.finalidade} onChange={e => setForm({ ...form, finalidade: e.target.value })}><option value="">Não definida</option><option value="expansao_redes">Expansão de redes</option><option value="ocupacao">Ocupação direta</option><option value="investimento">Investimento</option><option value="outro">Outro</option></select></div>
        <div className="field"><label htmlFor="op-acao">Próxima ação</label><input id="op-acao" value={form.proximaAcao} onChange={e => setForm({ ...form, proximaAcao: e.target.value })}/></div>
        <div className="field"><label htmlFor="op-data">Data da próxima ação</label><input id="op-data" type="date" value={form.proximaAcaoEm} onChange={e => setForm({ ...form, proximaAcaoEm: e.target.value })}/></div>
        <div className="field"><label htmlFor="op-modalidade">Modalidade</label><select id="op-modalidade" value={form.modalidade} onChange={e => setForm({ ...form, modalidade: e.target.value })}><option value="">Não definida</option>{Object.entries(MODALIDADES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div className="field"><label htmlFor="op-etapa">Etapa da negociação</label><select id="op-etapa" value={form.etapa} onChange={e => setForm({ ...form, etapa: e.target.value })}>{Object.entries(ETAPAS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <fieldset className="proposta-fieldset"><legend>Proposta</legend>
          <div className="field"><label htmlFor="op-prop-status">Situação da proposta</label><select id="op-prop-status" value={form.propostaStatus} onChange={e => setForm({ ...form, propostaStatus: e.target.value })}>{Object.entries(PROPOSTA).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select><small className="muted">Ao marcar como enviada, a data de envio é preenchida e a etapa passa para Proposta.</small></div>
          <div className="field"><label htmlFor="op-prop-valor">Valor proposto (R$)</label><DinheiroInput id="op-prop-valor" value={form.propostaValor ?? ''} onChange={v => setForm(f => ({ ...f, propostaValor: v }))} /></div>
          <div className="field"><label htmlFor="op-prop-enviada">Enviada em</label><input id="op-prop-enviada" type="date" value={form.propostaEnviadaEm || ''} onChange={e => setForm({ ...form, propostaEnviadaEm: e.target.value })} /></div>
          <div className="field"><label htmlFor="op-prop-retorno">Retorno previsto</label><input id="op-prop-retorno" type="date" value={form.propostaRetornoEm || ''} onChange={e => setForm({ ...form, propostaRetornoEm: e.target.value })} /></div>
          <div className="field"><label htmlFor="op-prop-obs">Observações da proposta</label><textarea id="op-prop-obs" rows={2} value={form.propostaObservacao || ''} onChange={e => setForm({ ...form, propostaObservacao: e.target.value })} placeholder="Condições, contraproposta, pendências..." /></div>
        </fieldset>
        <div className="field"><label htmlFor="op-obs">Observações <span className="collection-optional">Opcional</span></label><textarea id="op-obs" rows={4} placeholder="Registre o contexto e os próximos passos da negociação..." value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} /></div>
      </form>
    </Modal>}
    {deleting && <Modal title="Excluir oportunidade?" description="Esta ação remove o registro desta negociação." onClose={() => !busy && setDeleting(null)} footer={<><button className="btn btn-ghost" disabled={busy} onClick={() => setDeleting(null)}>Cancelar</button><button className="btn btn-danger" disabled={busy} onClick={remove}>{busy ? 'Excluindo...' : 'Excluir oportunidade'}</button></>}><div className="collection-modal-form">{formError && <div className="alert error" role="alert">{formError}</div>}<p>Oportunidade de <strong>{deleting.empresa?.nome}</strong> para o imóvel <strong>{deleting.imovel?.codigo}</strong>.</p></div></Modal>}
  </div>;
}
