import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle, EnvelopeSimple, Handshake, Phone, Plus, Storefront, Trash, UsersThree } from '@phosphor-icons/react';
import { api, registroProfissional, TIPOS_PARCEIRO, UFS } from '../lib/api';
import { mascararDocumento } from '../lib/numeros';
import ParceiroCampos, { validarParceiro } from '../components/ParceiroCampos';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { Avatar, PageHeader, StatusBadge } from '../components/UI';
import './collections.css';

const TIPOS = TIPOS_PARCEIRO;
const EMPTY = { nome: '', tipo: 'consultor', tipoPessoa: 'pf', documento: '', creci: '', creciUf: 'RJ', oab: '', oabUf: 'RJ', responsavel: '', telefone: '', email: '', cidade: '', uf: '', observacoes: '', status: 'ativo' };
const UF_OPCOES = UFS.map(u => <option key={u} value={u}>{u}</option>);

export default function Parceiros() {
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
    try { setList(await api('/parceiros')); } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setForm(EMPTY); setFormError(''); setModal({ type: 'create' });
  }
  function openEdit(p) {
    const tipoPessoa = p.tipoPessoa || 'pf';
    setForm({
      nome: p.nome || '', tipo: p.tipo || 'indicador', tipoPessoa,
      documento: mascararDocumento(p.documento, tipoPessoa === 'pj' ? 'juridica' : 'fisica'), creci: p.creci || '', creciUf: p.creciUf || 'RJ',
      oab: p.oab || '', oabUf: p.oabUf || 'RJ', responsavel: p.responsavel || '', telefone: p.telefone || '',
      email: p.email || '', cidade: p.cidade || '', uf: p.uf || '',
      observacoes: p.observacoes || '', status: p.status || 'ativo',
    });
    setFormError(''); setModal({ type: 'edit', parceiro: p });
  }
  async function save(e) {
    e.preventDefault(); setFormError('');
    const erro = validarParceiro(form);
    if (erro) return setFormError(erro);
    setBusy(true);
    try {
      await api(modal.type === 'create' ? '/parceiros' : `/parceiros/${modal.parceiro.id}`, {
        method: modal.type === 'create' ? 'POST' : 'PUT',
        body: JSON.stringify({ ...form, nome: form.nome.trim() }),
      });
      setNotice(modal.type === 'create' ? 'Parceiro cadastrado.' : 'Parceiro atualizado.');
      setModal(null); await load();
    } catch (e) { setFormError(e.message); } finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setFormError('');
    try {
      await api(`/parceiros/${deleting.id}`, { method: 'DELETE' });
      setDeleting(null); setNotice('Parceiro excluído.'); await load();
    } catch (e) { setFormError(e.message); } finally { setBusy(false); }
  }

  const filtered = useMemo(() => list.filter(p =>
    (!tipo || p.tipo === tipo) && (!status || p.status === status)
  ), [list, tipo, status]);

  const columns = [
    { accessorKey: 'nome', header: 'Parceiro', cell: ({ row }) => (
      <div className="collection-identity">
        <Avatar name={row.original.nome} />
        <span className="collection-cell-stack">
          <strong>{row.original.nome}</strong>
          <small>{[TIPOS[row.original.tipo] || row.original.tipo || 'Sem tipo', row.original.tipoPessoa === 'pj' ? 'Pessoa jurídica' : 'Pessoa física', registroProfissional(row.original)].filter(Boolean).join(' · ')}</small>
        </span>
      </div>
    ) },
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
      title="Consultores"
      description="Corretores e quem traz imóveis para o portfólio."
      actions={<button className="btn btn-gold" onClick={openCreate}><Plus size={18} weight="bold" /> Novo parceiro</button>}
    />
    {notice && <div className="alert success" role="status"><CheckCircle size={18} />{notice}<button className="collection-dismiss" onClick={() => setNotice('')} aria-label="Fechar mensagem">×</button></div>}
    <div className="collection-stats">
      <div><span className="collection-stat-icon"><Handshake size={21} /></span><span><small>Parceiros</small><strong>{count(list.length)}</strong></span></div>
      <div><span className="collection-stat-icon is-green"><UsersThree size={21} /></span><span><small>Ativos</small><strong>{count(list.filter(p => p.status === 'ativo').length)}</strong></span></div>
      <div><span className="collection-stat-icon is-gold"><Storefront size={21} /></span><span><small>Corretores</small><strong>{count(list.filter(p => p.tipo === 'corretor').length)}</strong></span></div>
    </div>
    <section className="panel collection-panel">
      <div className="collection-section-head">
        <div><h2>Rede de parceiros</h2><p>Quem indica e traz oportunidades de imóvel.</p></div>
        <span className="collection-section-symbol"><Handshake size={20} /></span>
      </div>
      <DataTable
        columns={columns} data={filtered} loading={loading} error={error}
        searchPlaceholder="Buscar parceiro, telefone ou cidade..." exportName="parceiros.csv"
        emptyTitle="Nenhum parceiro encontrado" emptyDescription="Cadastre consultores, advogados, corretores, imobiliárias e indicadores."
        toolbar={<>
          <label className="collection-select"><Storefront size={16} /><select aria-label="Filtrar tipo" value={tipo} onChange={e => setTipo(e.target.value)}><option value="">Todos os tipos</option>{Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="collection-select"><CheckCircle size={16} /><select aria-label="Filtrar status" value={status} onChange={e => setStatus(e.target.value)}><option value="">Todos os status</option><option value="ativo">Ativos</option><option value="inativo">Inativos</option></select></label>
          {(tipo || status) && <button className="btn btn-ghost btn-sm" onClick={() => { setTipo(''); setStatus(''); }}>Limpar filtros</button>}
          {error && <button className="btn btn-ghost btn-sm" onClick={load}>Tentar novamente</button>}
        </>}
      />
    </section>

    {modal && <Modal
      title={modal.type === 'create' ? 'Novo parceiro' : 'Editar parceiro'}
      description="Consultor (CPF), advogado (OAB), corretor (CRECI-PF), imobiliária (CRECI-PJ) ou indicador."
      onClose={() => !busy && setModal(null)}
      footer={<><button className="btn btn-ghost" disabled={busy} onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-primary" type="submit" form="parc-form" disabled={busy}>{busy ? 'Salvando...' : modal.type === 'create' ? 'Cadastrar' : 'Salvar alterações'}<ArrowRight size={17} /></button></>}
    >
      <form id="parc-form" className="collection-modal-form" onSubmit={save}>
        {formError && <div className="alert error" role="alert">{formError}</div>}
        <ParceiroCampos form={form} setForm={setForm} />
        {form.tipoPessoa === 'pj' && <div className="field"><label htmlFor="parc-resp">Responsável ou contato <span className="collection-optional">Opcional</span></label><input id="parc-resp" value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} placeholder="Quem responde pela empresa" /></div>}
        <div className="field"><label htmlFor="parc-tel">Telefone</label><input id="parc-tel" value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} /></div>
        <div className="field"><label htmlFor="parc-email">E-mail</label><input id="parc-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
        <div className="field"><label htmlFor="parc-cidade">Cidade</label><input id="parc-cidade" value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} /></div>
        <div className="field"><label htmlFor="parc-uf">UF</label><select id="parc-uf" value={form.uf} onChange={e => setForm({ ...form, uf: e.target.value })}><option value="">—</option>{UF_OPCOES}</select></div>
        <div className="field"><label htmlFor="parc-status">Status</label><select id="parc-status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></div>
        <div className="field"><label htmlFor="parc-obs">Observações <span className="collection-optional">Opcional</span></label><textarea id="parc-obs" rows={3} value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} /></div>
      </form>
    </Modal>}

    {deleting && <Modal title="Excluir parceiro?" description="Imóveis vinculados ficarão sem parceiro cadastrado." onClose={() => !busy && setDeleting(null)} footer={<><button className="btn btn-ghost" disabled={busy} onClick={() => setDeleting(null)}>Cancelar</button><button className="btn btn-danger" disabled={busy} onClick={remove}>{busy ? 'Excluindo...' : 'Excluir'}</button></>}>
      <div className="collection-modal-form">{formError && <div className="alert error" role="alert">{formError}</div>}<div className="collection-identity"><Avatar name={deleting.nome} /><span className="collection-cell-stack"><strong>{deleting.nome}</strong><small>{TIPOS[deleting.tipo] || deleting.tipo}</small></span></div></div>
    </Modal>}
  </div>;
}
