import './Skeleton.css';

/**
 * Bloco de loading com shimmer. Use width/height inline ou as classes utilitárias.
 */
export default function Skeleton({ width, height = 12, circle = false, className = '', style }) {
  return (
    <div
      aria-hidden="true"
      className={`wt-skeleton ${circle ? 'wt-skeleton--circle' : ''} ${className}`}
      style={{ width, height, ...style }}
    />
  );
}
