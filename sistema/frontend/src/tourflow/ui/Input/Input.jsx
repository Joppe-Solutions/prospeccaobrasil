import { useState, useId } from 'react';
import HelpTooltip from '../HelpTooltip/HelpTooltip';
import './Input.css';

export default function Input({
  label,
  error,
  helperText,
  icon,
  rightIcon,
  rightAction,
  type = 'text',
  required = false,
  tooltip,
  className = '',
  containerClassName = '',
  onChange,
  value,
  ...props
}) {
  const [focused, setFocused] = useState(false);
  const reactId = useId();
  const inputId = props.id || props.name || reactId;
  const hasError = !!error;
  const hasRight = !!(rightAction || rightIcon);

  const containerCls = [
    'wt-input-container',
    focused ? 'wt-input-focused' : '',
    hasError ? 'wt-input-error' : '',
    icon ? 'wt-input-has-icon' : '',
    hasRight ? 'wt-input-has-right' : '',
    containerClassName,
  ].filter(Boolean).join(' ');

  // Detecta asterisco manual no label (ex: "Nome *") para evitar duplicação
  const hasManualAsterisk = typeof label === 'string' && label.trim().endsWith('*');
  const showRequiredAsterisk = required && !hasManualAsterisk;

  return (
    <div className={containerCls}>
      {label && (
        <label htmlFor={inputId} className="wt-input-label">
          {label}
          {showRequiredAsterisk && <span className="wt-input-required" aria-hidden="true">*</span>}
          {tooltip && <HelpTooltip term={tooltip} />}
        </label>
      )}
      <div className="wt-input-wrapper">
        {icon && <i className={`${icon} wt-input-left-icon`}></i>}
        <input
          id={inputId}
          type={type}
          className={`wt-input ${className}`}
          value={value}
          onChange={onChange}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
          {...props}
        />
        {rightAction ? (
          <span className="wt-input-right-slot">{rightAction}</span>
        ) : rightIcon ? (
          <i className={`${rightIcon} wt-input-right-icon`}></i>
        ) : null}
      </div>
      {hasError && <span className="wt-input-helper wt-input-error-text">{error}</span>}
      {helperText && !hasError && <span className="wt-input-helper">{helperText}</span>}
    </div>
  );
}
