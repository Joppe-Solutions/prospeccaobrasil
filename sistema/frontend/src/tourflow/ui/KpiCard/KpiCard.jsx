import { useState } from 'react';
import Skeleton from '../Skeleton/Skeleton';
import './KpiCard.css';

const TONES = new Set(['primary', 'emerald', 'amber', 'rose', 'sky', 'slate', 'violet', 'orange']);
const TONE_ALIASES = { success: 'emerald', warning: 'amber', error: 'rose', danger: 'rose' };
const SIZES = new Set(['sm', 'md', 'lg']);
const VARIANTS = new Set(['tinted', 'outline']);
const LAYOUTS = new Set(['vertical', 'horizontal']);

function normalizarIcone(icon) {
  if (!icon) return null;
  return /\bfa(s|r|b|l|t|d|solid|regular|brands|light|thin|duotone)\b/.test(icon) ? icon : `fas ${icon}`;
}

export default function KpiCard({
  icon,
  iconImg,
  label,
  value,
  hint,
  delta,
  tone = 'primary',
  variant = 'tinted',
  size = 'md',
  layout = 'horizontal',
  onDetalhar,
  loading = false,
  className = '',
  style,
  ...rest
}) {
  const [imgErro, setImgErro] = useState(false);
  const tom = TONE_ALIASES[tone] || (TONES.has(tone) ? tone : 'primary');
  const variante = VARIANTS.has(variant) ? variant : 'tinted';
  const tamanho = SIZES.has(size) ? size : 'md';
  const disposicao = LAYOUTS.has(layout) ? layout : 'vertical';
  const usarImg = iconImg && !imgErro;

  const iconeEl = (icon || usarImg) && (
    <span className={`wt-kpi-icon ${usarImg ? 'wt-kpi-icon--img' : ''}`}>
      {usarImg
        ? <img src={iconImg} alt="" className="wt-kpi-logo" onError={() => setImgErro(true)} />
        : <i className={normalizarIcone(icon)} />}
    </span>
  );

  if (loading) {
    return (
      <div className={`wt-kpi wt-kpi--${tamanho} wt-kpi--${disposicao} ${className}`} aria-busy="true" {...rest}>
        <div className="wt-kpi-head">
          <Skeleton circle width={36} height={36} />
          <Skeleton width="45%" height={11} />
        </div>
        <Skeleton width="60%" height={26} style={{ marginTop: 10 }} />
        <Skeleton width="80%" height={10} style={{ marginTop: 8 }} />
      </div>
    );
  }

  const rodapeEl = delta ? (
    <div className={`wt-kpi-delta ${delta.up ? 'wt-kpi-delta--up' : 'wt-kpi-delta--down'}`}>
      <i className={`fas ${delta.up ? 'fa-arrow-up' : 'fa-arrow-down'}`} />
      {delta.texto}
    </div>
  ) : (
    hint && <div className="wt-kpi-hint">{hint}</div>
  );

  return (
    <div
      className={[
        'wt-kpi',
        `wt-kpi--${tom}`,
        `wt-kpi--${variante}`,
        `wt-kpi--${tamanho}`,
        `wt-kpi--${disposicao}`,
        className,
      ].filter(Boolean).join(' ')}
      style={style}
      {...rest}
    >
      {onDetalhar && (
        <button
          type="button"
          onClick={onDetalhar}
          title="Ver lançamentos que compõem este valor"
          aria-label={`Ver lançamentos de ${label}`}
          className="wt-kpi-detalhar"
        >
          <i className="fas fa-ellipsis-vertical" />
        </button>
      )}

      {disposicao === 'horizontal' ? (
        <div className="wt-kpi-row">
          {iconeEl}
          <div className="wt-kpi-body">
            <p className="wt-kpi-label">{label}</p>
            <p className="wt-kpi-value">{value}</p>
            {rodapeEl}
          </div>
          <i className="fas fa-arrow-trend-up wt-kpi-trend" aria-hidden="true" />
        </div>
      ) : (
        <>
          <div className="wt-kpi-head">
            {iconeEl}
            <span className="wt-kpi-label">{label}</span>
          </div>
          <p className="wt-kpi-value">{value}</p>
          {rodapeEl}
        </>
      )}
    </div>
  );
}
