import './Button.css';
import { iconeDeArquivo } from '../IconeArquivo';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  type = 'button',
  className = '',
  onClick,
  fullWidth = false,
  ...props
}) {
  const variants = {
    primary: 'wt-btn-primary',
    secondary: 'wt-btn-secondary',
    ghost: 'wt-btn-ghost',
    danger: 'wt-btn-danger',
    success: 'wt-btn-success',
    outline: 'wt-btn-outline',
  };

  const sizes = {
    sm: 'wt-btn-sm',
    md: 'wt-btn-md',
    lg: 'wt-btn-lg',
  };

  const cls = [
    'wt-btn',
    variants[variant] || variants.primary,
    sizes[size] || sizes.md,
    loading ? 'wt-btn-loading' : '',
    fullWidth ? 'w-full' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={cls}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <i className="fas fa-spinner fa-spin wt-btn-spinner"></i>
      ) : icon ? (
        iconeDeArquivo(icon, size === 'sm' ? 16 : size === 'lg' ? 20 : 18) || <i className={`${icon} wt-btn-icon`}></i>
      ) : null}
      {children && <span>{children}</span>}
    </button>
  );
}
