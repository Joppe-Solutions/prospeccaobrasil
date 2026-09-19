import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Buildings, CheckCircle, EnvelopeSimple, IdentificationCard, Phone, Plus, Trash, User, UsersThree } from '@phosphor-icons/react';
import { api } from '../lib/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { Avatar, PageHeader, StatusBadge } from '../components/UI';
import './collections.css';

const TIPOS = { pf: 'Pessoa física', pj: 'Pessoa jurídica' };
const EMPTY = { tipoPessoa: 'pf', nome: '', documento: '', telefone: '', email: '', cidade: '', uf: '', observacoes: '', status: 'ativo' };

export default function Proprietarios() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [tipo, setTipo] = useState('');
  const [status, setStatus] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setList(await api('/proprietarios')); } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setForm(EMPTY); setFormError(''); setModal({ type: 'create' });
  }
  function openEdit(p) {
    setForm({
      tipoPessoa: p.tipoPessoa || 'pf', nome: p.nome || '', documento: p.documento || '',
      telefone: p.telefone || '', email: p.email || '', cidade: p.cidade || '', uf: p.uf || '',
      observacoes: p.observacoes || '', status: p.status || 'ativo',
    });
    setFormError(''); setModal({ type: 'edit', proprietario: p });
  }
  async function save(e) {
    e.preventDefault(); setFormError(''); setBusy(true);
    try {
      await api(modal.type === 'create' ? '/proprietarios' : `/proprietarios/${modal.proprietario.id}`, {
        method: modal.type === 'create' ? 'POST' : 'PUT',
        body: JSON.stringify({ ...form, nome: form.nome.trim() }),
      });
      setNotice(modal.type === 'create' ? 'Proprietário cadastrado.' : 'Proprietário atualizado.');
      setModal(null); await load();
    } catch (e) { setFormError(e.message); } finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setFormError('');
    try {
      await api(`/proprietarios/${deleting.id}`, { method: 'DELETE' });
      setDeleting(null); setNotice('Proprietário excluído.'); await load();
    } catch (e) { setFormError(e.message); } finally { setBusy(false); }
  }

  const filtered = useMemo(() => list.filter(p =>
    (!tipo || p.tipoPessoa === tipo) && (!status || p.status === status)
  ), [list, tipo, status]);

  const columns = [
    { accessorKey: 'nome', header: 'Proprietário', cell: ({ row }) => (
      <div className="collection-identity">
        <Avatar name={row.original.nome} />
        <span className="collection-cell-stack">
          <strong>{row.original.nome}</strong>
          <small>{TIPOS[row.original.tipoPessoa] || row.original.tipoPessoa}</small>
        </span>
      </div>
    ) },
    { accessorKey: 'documento', header: 'Documento', cell: ({ getValue }) => getValue() ? <span className="collection-contact"><IdentificationCard size={16} />{getValue()}</span> : <span className="muted">—</span> },
    { id: 'contato', header: 'Contato', accessorFn: p => `${p.telefone || ''} ${p.email || ''}`, cell: ({ row }) => (
      <span className="collection-cell-stack">
        {row.original.telefone ? <span className="collection-contact"><Phone size={16} />{row.original.telefone}</span> : null}
        {row.original.email ? <span className="collection-contact"><EnvelopeSimple size={16} />{row.original.email}</span> : null}
        {!row.original.telefone && !row.original.email ? <span className="muted">Sem contato</span> : null}
      </span>
    ) },
    { id: 'cidade', header: 'Cidade', accessorFn: p => `${p.cidade || ''} ${p.uf || ''}`, cell: ({ row }) => row.original.cidade ? <span className="collection-cell-stack"><span>{row.original.cidade}</span><small>{row.original.uf || ''}</small></span> : '—' },
    { id: 'imoveis', header: 'Imóveis', accessorFn: p => p._count?.imoveis || 0, cell: ({ getValue }) => <span className="collection-nowrap">{getValue()}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue()} label={getValue() === 'ativo' ? 'Ativo' : 'Inativo'} /> },
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
      title="Proprietários"
      description="Pessoas físicas e jurídicas donas dos imóveis do portfólio."
      actions={<button className="btn btn-gold" onClick={openCreate}><Plus size={18} weight="bold" /> Novo proprietário</button>}
    />
    {notice && <div className="alert success" role="status"><CheckCircle size={18} />{notice}<button className="collection-dismiss" onClick={() => setNotice('')} aria-label="Fechar mensagem">×</button></div>}
    <div className="collection-stats">
      <div><span className="collection-stat-icon"><UsersThree size={21} /></span><span><small>Proprietários</small><strong>{count(list.length)}</strong></span></div>
      <div><span className="collection-stat-icon is-green"><User size={21} /></span><span><small>Pessoa física</small><strong>{count(list.filter(p => p.tipoPessoa === 'pf').length)}</strong></span></div>
      <div><span className="collection-stat-icon is-gold"><Buildings size={21} /></span><span><small>Pessoa jurídica</small><strong>{count(list.filter(p => p.tipoPessoa === 'pj').length)}</strong></span></div>
    </div>
    <section className="panel collection-panel">
      <div className="collection-section-head">
        <div><h2>Cadastro de proprietários</h2><p>Vincule imóveis aos donos corretos.</p></div>
        <span className="collection-section-symbol"><IdentificationCard size={20} /></span>
      </div>
      <DataTable
        columns={columns} data={filtered} loading={loading} error={error}
        searchPlaceholder="Buscar nome, documento ou cidade..." exportName="proprietarios.csv"
        emptyTitle="Nenhum proprietário encontrado" emptyDescription="Cadastre PF ou PJ donos dos imóveis."
        toolbar={<>
          <label className="collection-select"><User size={16} /><select aria-label="Filtrar tipo" value={tipo} onChange={e => setTipo(e.target.value)}><option value="">PF e PJ</option><option value="pf">Pessoa física</option><option value="pj">Pessoa jurídica</option></select></label>
          <label className="collection-select"><CheckCircle size={16} /><select aria-label="Filtrar status" value={status} onChange={e => setStatus(e.target.value)}><option value="">Todos os status</option><option value="ativo">Ativos</option><option value="inativo">Inativos</option></select></label>
          {(tipo || status) && <button className="btn btn-ghost btn-sm" onClick={() => { setTipo(''); setStatus(''); }}>Limpar filtros</button>}
          {error && <button className="btn btn-ghost btn-sm" onClick={load}>Tentar novamente</button>}
        </>}
      />
    </section>

    {modal && <Modal
      title={modal.type === 'create' ? 'Novo proprietário' : 'Editar proprietário'}
      description="Cadastre o dono do imóvel (pessoa física ou jurídica)."
      onClose={() => !busy && setModal(null)}
      footer={<><button className="btn btn-ghost" disabled={busy} onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-primary" type="submit" form="prop-form" disabled={busy}>{busy ? 'Salvando...' : modal.type === 'create' ? 'Cadastrar' : 'Salvar alterações'}<ArrowRight size={17} /></button></>}
    >
      <form id="prop-form" className="collection-modal-form" onSubmit={save}>
        {formError && <div className="alert error" role="alert">{formError}</div>}
        <div className="field"><label htmlFor="prop-tipo">Tipo de pessoa</label><select id="prop-tipo" value={form.tipoPessoa} onChange={e => setForm({ ...form, tipoPessoa: e.target.value })}><option value="pf">Pessoa física</option><option value="pj">Pessoa jurídica</option></select></div>
        <div className="field"><label htmlFor="prop-nome">Nome <span className="required">*</span></label><input id="prop-nome" required value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder={form.tipoPessoa === 'pj' ? 'Razão social' : 'Nome completo'} /></div>
        <div className="field"><label htmlFor="prop-doc">{form.tipoPessoa === 'pj' ? 'CNPJ' : 'CPF'}</label><input id="prop-doc" value={form.documento} onChange={e => setForm({ ...form, documento: e.target.value })} /></div>
        <div className="field"><label htmlFor="prop-tel">Telefone</label><input id="prop-tel" value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} /></div>
        <div className="field"><label htmlFor="prop-email">E-mail</label><input id="prop-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
        <div className="field"><label htmlFor="prop-cidade">Cidade</label><input id="prop-cidade" value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} /></div>
        <div className="field"><label htmlFor="prop-uf">UF</label><input id="prop-uf" maxLength={2} value={form.uf} onChange={e => setForm({ ...form, uf: e.target.value.toUpperCase() })} /></div>
        <div className="field"><label htmlFor="prop-status">Status</label><select id="prop-status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></div>
        <div className="field"><label htmlFor="prop-obs">Observações <span className="collection-optional">Opcional</span></label><textarea id="prop-obs" rows={3} value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} /></div>
      </form>
    </Modal>}

    {deleting && <Modal title="Excluir proprietário?" description="Imóveis vinculados ficarão sem proprietário cadastrado." onClose={() => !busy && setDeleting(null)} footer={<><button className="btn btn-ghost" disabled={busy} onClick={() => setDeleting(null)}>Cancelar</button><button className="btn btn-danger" disabled={busy} onClick={remove}>{busy ? 'Excluindo...' : 'Excluir'}</button></>}>
      <div className="collection-modal-form">{formError && <div className="alert error" role="alert">{formError}</div>}<div className="collection-identity"><Avatar name={deleting.nome} /><span className="collection-cell-stack"><strong>{deleting.nome}</strong><small>{TIPOS[deleting.tipoPessoa]}</small></span></div></div>
    </Modal>}
  </div>;
}
