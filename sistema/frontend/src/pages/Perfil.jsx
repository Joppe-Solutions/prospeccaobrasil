import { useState } from 'react';
import { ArrowRight, CheckCircle, EnvelopeSimple, Key, LockKey, ShieldCheck, UserCircle } from '@phosphor-icons/react';
import { api, getUser } from '../lib/api';
import Modal from '../components/Modal';
import { Avatar, PageHeader } from '../components/UI';
import './collections.css';

export default function Perfil() {
  const user = getUser();
  const [open, setOpen] = useState(false);
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [nova2, setNova2] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setErr(''); setMsg('');
    if (nova.length < 8) return setErr('A nova senha precisa de pelo menos 8 caracteres.');
    if (nova !== nova2) return setErr('As senhas não coincidem.');
    setBusy(true);
    try { await api('/auth/trocar-senha', { method: 'POST', body: JSON.stringify({ atual, nova }) }); setMsg('Sua senha foi alterada com sucesso.'); setAtual(''); setNova(''); setNova2(''); setOpen(false); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  return <div className="collection-page profile-page">
    <PageHeader eyebrow="SUA CONTA" title="Meu perfil" description="Seu espaço na Prospecção Brasil. Cuide dos seus dados e do seu acesso." />
    {msg && <div className="alert success" role="status"><CheckCircle size={18} />{msg}</div>}
    <div className="profile-layout">
      <aside className="profile-identity-card"><div className="profile-monogram">PB</div><div className="profile-avatar"><Avatar name={user?.nome || 'Usuário'} size={76} /></div><span className="profile-brand-label">PROSPECÇÃO BRASIL</span><h2>{user?.nome}</h2><p>{user?.email}</p><span className="profile-role"><ShieldCheck size={16} />{user?.role === 'admin' ? 'Administrador' : 'Comercial'}</span><div className="profile-identity-footer"><span />Seu espaço de trabalho</div></aside>
      <div className="profile-content">
        <section className="panel profile-section"><div className="profile-section-title"><span className="collection-stat-icon"><UserCircle size={23} /></span><div><h2>Informações pessoais</h2><p>Os dados vinculados à sua conta.</p></div></div><dl className="profile-details"><div><dt>Nome completo</dt><dd>{user?.nome || 'Não informado'}</dd></div><div><dt>E-mail profissional</dt><dd><EnvelopeSimple size={17} />{user?.email || 'Não informado'}</dd></div><div><dt>Perfil de acesso</dt><dd>{user?.role === 'admin' ? 'Administrador' : 'Comercial'}</dd></div><div><dt>Organização</dt><dd>Prospecção Brasil</dd></div></dl></section>
        <section className="panel profile-section"><div className="profile-section-title"><span className="collection-stat-icon is-gold"><LockKey size={23} /></span><div><h2>Segurança da conta</h2><p>Mantenha seu acesso protegido.</p></div></div><div className="profile-security-row"><div><h3>Senha de acesso</h3><p>Use uma senha exclusiva com pelo menos 8 caracteres.</p></div><button className="btn btn-ghost" onClick={() => { setErr(''); setOpen(true); }}><Key size={18} /> Alterar senha<ArrowRight size={16} /></button></div></section>
      </div>
    </div>
    {open && <Modal title="Alterar senha" description="Escolha uma senha segura para proteger a sua conta." onClose={() => !busy && setOpen(false)} footer={<><button className="btn btn-ghost" disabled={busy} onClick={() => setOpen(false)}>Cancelar</button><button className="btn btn-primary" form="password-form" type="submit" disabled={busy}>{busy ? 'Salvando...' : 'Atualizar senha'}<ArrowRight size={17} /></button></>}><form id="password-form" className="collection-modal-form" onSubmit={submit}>{err && <div className="alert error" role="alert">{err}</div>}<div className="field"><label htmlFor="current-password">Senha atual</label><input id="current-password" type="password" placeholder="Digite sua senha atual" autoComplete="current-password" value={atual} onChange={e => setAtual(e.target.value)} required /></div><div className="field"><label htmlFor="new-password">Nova senha</label><input id="new-password" type="password" placeholder="No mínimo 8 caracteres" minLength={8} autoComplete="new-password" value={nova} onChange={e => setNova(e.target.value)} required /></div><div className="field"><label htmlFor="confirm-password">Confirme a nova senha</label><input id="confirm-password" type="password" placeholder="Digite a nova senha novamente" minLength={8} autoComplete="new-password" value={nova2} onChange={e => setNova2(e.target.value)} required /></div><div className="collection-form-note"><ShieldCheck size={21} /><span>Combine letras, números e símbolos para criar uma senha mais forte.</span></div></form></Modal>}
  </div>;
}
