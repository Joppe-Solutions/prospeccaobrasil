import { CheckCircle, WarningCircle, X } from '@phosphor-icons/react';
import { avisar, useAviso } from '../lib/avisos';

export default function Snackbar() {
  const aviso = useAviso();
  return <div className="snackbar-area" aria-live="polite">
    {aviso && <div key={aviso.id} className={`snackbar is-${aviso.tipo}`} role="status">
      {aviso.tipo === 'erro' ? <WarningCircle size={18} /> : <CheckCircle size={18} />}
      <span>{aviso.texto}</span>
      <button type="button" aria-label="Fechar aviso" onClick={() => avisar('')}><X size={16} /></button>
    </div>}
  </div>;
}
