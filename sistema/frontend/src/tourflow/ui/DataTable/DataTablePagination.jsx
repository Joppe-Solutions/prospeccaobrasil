import { getPaginationItems } from './paginationRange';

const PAGE_SIZE_OPTIONS = [10, 20, 25, 50, 100];

function PageSizeSelect({ pageSize, onChange }) {
  const opcoes = PAGE_SIZE_OPTIONS.includes(pageSize)
    ? PAGE_SIZE_OPTIONS
    : [...PAGE_SIZE_OPTIONS, pageSize].sort((a, b) => a - b);

  return (
    <label className="dt-pagination-size">
      <span className="sr-only">Registros por página</span>
      <select
        value={pageSize}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label="Registros por página"
      >
        {opcoes.map((tamanho) => (
          <option key={tamanho} value={tamanho}>{tamanho} / pág.</option>
        ))}
      </select>
    </label>
  );
}

/** Paginação compartilhada (TanStack Table) — janela com reticências. */
export default function DataTablePagination({ table, siblingCount = 1, acao = null }) {
  if (!table) return null;

  const { pageIndex, pageSize } = table.getState().pagination;
  const totalRows = table.options.rowCount ?? table.getFilteredRowModel().rows.length;
  const totalPages = Math.max(1, table.getPageCount() || 1);
  const currentPage = pageIndex + 1;
  const from = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, totalRows);

  // Sem registros → não mostra nada
  if (totalRows === 0) return null;

  // 1 página → total + seletor de tamanho
  if (totalPages <= 1) {
    return (
      <div className="dt-pagination">
        {acao}
        <span className="dt-pagination-info">
          <span className="dt-pagination-total">{totalRows} registro{totalRows === 1 ? '' : 's'}</span>
        </span>
        <PageSizeSelect pageSize={pageSize} onChange={(tamanho) => table.setPageSize(tamanho)} />
      </div>
    );
  }

  const pages = getPaginationItems(currentPage, totalPages, siblingCount);

  return (
    <div className="dt-pagination">
      {acao}
        <span className="dt-pagination-info">
        <span className="dt-pagination-range">{from}–{to}</span>
        <span className="dt-pagination-sep"> de </span>
        <span className="dt-pagination-total">{totalRows}</span>
      </span>
      <PageSizeSelect pageSize={pageSize} onChange={(tamanho) => table.setPageSize(tamanho)} />

      <nav className="dt-pagination-btns" aria-label="Paginação">
        <button
          type="button"
          className="dt-page-btn"
          disabled={!table.getCanPreviousPage()}
          onClick={() => table.setPageIndex(0)}
          aria-label="Primeira página"
          title="Primeira página"
        >
          <i className="fas fa-angle-double-left" aria-hidden />
        </button>
        <button
          type="button"
          className="dt-page-btn"
          disabled={!table.getCanPreviousPage()}
          onClick={() => table.previousPage()}
          aria-label="Página anterior"
          title="Anterior"
        >
          <i className="fas fa-chevron-left" aria-hidden />
        </button>

        {pages.map((item, idx) => (
          item === 'ellipsis' ? (
            <span key={`e-${idx}`} className="dt-page-ellipsis" aria-hidden>
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              className={`dt-page-btn ${item === currentPage ? 'dt-page-active' : ''}`}
              onClick={() => table.setPageIndex(item - 1)}
              aria-label={`Página ${item}`}
              aria-current={item === currentPage ? 'page' : undefined}
            >
              {item}
            </button>
          )
        ))}

        <button
          type="button"
          className="dt-page-btn"
          disabled={!table.getCanNextPage()}
          onClick={() => table.nextPage()}
          aria-label="Próxima página"
          title="Próxima"
        >
          <i className="fas fa-chevron-right" aria-hidden />
        </button>
        <button
          type="button"
          className="dt-page-btn"
          disabled={!table.getCanNextPage()}
          onClick={() => table.setPageIndex(totalPages - 1)}
          aria-label="Última página"
          title="Última página"
        >
          <i className="fas fa-angle-double-right" aria-hidden />
        </button>
      </nav>
    </div>
  );
}
