import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Buildings, CaretRight, Currency, Handshake, IdentificationCard,
  List, SignOut, SquaresFour, Storefront, UserCircle, UserFocus, UsersThree, X,
} from '@phosphor-icons/react';
import { getUser, logout } from '../lib/api';
import { Avatar } from './UI';

const NAV = [
  {
    caption: 'PRINCIPAL',
    items: [
      { to: '/', label: 'Visão geral', icon: SquaresFour },
      { to: '/imoveis', label: 'Imóveis', icon: Buildings },
      { to: '/financeiro', label: 'Financeiro', icon: CurrencyDollar },
    ],
  },
  {
    caption: 'RELACIONAMENTOS',
    items: [
      { to: '/empresas', label: 'Empresas', icon: Storefront },
      { to: '/proprietarios', label: 'Proprietários', icon: IdentificationCard },
      { to: '/parceiros', label: 'Parceiros', icon: UsersThree },
      { to: '/leads', label: 'Leads', icon: UserFocus },
    ],
  },
  {
    caption: 'COMERCIAL',
    items: [
      { to: '/oportunidades', label: 'Oportunidades', icon: Handshake },
    ],
  },
];

const ALL_ITEMS = NAV.flatMap(g => g.items);

export default function Layout() {
  const u = getUser();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const close = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [open]);

  const title = location.pathname.startsWith('/perfil') ? 'Meu perfil'
    : location.pathname.startsWith('/usuarios') ? 'Usuários'
    : ALL_ITEMS.find(item => item.to !== '/' && location.pathname.startsWith(item.to))?.label || 'Visão geral';

  const item = ({ to, label, icon: Icon }) => (
    <NavLink key={to} to={to} end={to === '/'}>
      <Icon size={18} weight="duotone" /><span>{label}</span>
    </NavLink>
  );

  return <div className="shell">
    {open && <button className="sidebar-scrim" aria-label="Fechar navegação" onClick={() => setOpen(false)} />}
    <aside className={`sidebar ${open ? 'is-open' : ''}`}>
      <div className="sidebar-brand">
        <Link to="/" aria-label="Prospecção Brasil — início"><img src="/images/logo-wide.png" alt="Prospecção Brasil" /></Link>
        <button className="icon-button mobile-close" aria-label="Fechar navegação" onClick={() => setOpen(false)}><X size={20} /></button>
      </div>
      <div className="workspace-label">
        <span className="workspace-symbol"><Buildings size={16} /></span>
        <div><strong>Espaço de trabalho</strong><span>Gestão & expansão</span></div>
        <span className="workspace-dot" />
      </div>
      <div className="sidebar-scroll">
        <nav aria-label="Navegação principal">
          {NAV.map(group => (
            <div key={group.caption} className="nav-group">
              <span className="nav-caption">{group.caption}</span>
              {group.items.map(navItem => item(navItem))}
            </div>
          ))}
          <span className="nav-caption nav-caption-account">CONTA</span>
          {item({ to: '/perfil', label: 'Perfil', icon: UserCircle })}
          {u?.role === 'admin' && item({ to: '/usuarios', label: 'Usuários', icon: UsersThree })}
        </nav>
      </div>
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <Avatar name={u?.nome} size={34} />
          <Link to="/perfil"><strong>{u?.nome || 'Minha conta'}</strong><span>{u?.role === 'admin' ? 'Administrador' : 'Equipe comercial'}</span></Link>
          <button className="icon-button" onClick={logout} aria-label="Sair da conta" title="Sair da conta"><SignOut size={18} /></button>
        </div>
      </div>
    </aside>
    <div className="workspace-main">
      <header className="topbar">
        <div className="topbar-path">
          <button className="icon-button mobile-menu" aria-label="Abrir navegação" aria-expanded={open} onClick={() => setOpen(true)}><List size={22} /></button>
          <span>Workspace</span><CaretRight size={12} /><strong>{title}</strong>
        </div>
        <div className="topbar-right">
          <span className="workspace-date">{new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}</span>
          <span className="topbar-divider" />
          <Link className="profile-shortcut" to="/perfil" aria-label="Abrir meu perfil"><Avatar name={u?.nome} size={32} /></Link>
        </div>
      </header>
      <main className="main" id="main-content"><Outlet /></main>
      <footer className="workspace-footer"><span>© {new Date().getFullYear()} Prospecção Brasil</span><span>Inteligência para conectar bons negócios.</span></footer>
    </div>
  </div>;
}
