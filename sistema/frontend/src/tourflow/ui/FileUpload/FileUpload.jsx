import { useState, useRef, useCallback } from 'react';
import { avisar } from '../../../lib/avisos';
import './FileUpload.css';

export default function FileUpload({
  value,
  onChange,
  accept,
  maxSizeMB = 5,
  multiple = false,
  label,
  dragLabel = 'Arraste arquivos aqui ou clique para selecionar',
  hint,
  error,
  disabled,
  className = '',
  containerClassName = '',
  ...props
}) {
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState(value || []);
  const inputRef = useRef(null);

  const maxBytes = maxSizeMB * 1024 * 1024;

  const handleFiles = useCallback((fileList) => {
    const incoming = Array.from(fileList);
    const valid = incoming.filter(f => {
      if (f.size > maxBytes) {
        avisar(`Arquivo "${f.name}" excede o limite de ${maxSizeMB} MB.`, { tipo: 'erro' });
        return false;
      }
      return true;
    });

    if (!multiple && valid.length > 0) {
      setFiles([valid[0]]);
      onChange?.([valid[0]]);
    } else if (multiple) {
      setFiles(prev => [...prev, ...valid]);
      onChange?.([...files, ...valid]);
    }
  }, [multiple, maxBytes, maxSizeMB, files, onChange]);

  function removeFile(index) {
    const next = files.filter((_, i) => i !== index);
    setFiles(next);
    onChange?.(next);
  }

  function getPreviewUrl(file) {
    if (file.preview) return file.preview;
    if (typeof file === 'string') return file;
    return URL.createObjectURL(file);
  }

  function isImage(file) {
    if (typeof file === 'string') {
      return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file);
    }
    return file.type?.startsWith('image/');
  }

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const containerCls = [
    'wt-upload-container',
    dragOver ? 'wt-upload-dragover' : '',
    disabled ? 'wt-upload-disabled' : '',
    error ? 'wt-upload-error' : '',
    containerClassName,
  ].filter(Boolean).join(' ');

  return (
    <div className={containerCls}>
      {label && <label className="wt-upload-label">{label}</label>}

      <div
        className={`wt-upload-zone ${dragOver ? 'wt-upload-zone-active' : ''} ${disabled ? 'wt-upload-zone-disabled' : ''} ${className}`}
        onDragOver={e => { if (!disabled) { e.preventDefault(); setDragOver(true); } }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); if (!disabled) handleFiles(e.dataTransfer.files); }}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); }}
          style={{ display: 'none' }}
          disabled={disabled}
          {...props}
        />
        <i className="fas fa-cloud-upload-alt wt-upload-icon"></i>
        <p className="wt-upload-drag-label">{dragLabel}</p>
        {hint && <p className="wt-upload-hint">{hint}</p>}
      </div>

      {files.length > 0 && (
        <ul className="wt-upload-files">
          {files.map((file, idx) => (
            <li key={idx} className="wt-upload-file">
              {isImage(file) ? (
                <div className="wt-upload-preview">
                  <img src={getPreviewUrl(file)} alt={file.name || 'preview'} />
                </div>
              ) : (
                <div className="wt-upload-file-icon">
                  <i className="fas fa-file"></i>
                </div>
              )}
              <div className="wt-upload-file-info">
                <span className="wt-upload-file-name" title={file.name || 'Arquivo'}>
                  {file.name || 'Arquivo'}
                </span>
                <span className="wt-upload-file-size">
                  {file.size ? formatSize(file.size) : ''}
                </span>
              </div>
              <button
                type="button"
                className="wt-upload-remove"
                onClick={() => removeFile(idx)}
                disabled={disabled}
              >
                <i className="fas fa-trash-alt"></i>
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <span className="wt-upload-error-text">{error}</span>}
    </div>
  );
}
