import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle, EnvelopeSimple, Phone, Plus, Target, Trash, UserFocus } from '@phosphor-icons/react';
import { api } from '../lib/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { Avatar, PageHeader, StatusBadge } from '../components/UI';
import './collections.css';

const ORIGENS = { site: 'Site', anuncio: 'Anúncio', indicacao: 'Indicação', outro: 'Outro' };
const STATUS_LEAD = {
  novo: { label: 'Novo', badge: 'disponivel' },
  em_contato: { label: 'Em contato', badge: 'negociacao' },
  qualificado: { label: 'Qualificado', badge: 'proposta' },
  convertido: { label: 'Convertido', badge: 'fechado' },
  perdido: { label: 'Perdido', badge: 'perdido' },
};
const EMPTY = { nome: '', telefone: '', email: '', origem: 'site', interesse: '', status: 'novo', observacoes: '' };

export default function Leads() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [status, setStatus] = useState('');
  const [origem, setOrigem] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setList(await api('/leads')); } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setForm(EMPTY); setFormError(''); setModal({ type: 'create' });
  }
  function openEdit(lead) {
    setForm({
      nome: lead.nome || '', telefone: lead.telefone || '', email: lead.email || '',
      origem: lead.origem || 'site', interesse: lead.interesse || '',
      status: lead.status || 'novo', observacoes: lead.observacoes || '',
    });
    setFormError(''); setModal({ type: 'edit', lead });
  }
  async function save(e) {
    e.preventDefault(); setFormError(''); setBusy(true);
    try {
      const body = { ...form, nome: form.nome.trim() };
      await api(modal.type === 'create' ? '/leads' : `/leads/${modal.lead.id}`, {
        method: modal.type === 'create' ? 'POST' : 'PUT',
        body: JSON.stringify(body),
      });
      setNotice(modal.type === 'create' ? 'Lead cadastrado.' : 'Lead atualizado.');
      setModal(null); await load();
    } catch (e) { setFormError(e.message); } finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setFormError('');
    try {
      await api(`/leads/${deleting.id}`, { method: 'DELETE' });
      setDeleting(null); setNotice('Lead excluído.'); await load();
    } catch (e) { setFormError(e.message); } finally { setBusy(false); }
  }

  const filtered = useMemo(() => list.filter(l =>
    (!status || l.status === status) && (!origem || l.origem === origem)
  ), [list, status, origem]);

  const columns = [
    { accessorKey: 'nome', header: 'Lead', cell: ({ row }) => (
      <div className="collection-identity">
        <Avatar name={row.original.nome} />
        <span className="collection-cell-stack">
          <strong>{row.original.nome}</strong>
          <small>{row.original.interesse || 'Interesse não informado'}</small>
        </span>
      </div>
    ) },
    { id: 'contato', header: 'Contato', accessorFn: l => `${l.telefone || ''} ${l.email || ''}`, cell: ({ row }) => (
      <span className="collection-cell-stack">
        {row.original.telefone ? <span className="collection-contact"><Phone size={16} />{row.original.telefone}</span> : null}
        {row.original.email ? <span className="collection-contact"><EnvelopeSimple size={16} />{row.original.email}</span> : null}
        {!row.original.telefone && !row.original.email ? <span className="muted">Sem contato</span> : null}
      </span>
    ) },
    { accessorKey: 'origem', header: 'Origem', cell: ({ getValue }) => <span className="collection-tag">{ORIGENS[getValue()] || getValue()}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => {
      const s = STATUS_LEAD[getValue()] || { label: getValue(), badge: getValue() };
      return <StatusBadge status={s.badge} label={s.label} />;
    } },
    { accessorKey: 'criadoEm', header: 'Entrada', cell: ({ getValue }) => new Date(getValue()).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) },
    { id: 'acoes', header: '', enableSorting: false, enableHiding: false, cell: ({ row }) => (
      <div className="collection-row-actions">
        <button className="icon-button" aria-label={`Editar ${row.original.nome}`} onClick={() => openEdit(row.original)}><ArrowRight size={18} /></button>
        <button className="icon-button collection-delete" aria-label={`Excluir ${row.original.nome}`} onClick={() => { setFormError(''); setDeleting(row.original); }}><Trash size={18} /></button>
      </div>
    ) },
  ];

  const count = value => loading || error ? '—' : value;

  return <div className="collection-page">
    <PageHeader
      eyebrow="RELACIONAMENTOS"
      title="Leads"
      description="Quem liga do site ou anúncio — acompanhe o primeiro contato."
      actions={<button className="btn btn-gold" onClick={openCreate}><Plus size={18} weight="bold" /> Novo lead</button>}
    />
    {notice && <div className="alert success" role="status"><CheckCircle size={18} />{notice}<button className="collection-dismiss" onClick={() => setNotice('')} aria-label="Fechar mensagem">×</button></div>}
    <div className="collection-stats">
      <div><span className="collection-stat-icon"><UserFocus size={21} /></span><span><small>Leads cadastrados</small><strong>{count(list.length)}</strong></span></div>
      <div><span className="collection-stat-icon is-green"><Target size={21} /></span><span><small>Novos</small><strong>{count(list.filter(l => l.status === 'novo').length)}</strong></span></div>
      <div><span className="collection-stat-icon is-gold"><CheckCircle size={21} /></span><span><small>Convertidos</small><strong>{count(list.filter(l => l.status === 'convertido').length)}</strong></span></div>
    </div>
    <section className="panel collection-panel">
      <div className="collection-section-head">
        <div><h2>Entrada de contatos</h2><p>Origem, interesse e status em um só lugar.</p></div>
        <span className="collection-section-symbol"><Phone size={20} /></span>
      </div>
      <DataTable
        columns={columns} data={filtered} loading={loading} error={error}
        searchPlaceholder="Buscar lead, telefone ou interesse..." exportName="leads.csv"
        emptyTitle="Nenhum lead encontrado" emptyDescription="Cadastre quem ligou do site ou anúncio."
        toolbar={<>
          <label className="collection-select"><Target size={16} /><select aria-label="Filtrar status" value={status} onChange={e => setStatus(e.target.value)}><option value="">Todos os status</option>{Object.entries(STATUS_LEAD).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
          <label className="collection-select"><UserFocus size={16} /><select aria-label="Filtrar origem" value={origem} onChange={e => setOrigem(e.target.value)}><option value="">Todas as origens</option>{Object.entries(ORIGENS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          {(status || origem) && <button className="btn btn-ghost btn-sm" onClick={() => { setStatus(''); setOrigem(''); }}>Limpar filtros</button>}
          {error && <button className="btn btn-ghost btn-sm" onClick={load}>Tentar novamente</button>}
        </>}
      />
    </section>

    {modal && <Modal
      title={modal.type === 'create' ? 'Novo lead' : 'Editar lead'}
      description="Registre quem entrou em contato pelo site ou anúncio."
      onClose={() => !busy && setModal(null)}
      footer={<><button className="btn btn-ghost" disabled={busy} onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-primary" type="submit" form="lead-form" disabled={busy}>{busy ? 'Salvando...' : modal.type === 'create' ? 'Cadastrar lead' : 'Salvar alterações'}<ArrowRight size={17} /></button></>}
    >
      <form id="lead-form" className="collection-modal-form" onSubmit={save}>
        {formError && <div className="alert error" role="alert">{formError}</div>}
        <div className="field"><label htmlFor="lead-nome">Nome <span className="required">*</span></label><input id="lead-nome" required value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo" /></div>
        <div className="field"><label htmlFor="lead-tel">Telefone</label><input id="lead-tel" value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} placeholder="(21) 99999-0000" /></div>
        <div className="field"><label htmlFor="lead-email">E-mail</label><input id="lead-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" /></div>
        <div className="field"><label htmlFor="lead-origem">Origem</label><select id="lead-origem" value={form.origem} onChange={e => setForm({ ...form, origem: e.target.value })}>{Object.entries(ORIGENS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div className="field"><label htmlFor="lead-interesse">Interesse</label><input id="lead-interesse" value={form.interesse} onChange={e => setForm({ ...form, interesse: e.target.value })} placeholder="Ex.: loja em Madureira" /></div>
        <div className="field"><label htmlFor="lead-status">Status</label><select id="lead-status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{Object.entries(STATUS_LEAD).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
        <div className="field"><label htmlFor="lead-obs">Observações <span className="collection-optional">Opcional</span></label><textarea id="lead-obs" rows={3} value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} placeholder="Contexto da ligação..." /></div>
      </form>
    </Modal>}

    {deleting && <Modal title="Excluir lead?" description="Esta ação remove o registro permanentemente." onClose={() => !busy && setDeleting(null)} footer={<><button className="btn btn-ghost" disabled={busy} onClick={() => setDeleting(null)}>Cancelar</button><button className="btn btn-danger" disabled={busy} onClick={remove}>{busy ? 'Excluindo...' : 'Excluir lead'}</button></>}>
      <div className="collection-modal-form">{formError && <div className="alert error" role="alert">{formError}</div>}<div className="collection-identity"><Avatar name={deleting.nome} /><span className="collection-cell-stack"><strong>{deleting.nome}</strong><small>{deleting.telefone || deleting.email || 'Sem contato'}</small></span></div></div>
    </Modal>}
  </div>;
}
