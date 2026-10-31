import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import { Fragment, useLayoutEffect, useRef, useState } from 'react';
import EmptyState from '../EmptyState/EmptyState';
import DataTablePagination from './DataTablePagination';
import usePaginacaoTabela from '../../hooks/usePaginacaoTabela';
import './DataTable.css';
import { IconeExcel } from '../IconeArquivo';

/** Utilitárias (sem título ou de seleção/foto/ações) não contam como identificação. */
function colunaUtilitaria(c) {
  const id = String(c.id || c.accessorKey || '').toLowerCase();
  const titulo = typeof c.header === 'string' ? c.header.trim() : '';
  return !titulo || ['select', 'selecao', 'checkbox', 'foto', 'imagem', 'acoes', 'actions'].includes(id);
}

/** Colunas que classificam o registro (não o identificam): ficam fixas junto. */
const CLASSIFICADORAS = /^(tipo|origem|canal|status|situa[cç][aã]o|severidade|entrega|data([\s/].*)?)$/i;
function colunaClassificadora(c) {
  const id = String(c.id || c.accessorKey || '');
  const titulo = typeof c.header === 'string' ? c.header.trim() : '';
  return CLASSIFICADORAS.test(id) || CLASSIFICADORAS.test(titulo);
}

/** Fixa até a 1ª coluna que identifica o registro (código, nome, placa…). */
function colunasFixasAuto(columns) {
  const i = columns.findIndex((c) => !colunaUtilitaria(c) && !colunaClassificadora(c));
  return i < 0 || i > 3 ? 0 : i + 1;
}

function colunaDeAcoes(column) {
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  return ['acoes', 'actions', 'acao', 'action'].includes(normalize(column.id))
    || ['acoes', 'actions'].includes(normalize(column.columnDef.header));
}

