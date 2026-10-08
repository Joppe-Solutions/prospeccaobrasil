import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, PencilSimple, Plus, Trash } from '@phosphor-icons/react';
import { api, getUser, useArquivoToken } from '../lib/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { PageHeader, StatusBadge } from '../components/UI';
import './collections.css';
import '../components/wizard.css';

const STATUS = { rascunho: 'Rascunho', enviada: 'Enviada', aceita: 'Aceita', recusada: 'Recusada' };
const BADGE = { rascunho: 'inativo', enviada: 'negociacao', aceita: 'disponivel', recusada: 'perdido' };
const dataBR = (iso) => (iso ? iso.split('-').reverse().join('/') : '—');

// O formulário segue as seções do documento oficial; cada campo preenche um espaço do modelo.
// [chave, rótulo, exemplo, largura total]
const SECOES = [
  ['Abrangência e prazo', 'Seção 06 do documento', [
    ['areaAtuacao', 'Área de atuação', 'Ex.: Região Metropolitana do Rio de Janeiro', true],
    ['quantidadeUnidades', 'Quantidade inicial de unidades', 'Ex.: 5 unidades'],
    ['prazoAtuacao', 'Prazo de atuação', 'Ex.: 12 meses'],
  ]],
  ['Condições comerciais', 'Seção 07 do documento', [
    ['contratante', 'Contratante e responsável pelo pagamento', 'Ex.: Franqueadora', true],
    ['honorariosProspeccao', 'Honorários de planejamento e prospecção', 'Ex.: R$ 10.000,00 por unidade', true],
    ['remuneracaoIntermediacao', 'Remuneração pela intermediação', 'Ex.: 1 aluguel na assinatura da locação', true],
    ['formaPagamento', 'Forma e vencimento dos pagamentos', 'Ex.: 50% no aceite e 50% em 30 dias', true],
    ['exclusividade', 'Exclusividade', 'Ex.: Exclusiva na área de atuação durante o prazo'],
    ['validade', 'Validade da proposta', 'Ex.: 30 dias'],
  ]],
];
const CAMPOS_DOCUMENTO = ['marca', ...SECOES.flatMap(([, , campos]) => campos.map(([k]) => k))];

