/**
 * Gera a sequência de páginas visíveis com reticências (padrão Mantine/Chakra).
 * Ex.: total=21, current=1  → [1, 2, 3, 'ellipsis', 21]
 *      total=21, current=10 → [1, 'ellipsis', 9, 10, 11, 'ellipsis', 21]
 *
 * @param {number} currentPage — 1-based
 * @param {number} totalPages
 * @param {number} [siblingCount=1] — páginas vizinhas à atual de cada lado
 * @returns {Array<number|'ellipsis'>}
 */
export function getPaginationItems(currentPage, totalPages, siblingCount = 1) {
  const total = Math.max(0, Number(totalPages) || 0);
  if (total <= 0) return [];

  const current = Math.min(Math.max(1, Number(currentPage) || 1), total);
  const siblings = Math.max(0, Number(siblingCount) || 0);

  const range = (start, end) => {
    const len = Math.max(0, end - start + 1);
    return Array.from({ length: len }, (_, i) => start + i);
  };

  // first + last + current + 2*siblings + até 2 reticências
  const totalPageNumbers = siblings * 2 + 5;
  if (totalPageNumbers >= total) {
    return range(1, total);
  }

  const leftSibling = Math.max(current - siblings, 1);
  const rightSibling = Math.min(current + siblings, total);

  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < total - 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftItemCount = 3 + 2 * siblings;
    return [...range(1, leftItemCount), 'ellipsis', total];
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    const rightItemCount = 3 + 2 * siblings;
    return [1, 'ellipsis', ...range(total - rightItemCount + 1, total)];
  }

  return [1, 'ellipsis', ...range(leftSibling, rightSibling), 'ellipsis', total];
}