export default function DataTable({
  columns,
  data,
  loading = false,
  error = null,
  onRetry,
  pageSize = 50,
  sortable = true,
  filterable = false,
  globalFilter,
  onGlobalFilterChange,
  onRowClick,
  emptyMessage = 'Nenhum registro encontrado.',
  emptyIcon = 'fas fa-inbox',
  emptyDescription,
  emptyAction,
  exportable = false,
  exportFilename = 'exportacao',
  // N primeiras colunas ficam fixas à esquerda no scroll horizontal.
  // Para offsets corretos, defina `size` nas colunas pinadas.
  /** Colunas fixas à esquerda (com linha divisória). 'auto' = 1ª coluna de
   * identificação, levando junto colunas utilitárias antes dela (seleção, foto). */
  stickyColumns = 'auto',
  filters,
  rowClassName,
  className = '',
  showPagination = true,
  // Render prop opcional para um rodapé (<tfoot>) da tabela. Recebe
  // { pageRows, allRows } (linhas da página atual e todas as linhas após
  // filtro, antes da paginação) e deve retornar uma ou mais <tr>.
  footer,
  /** Linha especial (ex.: separador de data) — não dispara onRowClick. */
  isGroupRow,
  /** Renderiza <tr> de grupo; recebe (rowOriginal, colCount). */
  renderGroupRow,
  manualPagination = false,
  pageCount,
  rowCount,
  pagination: controlledPagination,
  onPaginationChange,
  ...rest
}) {
  const paginacaoControlada = Boolean(manualPagination && controlledPagination && onPaginationChange);
  const totalLocal = Array.isArray(data) ? data.length : 0;
  const [paginacaoInterna, setPaginacaoInterna] = usePaginacaoTabela({
    pageSize,
    totalRows: paginacaoControlada ? 0 : totalLocal,
    resetKey: filterable ? (globalFilter ?? '') : undefined,
    enabled: showPagination && !paginacaoControlada,
  });

  const pagination = paginacaoControlada ? controlledPagination : paginacaoInterna;
  const handlePaginationChange = paginacaoControlada ? onPaginationChange : setPaginacaoInterna;

  const qtdFixas = stickyColumns === 'auto' ? colunasFixasAuto(columns) : Number(stickyColumns) || 0;
  const pinnedLeftIds = qtdFixas > 0
    ? columns.slice(0, qtdFixas).map((c) => c.id || c.accessorKey || c.accessor).filter(Boolean)
    : [];

  // Deslocamento das colunas fixas medido na largura REAL de cada coluna
  // (getStart() usa a largura padrão de 150px e deixava uma fresta).
  const tabelaRef = useRef(null);
  const [esquerdas, setEsquerdas] = useState({});
  const chaveFixas = pinnedLeftIds.join('|');
  useLayoutEffect(() => {
    const tabela = tabelaRef.current;
    if (!tabela || !chaveFixas) return undefined;
    const medir = () => {
      const ths = tabela.querySelectorAll('thead tr:first-child > th');
      const proximo = {};
      let acumulado = 0;
      chaveFixas.split('|').forEach((id, i) => {
        proximo[id] = acumulado;
        acumulado += ths[i]?.getBoundingClientRect().width || 0;
      });
      setEsquerdas((atual) => (JSON.stringify(atual) === JSON.stringify(proximo) ? atual : proximo));
    };
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(tabela);
    return () => observador.disconnect();
  }, [chaveFixas, data]);
  const esquerdaDe = (coluna) => esquerdas[coluna.id] ?? coluna.getStart('left');

  const table = useReactTable({
    data,
    columns,
    state: {
      ...(filterable ? { globalFilter } : {}),
      ...(showPagination ? { pagination } : {}),
      ...(pinnedLeftIds.length ? { columnPinning: { left: pinnedLeftIds } } : {}),
    },
    enableColumnPinning: pinnedLeftIds.length > 0,
    onGlobalFilterChange: filterable ? onGlobalFilterChange : undefined,
    onPaginationChange: showPagination ? handlePaginationChange : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: sortable ? getSortedRowModel() : undefined,
    getFilteredRowModel: filterable ? getFilteredRowModel() : undefined,
    getPaginationRowModel: (showPagination && !paginacaoControlada) ? getPaginationRowModel() : undefined,
    manualPagination: paginacaoControlada,
    autoResetPageIndex: false,
    pageCount: paginacaoControlada ? pageCount : undefined,
    rowCount: paginacaoControlada ? rowCount : undefined,
    enableSorting: sortable,
    ...rest,
  });

  function exportCSV() {
    const headers = columns.filter(c => c.accessorKey || c.accessor).map(c => c.header);
    const rows = table.getFilteredRowModel().rows.map(row =>
      columns.map(col => {
        const val = row.getValue(col.accessorKey || col.accessor);
        if (val == null) return '';
        const str = String(val);
        return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      })
    );
    const BOM = '\uFEFF';
    const blob = new Blob([[BOM, headers.join(','), ...rows.map(r => r.join(','))].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${exportFilename}.csv`;
    a.click();
    URL.revokeObjectURL(blob);
  }

  if (loading) {
    const larguras = ['55%', '80%', '40%', '70%', '60%', '75%'];
    return (
      <div className={`dt-wrapper ${className}`} aria-busy="true" aria-label="Carregando dados">
        <div className="dt-skeleton">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="dt-skeleton-row">
              <div className="dt-skeleton-bar" style={{ width: larguras[i % larguras.length] }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`dt-wrapper ${className}`}>
        <EmptyState
          compact
          variant="error"
          title="Não foi possível carregar os dados"
          description={typeof error === 'string' ? error : 'Tente novamente em instantes.'}
          action={onRetry ? { label: 'Tentar de novo', onClick: onRetry, icon: 'fas fa-rotate-right' } : undefined}
        />
      </div>
    );
  }

  const colCount = table.getAllFlatColumns().length;

  return (
    <div className={`dt-wrapper ${className}`}>
      {(filterable || filters?.length) && (
        <div className="dt-toolbar">
          <div className="dt-toolbar-left">
            {filterable && (
              <div className="dt-filter-field">
                <span className="dt-filter-label">Buscar</span>
                <div className="dt-search">
                  <i className="fas fa-search dt-search-icon"></i>
                  <input
                    type="text"
                    className="dt-search-input"
                    placeholder="Buscar..."
                    value={globalFilter ?? ''}
                    onChange={e => onGlobalFilterChange?.(e.target.value)}
                  />
                </div>
              </div>
            )}
            {filters?.map((f, i) => (
              <div key={f.name ?? i} className="dt-filter-field">
                {f.label && <span className="dt-filter-label">{f.label}</span>}
                <div className="dt-filter-input-wrap">
                  {f.icon && <i className={`${f.icon} dt-filter-field-icon`}></i>}
                  {f.type === 'select' ? (
                    <select
                      name={f.name}
                      value={f.value ?? ''}
                      onChange={f.onChange}
                      className="dt-filter-select"
                    >
                      {f.options?.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      name={f.name}
                      value={f.value ?? ''}
                      onChange={f.onChange}
                      placeholder={f.placeholder}
                      className="dt-filter-input"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="dt-scroll">
        <table className="dt-table" ref={tabelaRef}>
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(header => (
                  <th
                    key={header.id}
                    className={`dt-th ${colunaDeAcoes(header.column) ? 'dt-col-actions' : ''} ${header.column.getCanSort() ? 'dt-th-sort' : ''} ${header.column.getIsPinned() === 'left' ? `dt-sticky dt-sticky-th ${pinnedLeftIds.indexOf(header.column.id) === pinnedLeftIds.length - 1 ? 'dt-sticky-last' : ''}` : ''}`}
                    style={{
                      ...(header.getSize() !== 150 ? { width: header.getSize(), minWidth: header.getSize() } : {}),
                      ...(header.column.getIsPinned() === 'left' ? { left: esquerdaDe(header.column) } : {}),
                    }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <span className="dt-th-content">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' && <i className="fas fa-sort-up dt-sort-icon"></i>}
                      {header.column.getIsSorted() === 'desc' && <i className="fas fa-sort-down dt-sort-icon"></i>}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {data?.length ? (
              table.getRowModel().rows.map(row => {
                if (isGroupRow?.(row.original)) {
                  return (
                    <Fragment key={row.id}>
                      {renderGroupRow
                        ? renderGroupRow(row.original, colCount)
                        : (
                          <tr className="dt-tr dt-tr-group">
                            <td colSpan={colCount} className="dt-td dt-td-group">
                              {row.original?.label || row.original?.titulo || '—'}
                            </td>
                          </tr>
                        )}
                    </Fragment>
                  );
                }
                return (
                <tr
                  key={row.id}
                  className={`dt-tr ${onRowClick ? 'dt-tr-click' : ''} ${rowClassName?.(row.original) ?? ''}`}
                  onClick={() => {
                    // Evita abrir detalhe ao arrastar/selecionar texto na linha
                    const sel = typeof window !== 'undefined' ? window.getSelection?.()?.toString() : '';
                    if (sel && sel.trim()) return;
                    onRowClick?.(row.original);
                  }}
                >
                  {row.getVisibleCells().map(cell => (
                    <td
                      key={cell.id}
                      className={`dt-td ${colunaDeAcoes(cell.column) ? 'dt-col-actions' : ''} ${cell.column.getIsPinned() === 'left' ? `dt-sticky ${pinnedLeftIds.indexOf(cell.column.id) === pinnedLeftIds.length - 1 ? 'dt-sticky-last' : ''}` : ''}`}
                      style={cell.column.getIsPinned() === 'left' ? { left: esquerdaDe(cell.column) } : undefined}
                      data-label={cell.column.columnDef.meta?.label || (typeof cell.column.columnDef.header === 'string' ? cell.column.columnDef.header : '')}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={colCount} className="dt-empty-row">
                  <EmptyState
                    compact
                    icon={emptyIcon}
                    title={emptyMessage}
                    description={emptyDescription}
                    action={emptyAction}
                  />
                </td>
              </tr>
            )}
          </tbody>
          {footer && data?.length ? (
            <tfoot className="dt-tfoot">
              {footer({
                pageRows: table.getRowModel().rows.map((r) => r.original),
                allRows: table.getPrePaginationRowModel().rows.map((r) => r.original),
              })}
            </tfoot>
          ) : null}
        </table>
      </div>
      {showPagination && (
        <DataTablePagination
          table={table}
          acao={exportable ? (
            <button type="button" className="dt-export-btn dt-export-btn--rodape" onClick={exportCSV}>
              <IconeExcel /> Exportar CSV
            </button>
          ) : null}
        />
      )}
    </div>
  );
}
