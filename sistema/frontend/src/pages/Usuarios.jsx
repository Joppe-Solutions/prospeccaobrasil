import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle, EnvelopeSimple, Plus, ShieldCheck, Trash, UserCircle, UsersThree } from '@phosphor-icons/react';
import { api, getUser } from '../lib/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { Avatar, PageHeader, StatusBadge } from '../components/UI';
import './collections.css';

const EMPTY = { nome: '', email: '', senha: '', role: 'comercial' };
export default function Usuarios() {
  const me = getUser();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [role, setRole] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setList(await api('/usuarios')); } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  async function add(e) {
    e.preventDefault(); setFormError(''); setBusy(true);
    try { await api('/usuarios', { method: 'POST', body: JSON.stringify({ ...form, nome: form.nome.trim(), email: form.email.trim() }) }); setOpen(false); setForm(EMPTY); setNotice('Usuário criado com sucesso.'); await load(); }
    catch (e) { setFormError(e.message); } finally { setBusy(false); }
  }
  async function toggle(user) {
    setUpdating(user.id); setActionError('');
    try { await api(`/usuarios/${user.id}`, { method: 'PUT', body: JSON.stringify({ ativo: !user.ativo }) }); setList(items => items.map(item => item.id === user.id ? { ...item, ativo: !user.ativo } : item)); setNotice(`Acesso de ${user.nome} ${user.ativo ? 'desativado' : 'ativado'}.`); }
    catch (e) { setActionError(e.message); } finally { setUpdating(null); }
  }
  async function remove() {
    setBusy(true); setFormError('');
    try { await api(`/usuarios/${deleting.id}`, { method: 'DELETE' }); setDeleting(null); setNotice('Usuário excluído.'); await load(); }
    catch (e) { setFormError(e.message); } finally { setBusy(false); }
  }
  const filtered = useMemo(() => list.filter(u => !role || u.role === role), [list, role]);
  const columns = [
    { accessorKey: 'nome', header: 'Pessoa', cell: ({ row }) => <div className="collection-identity"><Avatar name={row.original.nome} /><span className="collection-cell-stack"><strong>{row.original.nome} {row.original.id === me?.id && <span className="collection-self">Você</span>}</strong><small>{row.original.criadoEm ? `Na equipe desde ${new Date(row.original.criadoEm).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}` : 'Membro da equipe'}</small></span></div> },
    { accessorKey: 'email', header: 'E-mail', cell: ({ getValue }) => <span className="collection-contact"><EnvelopeSimple size={16} />{getValue()}</span> },
    { accessorKey: 'role', header: 'Perfil de acesso', cell: ({ getValue }) => <span className={`collection-role ${getValue() === 'admin' ? 'is-admin' : ''}`}>{getValue() === 'admin' ? <ShieldCheck size={15} /> : <UserCircle size={15} />}{getValue() === 'admin' ? 'Administrador' : 'Comercial'}</span> },
    { accessorKey: 'ativo', header: 'Status', cell: ({ row, getValue }) => <button className="collection-status-action" disabled={updating === row.original.id} onClick={() => toggle(row.original)} aria-label={`${getValue() ? 'Desativar' : 'Ativar'} acesso de ${row.original.nome}`} title="Clique para alterar o acesso"><StatusBadge status={getValue() ? 'ativo' : 'inativo'} label={getValue() ? 'Ativo' : 'Inativo'} /></button> },
    { id: 'acoes', header: '', enableSorting: false, enableHiding: false, cell: ({ row }) => row.original.id !== me?.id && <button className="icon-button collection-delete" aria-label={`Excluir ${row.original.nome}`} onClick={() => { setFormError(''); setDeleting(row.original); }}><Trash size={18} /></button> },
  ];
  const count = value => loading || error ? '—' : value;
  return <div className="collection-page">
    <PageHeader eyebrow="ADMINISTRAÇÃO" title="Usuários" description="Uma equipe conectada. Cada pessoa com o acesso certo." actions={<button className="btn btn-gold" onClick={() => { setFormError(''); setForm(EMPTY); setOpen(true); }}><Plus size={18} weight="bold" /> Novo usuário</button>} />
    {notice && <div className="alert success" role="status"><CheckCircle size={18} />{notice}<button className="collection-dismiss" onClick={() => setNotice('')} aria-label="Fechar mensagem">×</button></div>}
    {actionError && <div className="alert error" role="alert">{actionError}</div>}
    <div className="collection-stats"><div><span className="collection-stat-icon"><UsersThree size={21} /></span><span><small>Pessoas na equipe</small><strong>{count(list.length)}</strong></span></div><div><span className="collection-stat-icon is-green"><CheckCircle size={21} /></span><span><small>Acessos ativos</small><strong>{count(list.filter(u => u.ativo).length)}</strong></span></div><div><span className="collection-stat-icon is-gold"><ShieldCheck size={21} /></span><span><small>Administradores</small><strong>{count(list.filter(u => u.role === 'admin').length)}</strong></span></div></div>
    <section className="panel collection-panel"><div className="collection-section-head"><div><h2>Equipe Prospecção Brasil</h2><p>Gerencie os acessos ao seu espaço de trabalho.</p></div></div><DataTable columns={columns} data={filtered} loading={loading} error={error} searchPlaceholder="Buscar por nome ou e-mail..." exportName="usuarios.csv" emptyTitle="Nenhum usuário encontrado" emptyDescription="Ajuste a busca ou adicione uma pessoa à equipe." toolbar={<><label className="collection-select"><ShieldCheck size={16} /><select aria-label="Filtrar perfil de acesso" value={role} onChange={e => setRole(e.target.value)}><option value="">Todos os perfis</option><option value="admin">Administradores</option><option value="comercial">Comercial</option></select></label>{error && <button className="btn btn-ghost btn-sm" onClick={load}>Tentar novamente</button>}</>} /></section>
    {open && <Modal title="Adicionar à equipe" description="Crie um acesso para um novo membro da Prospecção Brasil." onClose={() => !busy && setOpen(false)} footer={<><button className="btn btn-ghost" disabled={busy} onClick={() => setOpen(false)}>Cancelar</button><button className="btn btn-primary" type="submit" form="new-user-form" disabled={busy}>{busy ? 'Criando...' : 'Criar usuário'}<ArrowRight size={17} /></button></>}><form id="new-user-form" className="collection-modal-form" onSubmit={add}>{formError && <div className="alert error" role="alert">{formError}</div>}<div className="field"><label htmlFor="user-name">Nome completo <span className="required">*</span></label><input id="user-name" placeholder="Nome e sobrenome" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} autoComplete="name" required /></div><div className="field"><label htmlFor="user-email">E-mail <span className="required">*</span></label><input id="user-email" placeholder="nome@empresa.com.br" type="email" autoComplete="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></div><div className="field"><label htmlFor="user-password">Senha de acesso <span className="required">*</span></label><input id="user-password" placeholder="No mínimo 8 caracteres" type="password" minLength={8} autoComplete="new-password" value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} required /></div><div className="field"><label htmlFor="user-role">Perfil de acesso</label><select id="user-role" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option value="comercial">Comercial</option><option value="admin">Administrador</option></select><small className="collection-field-help">{form.role === 'admin' ? 'Acesso à operação e ao gerenciamento de usuários.' : 'Acesso a imóveis, empresas e oportunidades.'}</small></div></form></Modal>}
    {deleting && <Modal title="Excluir usuário?" description="Esta pessoa perderá o acesso ao sistema." onClose={() => !busy && setDeleting(null)} footer={<><button className="btn btn-ghost" disabled={busy} onClick={() => setDeleting(null)}>Cancelar</button><button className="btn btn-danger" disabled={busy} onClick={remove}>{busy ? 'Excluindo...' : 'Excluir usuário'}</button></>}><div className="collection-modal-form">{formError && <div className="alert error" role="alert">{formError}</div>}<div className="collection-identity"><Avatar name={deleting.nome} /><span className="collection-cell-stack"><strong>{deleting.nome}</strong><small>{deleting.email}</small></span></div></div></Modal>}
  </div>;
}
