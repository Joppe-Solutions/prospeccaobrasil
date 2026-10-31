import { useEffect, useState } from 'react';

export function clampPageIndex(pageIndex, totalRows, pageSize) {
  const size = Math.max(1, Number(pageSize) || 1);
  const maxPage = Math.max(0, Math.ceil((totalRows || 0) / size) - 1);
  const atual = Number(pageIndex) || 0;
  return Math.min(Math.max(atual, 0), maxPage);
}

/**
 * Paginação local do DataTable. Evita o auto-reset do TanStack quando
 * o array `data` ganha uma nova referência (filtros, includes, re-render).
 */
export default function usePaginacaoTabela({
  pageSize = 50,
  totalRows = 0,
  resetKey,
  enabled = true,
} = {}) {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize,
  });

  useEffect(() => {
    if (!enabled) return;
    setPagination((prev) => (
      prev.pageSize === pageSize
        ? prev
        : { pageIndex: 0, pageSize }
    ));
  }, [pageSize, enabled]);

  useEffect(() => {
    if (!enabled) return;
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [resetKey, enabled]);

  useEffect(() => {
    if (!enabled) return;
    setPagination((prev) => {
      const pageIndex = clampPageIndex(prev.pageIndex, totalRows, prev.pageSize);
      return pageIndex === prev.pageIndex ? prev : { ...prev, pageIndex };
    });
  }, [totalRows, enabled]);

  return [pagination, setPagination];
}
