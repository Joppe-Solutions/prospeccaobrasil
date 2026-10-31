/**
 * Calcula a posição ideal de um dropdown/portlet em `position: fixed`,
 * garantindo que fique sempre dentro da viewport.
 *
 * - Faz flip top/bottom automaticamente quando não cabe abaixo do trigger.
 * - No flip para cima, ancora pela borda inferior do menu (`bottom` CSS)
 *   para o menu crescer para cima sem “vão” quando o conteúdo é menor que maxHeight.
 * - Faz clamp horizontal para que o menu não saia da tela (esquerda/direita).
 * - Calcula maxHeight com base no espaço disponível.
 * - Garante largura mínima legível (labels longos não ficam espremidos).
 *
 * @param {object} opts
 * @param {DOMRect|{top:number,bottom:number,left:number,right:number,width:number,height:number}} opts.rect
 * @param {number} [opts.gap=4]
 * @param {number} [opts.menuWidth]
 * @param {number} [opts.minWidth=0]
 * @param {number} [opts.maxHeight=320]
 * @param {number} [opts.viewportMargin=8]
 * @param {'bottom'|'top'|null} [opts.preferredPlacement]
 * @returns {{ top: number|null, bottom: number|null, left: number, width: number|null, maxHeight: number, placement: 'bottom'|'top' }}
 */
export function computeDropdownPosition({
  rect,
  gap = 4,
  menuWidth = null,
  minWidth = 0,
  maxHeight = 320,
  viewportMargin = 8,
  preferredPlacement = null,
}) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const maxAllowedWidth = Math.max(120, viewportWidth - viewportMargin * 2);
  const width = Math.min(
    maxAllowedWidth,
    menuWidth != null ? menuWidth : Math.max(rect.width, Number(minWidth) || 0),
  );

  const spaceBelow = viewportHeight - rect.bottom - gap - viewportMargin;
  const spaceAbove = rect.top - gap - viewportMargin;

  let placement = preferredPlacement;
  if (!placement) {
    // Prefere abrir abaixo se couber ~um menu útil; senão, abre para o lado com mais espaço.
    placement = spaceBelow >= Math.min(maxHeight, 160) || spaceBelow >= spaceAbove ? 'bottom' : 'top';
  }

  const availableVertical = placement === 'bottom' ? spaceBelow : spaceAbove;
  const clampedMaxHeight = Math.max(80, Math.min(maxHeight, Math.max(availableVertical, 80)));

  // bottom placement: ancora o topo do menu sob o gatilho.
  // top placement: ancora a base do menu acima do gatilho via CSS `bottom`
  // (evita reservar maxHeight inteiro e criar vão quando o conteúdo é menor).
  const top = placement === 'bottom' ? rect.bottom + gap : null;
  const bottom = placement === 'top'
    ? Math.max(viewportMargin, viewportHeight - rect.top + gap)
    : null;

  let left;
  if (menuWidth != null && menuWidth <= rect.width) {
    left = rect.right - width;
  } else {
    left = rect.left;
  }

  if (left < viewportMargin) left = viewportMargin;
  if (left + width > viewportWidth - viewportMargin) {
    left = Math.max(viewportMargin, viewportWidth - viewportMargin - width);
  }

  return {
    top,
    bottom,
    left,
    width,
    maxHeight: clampedMaxHeight,
    placement,
  };
}

/**
 * Estilo inline pronto para portal `position: fixed`.
 * Aceita o retorno de computeDropdownPosition.
 */
export function dropdownPortalStyle(posicao, extras = {}) {
  if (!posicao) return extras;
  return {
    position: 'fixed',
    top: posicao.top == null ? 'auto' : posicao.top,
    bottom: posicao.bottom == null ? 'auto' : posicao.bottom,
    left: posicao.left,
    right: 'auto',
    width: posicao.width ?? undefined,
    maxHeight: posicao.maxHeight,
    zIndex: 9999,
    ...extras,
  };
}
