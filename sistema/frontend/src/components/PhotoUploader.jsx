import { useRef, useState } from 'react';
import { ImageSquare, Star, Trash, UploadSimple } from '@phosphor-icons/react';
import './photo-uploader.css';

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Upload de fotos com prévia, capa e remoção. Só apresenta: quem usa decide se envia na hora
 * ou guarda para depois.
 * items: [{ key, src, capa, pendente }] · onAdd(File[]) · onCover(key) · onRemove(key)
 */
export default function PhotoUploader({ items = [], onAdd, onCover, onRemove, busy = false, max = 10, hint }) {
  const input = useRef(null);
  const [over, setOver] = useState(false);
  const [aviso, setAviso] = useState('');

  function receber(lista) {
    const todos = [...lista];
    const validos = todos.filter(f => ACCEPT.includes(f.type) && f.size <= 15 * 1024 * 1024);
    setAviso(validos.length < todos.length ? 'Alguns arquivos foram ignorados: use JPEG, PNG ou WebP de até 15 MB.' : '');
    if (validos.length) onAdd?.(validos);
  }

  return <div className="photo-uploader">
    <div className={`photo-drop ${over ? 'is-over' : ''}`}
      onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); if (!busy) receber(e.dataTransfer.files); }}>
      <UploadSimple size={22} />
      <div><strong>Arraste as fotos para cá</strong><span>{hint || `JPEG, PNG ou WebP · até ${max} por envio`}</span></div>
      <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => input.current.click()}>{busy ? 'Enviando…' : 'Selecionar fotos'}</button>
      <input ref={input} type="file" accept={ACCEPT.join(',')} multiple hidden aria-label="Selecionar fotos"
        onChange={e => { receber(e.target.files); e.target.value = ''; }} />
    </div>
    {aviso && <p className="photo-warning" role="alert">{aviso}</p>}
    {items.length
      ? <ul className="photo-grid">{items.map((item, index) => <li key={item.key} className={item.capa ? 'is-cover' : ''}>
        <img src={item.src} alt={`Foto ${index + 1}`} loading="lazy" />
        {item.capa && <span className="photo-tag">CAPA</span>}
        {item.pendente && <span className="photo-tag is-pending">Envia ao salvar</span>}
        <div className="photo-actions">
          {!item.capa && <button type="button" title="Usar como capa" aria-label={`Usar foto ${index + 1} como capa`} onClick={() => onCover?.(item.key)}><Star size={14} /></button>}
          <button type="button" title="Remover" aria-label={`Remover foto ${index + 1}`} onClick={() => onRemove?.(item.key)}><Trash size={14} /></button>
        </div>
      </li>)}</ul>
      : <p className="photo-empty"><ImageSquare size={18} />Nenhuma foto ainda. A primeira enviada vira a capa.</p>}
  </div>;
}
