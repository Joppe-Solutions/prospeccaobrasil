import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { getUser, logout } from '../lib/api';
import { grupoAtivo, MENU, subitemAtivo } from '../lib/menu';
import Snackbar from './Snackbar';
import '../tourflow/shell/Sidebar.css';
import '../tourflow/shell/AppTopbar.css';

const CHAVE_RECOLHIDA = 'pb_menu_recolhido';
const lerRecolhida = () => { try { return localStorage.getItem(CHAVE_RECOLHIDA) === '1'; } catch { return false; } };

export default function Layout() {
  const u = getUser();
  const { pathname } = useLocation();
  const permitido = i => !i.admin || u?.role === 'admin';
  const [recolhida, setRecolhida] = useState(lerRecolhida);
  const [aberto, setAberto] = useState(false);
  const [grupos, setGrupos] = useState({});
  useEffect(() => { setAberto(false); setGrupos(atual => ({ ...atual, ...Object.fromEntries(MENU.filter(i => i.tipo === 'grupo').map(i => [i.rotulo, grupoAtivo(i, pathname)])) })); }, [pathname]);
  useEffect(() => {
    if (!aberto) return undefined;
    const fechar = e => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('keydown', fechar);
    return () => document.removeEventListener('keydown', fechar);
  }, [aberto]);
  function alternarRecolhida() {
    setRecolhida(!recolhida);
    try { localStorage.setItem(CHAVE_RECOLHIDA, recolhida ? '0' : '1'); } catch { /* preferência só desta sessão */ }
  }
  const partes = (u?.nome || 'Minha conta').trim().split(/\s+/);
  const iniciais = (partes.length > 1 ? partes[0][0] + partes[partes.length - 1][0] : partes[0].slice(0, 2)).toUpperCase();

  return <div className={`app-shell app-shell--com-topbar ${recolhida ? 'app-shell--recolhida' : ''}`}>
    <a className="skip-link" href="#main-content">Ir para o conteúdo</a>
    <header className={`app-topbar ${recolhida ? 'app-topbar--recolhida' : ''}`}>
      <div className="app-topbar__esquerda">
        <button type="button" className="app-topbar__menu" onClick={() => setAberto(!aberto)} aria-label="Abrir navegação" aria-expanded={aberto} aria-controls="sidebar-principal"><i className="fas fa-bars" /></button>
        <Link to="/" aria-label="Prospecção Brasil, início"><img src="/images/logo-wide.png" alt="Prospecção Brasil" className="app-topbar__logo" /></Link>
        <button type="button" className="app-topbar__recolher" onClick={alternarRecolhida} aria-label={recolhida ? 'Expandir menu lateral' : 'Recolher menu lateral'}><i className={`fas ${recolhida ? 'fa-angles-right' : 'fa-angles-left'}`} /></button>
      </div>
      <div className="app-topbar__centro" />
      <div className="app-topbar__direita">
        <span className="topbar-data">{new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}</span>
        <Link className="app-topbar__icone-circulo" to="/perfil" aria-label="Abrir meu perfil">{iniciais}</Link>
      </div>
    </header>
    {aberto && <button type="button" className="sidebar__overlay" aria-label="Fechar navegação" onClick={() => setAberto(false)} />}
    <aside id="sidebar-principal" className={`sidebar no-print ${recolhida ? 'sidebar--recolhida' : 'sidebar--expandida'} ${aberto ? 'is-aberta' : ''}`}>
      <nav className="sidebar__nav" aria-label="Navegação principal">
        {MENU.filter(permitido).map(item => {
          if (item.href) return <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer" title={recolhida ? item.rotulo : undefined} className={`sidebar__link ${recolhida ? 'sidebar__link--icon-only' : ''}`}><i className={`fas ${item.icone} sidebar__icon`} />{!recolhida && <span className="sidebar__label">{item.rotulo}</span>}</a>;
          if (item.tipo === 'link') return <NavLink key={item.caminho} to={item.caminho} end={item.caminho === '/'} title={recolhida ? item.rotulo : undefined} className={({ isActive }) => `sidebar__link ${recolhida ? 'sidebar__link--icon-only' : ''} ${isActive ? 'sidebar__link--active' : ''}`}><i className={`fas ${item.icone} sidebar__icon`} />{!recolhida && <span className="sidebar__label">{item.rotulo}</span>}</NavLink>;
          const estaAberto = !!grupos[item.rotulo];
          const ativo = grupoAtivo(item, pathname);
          if (recolhida) return <button key={item.rotulo} type="button" title={item.rotulo} aria-label={item.rotulo} className={`sidebar__group-icon-btn ${ativo ? 'sidebar__group-icon-btn--active' : ''}`} onClick={alternarRecolhida}><i className={`fas ${item.icone} sidebar__icon`} /></button>;
          return <div key={item.rotulo} className={`sidebar__secao ${estaAberto ? 'sidebar__secao--aberta' : ''}`}>
            <button type="button" aria-expanded={estaAberto} onClick={() => setGrupos(g => ({ ...g, [item.rotulo]: !estaAberto }))} className={`sidebar__secao-titulo ${ativo ? 'sidebar__secao-titulo--ativa' : ''}`}>
              <span className="sidebar__secao-titulo__esquerda"><i className={`fas ${item.icone} sidebar__icon`} /><span className="sidebar__label">{item.rotulo}</span></span>
              <i className={`fas fa-chevron-down sidebar__secao-chevron ${estaAberto ? 'is-aberto' : ''}`} />
            </button>
            {estaAberto && <div className="sidebar__secao-itens">{item.subitens.filter(permitido).map(sub => <NavLink key={sub.caminho} to={sub.caminho} className={`sidebar__sub-link ${subitemAtivo(sub, pathname) ? 'sidebar__sub-link--active' : ''}`}><i className={`fas ${sub.icone} sidebar__icon`} /><span className="sidebar__label">{sub.rotulo}</span></NavLink>)}</div>}
          </div>;
        })}
      </nav>
      <div className="sidebar__footer">
        <button type="button" onClick={logout} aria-label="Sair da conta" title={recolhida ? 'Sair' : undefined} className={`sidebar__logout ${recolhida ? 'sidebar__logout--icon-only' : ''}`}><i className="fas fa-sign-out-alt" />{!recolhida && <span>Sair</span>}</button>
      </div>
    </aside>
    <main id="main-content" tabIndex={-1} className={`app-shell__main ${recolhida ? 'app-shell__main--collapsed' : 'app-shell__main--expanded'}`}>
      <div className="app-shell__content app-shell__content--dense"><Outlet /></div>
    </main>
    <Snackbar />
  </div>;
}
