import { useMemo, useState } from 'react';
import TabelaTourflow from '../tourflow/ui/DataTable/DataTable';
import Input from '../tourflow/ui/Input/Input';
import { useFonteExportacao } from './Exportacao';

const normalizar = valor => String(valor ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const valorDaColuna = (coluna, item) => (coluna.accessorFn ? coluna.accessorFn(item) : coluna.accessorKey ? item[coluna.accessorKey] : '');

// Tabela do TourFlow com a busca e os filtros das listagens em uma linha acima (FilterBar).
export default function DataTable({ columns, data = [], loading, error, onRetry, emptyTitle = 'Nenhum resultado encontrado', emptyDescription = 'Tente ajustar a busca ou os filtros.', searchPlaceholder = 'Buscar…', searchValue, onSearchChange, toolbar, pageSize = 10, pagination = true, search = true, exportName, compact = false, emptyAction }) {
  const [busca, setBusca] = useState('');
  const termo = searchValue ?? busca;
  const trocarBusca = valor => (onSearchChange ? onSearchChange(valor) : setBusca(valor));
  const linhas = useMemo(() => {
    const procurado = normalizar(termo).trim();
    if (!procurado) return data;
    return data.filter(item => normalizar(columns.map(c => valorDaColuna(c, item)).join(' ')).includes(procurado));
  }, [data, columns, termo]);

  const nome = exportName?.replace(/\.csv$/, '');
  const colunasExportacao = columns.filter(c => typeof c.header === 'string' && c.header.trim() && (c.exportValue || c.accessorFn || c.accessorKey)).map(c => ({ titulo: c.header, valor: item => c.exportValue ? c.exportValue(item) : valorDaColuna(c, item) }));
  useFonteExportacao(nome, { nome, colunas: colunasExportacao, linhas, loading, error });

  return <div className={`data-table ${compact ? 'compact' : ''}`}>
    {(search || toolbar) && <div className="wt-filterbar table-filters" role="search">
      {search && <div className="table-busca"><Input aria-label={searchPlaceholder} placeholder={searchPlaceholder} value={termo} onChange={e => trocarBusca(e.target.value)} icon="fas fa-search" /></div>}
      {toolbar}
    </div>}
    <TabelaTourflow columns={columns} data={linhas} loading={loading} error={error || null} onRetry={onRetry} pageSize={pageSize} showPagination={pagination}
      emptyMessage={emptyTitle} emptyDescription={emptyDescription} emptyAction={emptyAction} emptyIcon="fas fa-inbox"
      exportable={false} stickyColumns={compact ? 0 : 'auto'} />
  </div>;
}
