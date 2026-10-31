import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import HelpTooltip from '../HelpTooltip/HelpTooltip';
import { useDropdownFlutuante } from '../../hooks/useDropdownFlutuante';
import { ordenarOpcoesSelect } from '../../lib/ordenarAlfabetico';
import './Select.css';

function flattenOptions(opts) {
  return (opts || []).reduce((acc, o) => {
    if (o.options) return [...acc, ...o.options];
    return [...acc, o];
  }, []);
}

function valuesMatch(a, b) {
  if (a === b) return true;
  if ((a === '' || a == null) && (b === '' || b == null)) return true;
  return String(a) === String(b);
}

export default function Select({
  label,
  options,
  value,
  onChange,
  placeholder = 'Selecionar...',
  error,
  disabled,
  required = false,
  tooltip,
  clearable = false,
  searchable = false,
  loading = false,
  className = '',
  containerClassName = '',
  ordenar = true,
}) {
  const [search, setSearch] = useState('');
  const {
    aberto: open, setAberto: setOpen, estiloMenu, triggerRef, menuRef: dropdownRef, alternar,
  } = useDropdownFlutuante({ maxHeight: 320, minWidth: 280 });
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && searchable) {
      inputRef.current?.focus();
      setSearch('');
    }
  }, [open, searchable]);

  function getLabel(option) {
    if (!option) return placeholder;
    return option.label ?? option.name ?? option.value;
  }

  function handleSelect(option) {
    const next = option?.value == null ? '' : option.value;
    onChange?.(next, option);
    setOpen(false);
  }

  function handleClear(e) {
    e.stopPropagation();
    onChange?.('', null);
  }

  function matchesSearch(option) {
    if (!search) return true;
    const term = search.toLowerCase();
    return (option.label ?? '').toLowerCase().includes(term)
      || (option.name ?? '').toLowerCase().includes(term);
  }

  const optionsOrdenadas = useMemo(
    () => ordenarOpcoesSelect(options, { ordenar }),
    [options, ordenar],
  );
  const allFlat = flattenOptions(optionsOrdenadas);
  let selectedOption = allFlat.find((o) => valuesMatch(o.value, value));
  const hasValue = value != null && value !== '';
  // Valor gravado que ainda não está na lista (catálogo filtrado / opções async):
  // mantém o rótulo visível em vez de parecer campo vazio ("Selecione").
  if (hasValue && !selectedOption) {
    selectedOption = { value, label: String(value) };
  }

  const containerCls = [
    'wt-select-container',
    open ? 'wt-select-open' : '',
    error ? 'wt-select-error' : '',
    disabled ? 'wt-select-disabled' : '',
    containerClassName,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={containerCls}>
      {label && (
        <label className="wt-select-label">
          {label}
          {required && <span className="wt-select-required" aria-hidden="true">*</span>}
          {tooltip && <HelpTooltip term={tooltip} />}
        </label>
      )}
      <div
        ref={triggerRef}
        className="wt-select-trigger"
        onClick={() => !disabled && alternar()}
        role="combobox"
        aria-expanded={open}
      >
        <span
          className={`wt-select-value ${hasValue ? '' : 'wt-select-placeholder'}`}
          title={hasValue ? getLabel(selectedOption) : undefined}
        >
          {getLabel(selectedOption)}
        </span>
        <div className="wt-select-actions">
          {clearable && hasValue && !disabled && (
            <button type="button" className="wt-select-clear" onClick={handleClear} tabIndex="-1">
              <i className="fas fa-times" />
            </button>
          )}
          <i className={`fas fa-chevron-down wt-select-arrow ${open ? 'wt-select-arrow-up' : ''}`} />
        </div>
      </div>
      {open && estiloMenu && createPortal(
        <div
          ref={dropdownRef}
          className="wt-select-dropdown"
          style={estiloMenu}
        >
          {searchable && (
            <div className="wt-select-search">
              <i className="fas fa-search wt-select-search-icon" />
              <input
                ref={inputRef}
                type="text"
                className="wt-select-search-input"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}
          <div className="wt-select-options">
            {loading ? (
              <div className="wt-select-empty">
                <i className="fas fa-circle-notch fa-spin" /> Carregando...
              </div>
            ) : optionsOrdenadas?.length === 0 ? (
              <div className="wt-select-empty">Nenhuma opção disponível</div>
            ) : (
              optionsOrdenadas?.map((item) => {
                if (item.options) {
                  const filtered = item.options.filter(matchesSearch);
                  if (filtered.length === 0 && search) return null;

                  return (
                    <div key={item.label} className="wt-select-group">
                      <div className="wt-select-group-label">{item.label}</div>
                      {filtered.map((sub) => (
                        <div
                          key={sub.value}
                          className={`wt-select-option ${valuesMatch(sub.value, value) ? 'wt-select-option-active' : ''}`}
                          title={getLabel(sub)}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSelect(sub)}
                        >
                          {getLabel(sub)}
                        </div>
                      ))}
                    </div>
                  );
                }
                if (search && !matchesSearch(item)) return null;
                return (
                  <div
                    key={item.value}
                    className={`wt-select-option ${valuesMatch(item.value, value) ? 'wt-select-option-active' : ''}`}
                    title={getLabel(item)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(item)}
                  >
                    {getLabel(item)}
                  </div>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
      {error && <span className="wt-select-helper wt-select-error-text">{error}</span>}
    </div>
  );
}
