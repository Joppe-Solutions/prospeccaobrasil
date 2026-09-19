import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';

let locks = 0;
let previousOverflow = '';
export default function Modal({ open = true, onClose, title, description, children, footer, wide = false, closeOnOverlay = false, className = '' }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const prior = document.activeElement;
    const root = document.getElementById('root');
    if (locks++ === 0) { previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; root?.setAttribute('inert', ''); }
    const focusable = () => [...(ref.current?.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]') || [])].filter(el => el.getClientRects().length);
    const timer = requestAnimationFrame(() => (focusable()[0] || ref.current)?.focus());
    function onKey(e) {
      if (document.querySelector('.modal-overlay:last-of-type') !== ref.current?.parentElement) return;
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current?.(); }
      if (e.key === 'Tab') {
        const nodes = focusable(); const first = nodes[0]; const last = nodes[nodes.length - 1];
        if (!first) { e.preventDefault(); ref.current?.focus(); }
        else if (e.shiftKey && (document.activeElement === first || !ref.current.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (document.activeElement === last || !ref.current.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(timer); document.removeEventListener('keydown', onKey); if (--locks === 0) { document.body.style.overflow = previousOverflow; root?.removeAttribute('inert'); } if (prior?.isConnected) prior.focus(); };
  }, [open]);
  if (!open) return null;
  return createPortal(<div className="modal-overlay" onMouseDown={e => { if (closeOnOverlay && e.target === e.currentTarget) onClose?.(); }}><section ref={ref} tabIndex={-1} className={`modal ${wide ? 'modal-wide' : ''} ${className}`} role="dialog" aria-modal="true" aria-labelledby={title ? `${id}-title` : undefined} aria-label={!title ? 'Formulário em etapas' : undefined} aria-describedby={description ? `${id}-description` : undefined}>
    {title && <header className="modal-header"><div><h2 id={`${id}-title`}>{title}</h2>{description && <p id={`${id}-description`}>{description}</p>}</div><button type="button" className="icon-button" aria-label="Fechar janela" onClick={onClose}><X size={20} /></button></header>}
    <div className="modal-body">{children}</div>{footer && <footer className="modal-footer">{footer}</footer>}
  </section></div>, document.body);
}
