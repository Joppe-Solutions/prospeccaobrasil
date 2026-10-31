import { useState } from 'react';
import Modal from './Modal';

// Confirmação no padrão do sistema, no lugar de window.confirm/prompt.
// pedido: { titulo, texto, rotulo, perigo, campo } — `campo` pede um texto (ex.: motivo) e o devolve em onConfirm(valor).
export default function Confirmacao({ pedido, busy, erro, onClose, onConfirm }) {
  const [valor, setValor] = useState('');
  if (!pedido) return null;
  return <Modal title={pedido.titulo} description={pedido.texto} onClose={() => !busy && onClose()}
    footer={<><button className="btn btn-ghost" disabled={busy} onClick={onClose}>Cancelar</button><button className={`btn ${pedido.perigo ? 'btn-danger' : 'btn-primary'}`} disabled={busy} onClick={() => onConfirm(valor.trim())}>{busy ? 'Aguarde…' : pedido.rotulo || 'Confirmar'}</button></>}>
    <div className="collection-modal-form">
      {erro && <div className="alert error" role="alert">{erro}</div>}
      {pedido.campo && <div className="field"><label htmlFor="confirmacao-campo">{pedido.campo}</label><input id="confirmacao-campo" autoFocus value={valor} onChange={e => setValor(e.target.value)} /></div>}
    </div>
  </Modal>;
}
