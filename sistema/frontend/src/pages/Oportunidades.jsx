import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Handshake, PencilSimple, Plus, Trash, WarningCircle } from '@phosphor-icons/react';
import { api } from '../lib/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { PageHeader } from '../components/UI';
import './collections.css';

const ETAPAS = { apresentado: 'Apresentado', visita: 'Visita', proposta: 'Proposta', negociacao: 'Negociação', fechado: 'Fechado', perdido: 'Perdido' };
const EMPTY = { imovelId: '', empresaId: '', etapa: 'apresentado', observacao: '' };

export default function Oportunidades() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [stage, setStage] = useState('');
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
    setForm(EMPTY); setFormError(''); setModal({ type: 'create' }); setOptionsLoading(true);
    try { const [imoveis, empresas] = await Promise.all([api('/imoveis'), api('/empresas')]); setOptions({ imoveis, empresas }); }
    catch (e) { setFormError(e.message); }
    finally { setOptionsLoading(false); }
  }
  function openEdit(o) {
    setForm({ imovelId: o.imovelId, empresaId: o.empresaId, etapa: o.etapa, observacao: o.observacao || '' });
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
  const filtered = useMemo(() => list.filter(o => !stage || o.etapa === stage), [list, stage]);
  const columns = [
    { id: 'imovel', header: 'Imóvel', accessorFn: o => `${o.imovel?.codigo || ''} ${o.imovel?.endereco || ''} ${o.imovel?.bairro || ''}`, cell: ({ row }) => <Link className="collection-cell-stack collection-title-link" to={`/imoveis/${row.original.imovelId}`}><span className="collection-code">{row.original.imovel?.codigo}</span><strong>{row.original.imovel?.endereco || 'Imóvel indisponível'}</strong><small>{row.original.imovel?.bairro}</small></Link> },
    { id: 'empresa', header: 'Empresa', accessorFn: o => `${o.empresa?.nome || ''} ${o.empresa?.segmento || ''}`, cell: ({ row }) => <span className="collection-cell-stack"><strong>{row.original.empresa?.nome || 'Empresa indisponível'}</strong><small>{row.original.empresa?.segmento || 'Sem segmento'}</small></span> },
    { accessorKey: 'etapa', header: 'Etapa', cell: ({ row, getValue }) => <select className={`collection-stage-select stage-${getValue()}`} value={getValue()} disabled={moving === row.original.id} aria-label={`Etapa de ${row.original.imovel?.codigo} para ${row.original.empresa?.nome}`} onChange={e => move(row.original, e.target.value)}>{Object.entries(ETAPAS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select> },
    { accessorKey: 'observacao', header: 'Observações', cell: ({ getValue }) => <span className="collection-regions" title={getValue() || ''}>{getValue() || '—'}</span> },
    { accessorKey: 'atualizadoEm', header: 'Última atualização', cell: ({ getValue }) => new Date(getValue()).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) },
    { id: 'acoes', header: '', enableSorting: false, enableHiding: false, cell: ({ row }) => <div className="collection-row-actions"><button className="icon-button" aria-label={`Editar oportunidade de ${row.original.empresa?.nome}`} onClick={() => openEdit(row.original)}><PencilSimple size={18} /></button><button className="icon-button collection-delete" aria-label={`Excluir oportunidade de ${row.original.empresa?.nome}`} onClick={() => { setFormError(''); setDeleting(row.original); }}><Trash size={18} /></button></div> },
  ];
  return <div className="collection-page">
    <PageHeader eyebrow="INTELIGÊNCIA COMERCIAL" title="Oportunidades" description="Transforme conexões em negócios. Acompanhe cada próximo passo." actions={<button className="btn btn-gold" onClick={openCreate}><Plus size={18} weight="bold" /> Nova oportunidade</button>} />
    {notice && <div className="alert success" role="status"><CheckCircle size={18} />{notice}<button className="collection-dismiss" onClick={() => setNotice('')} aria-label="Fechar mensagem">×</button></div>}
    <div className="opportunity-pipeline">{Object.entries(ETAPAS).map(([value, label], idx) => <button key={value} className={`pipeline-step stage-${value} ${stage === value ? 'is-selected' : ''}`} onClick={() => setStage(s => s === value ? '' : value)} aria-pressed={stage === value}><span className="pipeline-step-label"><i />{label}</span><strong>{loading || error ? '—' : list.filter(o => o.etapa === value).length}</strong>{idx < 5 && <ArrowRight className="pipeline-arrow" size={16} />}</button>)}</div>
    <section className="panel collection-panel"><div className="collection-section-head"><div><h2>{stage ? `Oportunidades · ${ETAPAS[stage]}` : 'Todas as oportunidades'}</h2><p>Atualize as etapas e mantenha a negociação em movimento.</p></div><span className="collection-section-symbol"><Handshake size={22} /></span></div>
      <DataTable columns={columns} data={filtered} loading={loading} error={error} searchPlaceholder="Buscar imóvel, empresa ou observação..." exportName="oportunidades.csv" emptyTitle="O próximo negócio começa aqui" emptyDescription="Crie uma oportunidade conectando um imóvel a uma empresa." toolbar={<>{stage && <button className="btn btn-ghost btn-sm" onClick={() => setStage('')}>Ver todas as etapas</button>}{error && <button className="btn btn-ghost btn-sm" onClick={load}>Tentar novamente</button>}</>} />
    </section>
    {modal && <Modal title={modal.type === 'create' ? 'Nova oportunidade' : 'Editar oportunidade'} description="Conecte a demanda de uma empresa ao imóvel ideal." onClose={() => !busy && setModal(null)} footer={<><button className="btn btn-ghost" disabled={busy} onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-primary" type="submit" form="opportunity-form" disabled={busy || optionsLoading || (modal.type === 'create' && (!options.imoveis.length || !options.empresas.length))}>{busy ? 'Salvando...' : modal.type === 'create' ? 'Criar oportunidade' : 'Salvar alterações'}<ArrowRight size={17} /></button></>}>
      <form id="opportunity-form" className="collection-modal-form" onSubmit={save}>
        {formError && <div className="alert error" role="alert">{formError}</div>}
        {modal.type === 'create' ? <><div className="field"><label htmlFor="op-imovel">Imóvel <span className="required">*</span></label><select id="op-imovel" required disabled={optionsLoading} value={form.imovelId} onChange={e => setForm({ ...form, imovelId: e.target.value })}><option value="">{optionsLoading ? 'Carregando imóveis...' : 'Selecione o imóvel'}</option>{options.imoveis.map(i => <option key={i.id} value={i.id}>{i.codigo} · {i.endereco}{i.numero ? `, ${i.numero}` : ''}</option>)}</select></div><div className="field"><label htmlFor="op-empresa">Empresa <span className="required">*</span></label><select id="op-empresa" required disabled={optionsLoading} value={form.empresaId} onChange={e => setForm({ ...form, empresaId: e.target.value })}><option value="">{optionsLoading ? 'Carregando empresas...' : 'Selecione a empresa'}</option>{options.empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}</select></div>{!optionsLoading && (!options.imoveis.length || !options.empresas.length) && <div className="collection-form-note"><WarningCircle size={19} /><span>Cadastre ao menos um imóvel e uma empresa para criar uma oportunidade.</span></div>}</> : <div className="collection-form-summary"><Handshake size={24} /><span><strong>{modal.oportunidade.empresa?.nome}</strong><small>{modal.oportunidade.imovel?.codigo} · {modal.oportunidade.imovel?.endereco}</small></span></div>}
        <div className="field"><label htmlFor="op-etapa">Etapa da negociação</label><select id="op-etapa" value={form.etapa} onChange={e => setForm({ ...form, etapa: e.target.value })}>{Object.entries(ETAPAS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div className="field"><label htmlFor="op-obs">Observações <span className="collection-optional">Opcional</span></label><textarea id="op-obs" rows={4} placeholder="Registre o contexto e os próximos passos da negociação..." value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} /></div>
      </form>
    </Modal>}
    {deleting && <Modal title="Excluir oportunidade?" description="Esta ação remove o registro desta negociação." onClose={() => !busy && setDeleting(null)} footer={<><button className="btn btn-ghost" disabled={busy} onClick={() => setDeleting(null)}>Cancelar</button><button className="btn btn-danger" disabled={busy} onClick={remove}>{busy ? 'Excluindo...' : 'Excluir oportunidade'}</button></>}><div className="collection-modal-form">{formError && <div className="alert error" role="alert">{formError}</div>}<p>Oportunidade de <strong>{deleting.empresa?.nome}</strong> para o imóvel <strong>{deleting.imovel?.codigo}</strong>.</p></div></Modal>}
  </div>;
}
