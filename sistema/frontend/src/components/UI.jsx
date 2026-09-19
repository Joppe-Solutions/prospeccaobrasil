import { Buildings, CircleNotch } from '@phosphor-icons/react';
import { STATUS } from '../lib/api';

export function PageHeader({ eyebrow, title, description, actions }) {
  return <header className="page-head"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="page-actions">{actions}</div>}</header>;
}
export function EmptyState({ icon: Icon = Buildings, title = 'Nada por aqui ainda', description, children }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={28} weight="duotone" /></span><h3>{title}</h3>{description && <p>{description}</p>}{children}</div>;
}
const LABELS = { ...STATUS, ativo: 'Ativo', apresentado: 'Apresentado', visita: 'Em visita', proposta: 'Proposta', fechado: 'Fechado', perdido: 'Perdido', admin: 'Administrador', comercial: 'Comercial' };
export function StatusBadge({ status, label }) { return <span className={`badge ${status || ''}`}><span className="status-dot" />{label || LABELS[status] || status}</span>; }
export function Avatar({ name = '', size = 36 }) { const letters = name.trim().split(/\s+/).filter(Boolean); return <span className="avatar" style={{ width: size, height: size, fontSize: Math.max(11, size / 3) }} aria-hidden="true">{(letters[0]?.[0] || 'P') + (letters.length > 1 ? letters[letters.length - 1][0] : '')}</span>; }
export function LoadingState({ label = 'Carregando informações…' }) { return <div className="loading-state" role="status"><CircleNotch size={24} className="spin" />{label}</div>; }