export default function Propostas() {
  const isAdmin = getUser()?.role === 'admin';
  const [search] = useSearchParams();
  const demandaFiltro = search.get('demandaId');
  const [list, setList] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [demandas, setDemandas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const arquivoToken = useArquivoToken();

  const load = useCallback(async () => {
    const [p, e, d] = await Promise.all([api('/propostas'), api('/empresas'), api('/demandas')]);
    setList(p); setClientes(e); setDemandas(d);
  }, []);
  useEffect(() => { load().catch(e => setError(e.message)).finally(() => setLoading(false)); }, [load]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const abrir = (proposta) => { setFormError(''); setForm(Object.fromEntries(Object.entries(proposta).map(([k, v]) => [k, v ?? '']))); };
  function nova() {
    const demanda = demandas.find(d => String(d.id) === demandaFiltro);
    setFormError('');
    setForm({ status: 'rascunho', empresaId: demanda?.empresaId || '', demandaId: demanda?.id || '', marca: demanda?.empresa?.nome || '' });
  }

  async function save(e) {
    e.preventDefault(); setBusy(true); setFormError('');
    try {
      await api(form.id ? `/propostas/${form.id}` : '/propostas', { method: form.id ? 'PUT' : 'POST', body: JSON.stringify(form) });
      setForm(null); await load();
    } catch (err) { setFormError(err.message); } finally { setBusy(false); }
  }
  async function remove(p) {
    if (!window.confirm(`Excluir a proposta ${p.numero}?`)) return;
    try { await api(`/propostas/${p.id}`, { method: 'DELETE' }); await load(); } catch (err) { setError(err.message); }
  }

  const pendentes = (p) => CAMPOS_DOCUMENTO.filter(k => !p[k]).length;
  const columns = [
    { accessorKey: 'numero', header: 'Proposta', cell: ({ row: { original: p } }) => <button type="button" className="collection-cell-stack collection-title-link" style={{ border: 0, background: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }} onClick={() => abrir(p)}><strong>{p.numero}</strong><small>{dataBR(p.data)}</small></button> },
    { id: 'cliente', header: 'Cliente / marca', accessorFn: p => `${p.empresa.nome} ${p.marca || ''}`, cell: ({ row: { original: p } }) => <span className="collection-cell-stack"><strong>{p.empresa.nome}</strong><small>{p.marca || 'Marca não informada'}</small></span> },
    { id: 'demanda', header: 'Demanda', accessorFn: p => p.demanda?.titulo || '', cell: ({ getValue }) => getValue() || <span className="muted">—</span> },
    { id: 'preenchimento', header: 'Documento', accessorFn: pendentes, cell: ({ getValue }) => getValue() ? <span className="muted">{getValue()} {getValue() === 1 ? 'campo' : 'campos'} a preencher</span> : 'Completo' },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={BADGE[getValue()]} label={STATUS[getValue()]} /> },
    { id: 'acoes', header: '', enableSorting: false, enableHiding: false, cell: ({ row: { original: p } }) => <div className="collection-row-actions">
      <a className="btn btn-ghost btn-sm" href={`/proposta/${p.id}?token=${arquivoToken}`} target="_blank" rel="noopener noreferrer"><FileText size={15} /> Gerar documento</a>
      <button type="button" className="icon-button" aria-label={`Editar proposta ${p.numero}`} onClick={() => abrir(p)}><PencilSimple size={16} /></button>
      {isAdmin && <button type="button" className="icon-button collection-delete" aria-label={`Excluir proposta ${p.numero}`} onClick={() => remove(p)}><Trash size={16} /></button>}
    </div> },
  ];

  const demandasDoCliente = demandas.filter(d => String(d.empresaId) === String(form?.empresaId));
  const campo = ([k, label, exemplo, full]) => <div key={k} className={`wz-field ${full ? 'wz-full' : ''}`}><label htmlFor={`pc-${k}`}>{label}</label><input id={`pc-${k}`} value={form[k] ?? ''} onChange={set(k)} placeholder={exemplo} maxLength={300} /></div>;

  return <div className="collection-page">
    <PageHeader eyebrow="INSTITUCIONAL" title="Propostas Comerciais" description="Assessoria Estratégica de Expansão Imobiliária: preencha os campos e gere a proposta no modelo oficial."
      actions={<button className="btn btn-gold" disabled={loading || !!error} onClick={nova}><Plus size={18} weight="bold" /> Nova proposta</button>} />
    <section className="panel collection-panel">
      <div className="collection-section-head">
        <div><h2>Propostas</h2><p>O documento sai idêntico ao modelo; campos em branco aparecem destacados entre colchetes.</p></div>
        <span className="collection-section-symbol"><FileText size={22} /></span>
      </div>
      <DataTable columns={columns} data={list.filter(p => !demandaFiltro || String(p.demandaId) === demandaFiltro)} loading={loading} error={error}
        searchPlaceholder="Buscar número, cliente ou marca..." emptyTitle="Nenhuma proposta comercial" emptyDescription="Clique em “Nova proposta” para preparar a primeira." exportName="propostas.csv" />
    </section>
    {form && <Modal wide title={form.id ? `Proposta ${form.numero}` : 'Nova proposta comercial'} description="Os campos abaixo preenchem os espaços do modelo de proposta."
      onClose={() => !busy && setForm(null)}
      footer={<><button className="btn btn-ghost" disabled={busy} onClick={() => setForm(null)}>Cancelar</button><button className="btn btn-primary" form="proposta-form" type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar proposta'}</button></>}>
      <form id="proposta-form" className="collection-modal-form" onSubmit={save}>
        {formError && <div className="alert error" role="alert">{formError}</div>}
        <fieldset className="wz-fieldset"><legend className="proposta-legend">Identificação <small>Capa e mensagem da proposta</small></legend>
          <div className="wz-grid">
            <div className="wz-field"><label htmlFor="pc-empresaId">Cliente (empresa)<span className="wz-required">*</span></label>
              <select id="pc-empresaId" required value={form.empresaId} onChange={e => setForm(f => ({ ...f, empresaId: e.target.value, demandaId: '' }))}><option value="">Selecione</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
            <div className="wz-field"><label htmlFor="pc-marca">Marca</label><input id="pc-marca" value={form.marca ?? ''} onChange={set('marca')} placeholder="Nome da marca" maxLength={300} /></div>
            <div className="wz-field"><label htmlFor="pc-numero">Nº da proposta</label><input id="pc-numero" value={form.numero ?? ''} onChange={set('numero')} placeholder="Gerado ao salvar (PC-AAAA-NNN)" required={!!form.id} maxLength={40} /></div>
            <div className="wz-field"><label htmlFor="pc-data">Data da proposta</label><input id="pc-data" type="date" value={form.data ?? ''} onChange={set('data')} /></div>
            <div className="wz-field"><label htmlFor="pc-demandaId">Demanda vinculada (opcional)</label>
              <select id="pc-demandaId" value={form.demandaId ?? ''} onChange={set('demandaId')} disabled={!demandasDoCliente.length}><option value="">{form.empresaId && !demandasDoCliente.length ? 'Cliente sem demandas' : 'Sem demanda vinculada'}</option>{demandasDoCliente.map(d => <option key={d.id} value={d.id}>{d.titulo}</option>)}</select></div>
            <div className="wz-field"><label htmlFor="pc-status">Status</label><select id="pc-status" value={form.status} onChange={set('status')}>{Object.entries(STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          </div>
        </fieldset>
        {SECOES.map(([titulo, onde, campos]) => <fieldset className="wz-fieldset" key={titulo}><legend className="proposta-legend">{titulo} <small>{onde}</small></legend><div className="wz-grid">{campos.map(campo)}</div></fieldset>)}
        <fieldset className="wz-fieldset"><legend className="proposta-legend">Observações internas <small>Não aparecem no documento</small></legend>
          <div className="wz-field"><textarea id="pc-observacoes" aria-label="Observações internas" value={form.observacoes ?? ''} onChange={set('observacoes')} /></div>
        </fieldset>
      </form>
    </Modal>}
  </div>;
}
