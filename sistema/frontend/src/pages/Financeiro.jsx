import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Buildings, CurrencyDollar, Receipt, Wallet } from '@phosphor-icons/react';
import { api, fmtMoney } from '../lib/api';
import DataTable from '../components/DataTable';
import { PageHeader } from '../components/UI';
import './collections.css';

export default function Financeiro() {
  const [data, setData] = useState({ total: 0, qtd: 0, porImovel: [], despesas: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await api('/financeiro')); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const columns = useMemo(() => [
    {
      id: 'imovel',
      header: 'Imóvel',
      accessorFn: d => `${d.imovel?.codigo || ''} ${d.imovel?.endereco || ''} ${d.imovel?.bairro || ''}`,
      cell: ({ row }) => {
        const i = row.original.imovel;
        return <Link className="collection-cell-stack collection-title-link" to={`/imoveis/${row.original.imovelId}`}>
          <span className="collection-code">{i?.codigo || '—'}</span>
          <strong>{i?.endereco || 'Imóvel'}{i?.numero ? `, ${i.numero}` : ''}</strong>
          <small>{[i?.bairro, i?.cidade].filter(Boolean).join(' · ') || '—'}</small>
        </Link>;
      },
    },
    { accessorKey: 'descricao', header: 'Despesa', cell: ({ getValue }) => <strong>{getValue()}</strong> },
    {
      accessorKey: 'valor',
      header: 'Valor',
      cell: ({ getValue }) => <span className="collection-money">{fmtMoney(getValue())}</span>,
    },
    {
      id: 'data',
      header: 'Data',
      accessorFn: d => d.data || d.criadoEm,
      cell: ({ getValue }) => {
        const v = getValue();
        return v ? new Date(v).toLocaleDateString('pt-BR') : '—';
      },
    },
  ], []);

  const count = v => (loading || error ? '—' : v);

  return <div className="collection-page">
    <PageHeader
      eyebrow="CONTROLE FINANCEIRO"
      title="Financeiro"
      description="Despesas por imóvel — planta, deslocamento e demais custos para chegar no líquido."
    />
    <div className="collection-stats">
      <div>
        <span className="collection-stat-icon is-gold"><Wallet size={21} /></span>
        <span><small>Total de despesas</small><strong>{count(fmtMoney(data.total))}</strong></span>
      </div>
      <div>
        <span className="collection-stat-icon"><Receipt size={21} /></span>
        <span><small>Lançamentos</small><strong>{count(data.qtd)}</strong></span>
      </div>
      <div>
        <span className="collection-stat-icon is-green"><Buildings size={21} /></span>
        <span><small>Imóveis com custo</small><strong>{count(data.porImovel?.length || 0)}</strong></span>
      </div>
    </div>

    {!!data.porImovel?.length && (
      <section className="panel collection-panel" style={{ marginBottom: 18 }}>
        <div className="collection-section-head">
          <div><h2>Por imóvel</h2><p>Resumo dos custos acumulados em cada ponto.</p></div>
          <span className="collection-section-symbol"><CurrencyDollar size={22} /></span>
        </div>
        <div className="collection-stats" style={{ margin: 0 }}>
          {data.porImovel.slice(0, 6).map(row => (
            <Link key={row.imovel?.id || row.imovel?.codigo} to={`/imoveis/${row.imovel?.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <span className="collection-stat-icon"><Buildings size={18} /></span>
              <span>
                <small>{row.imovel?.codigo} · {row.qtd} lançamento{row.qtd === 1 ? '' : 's'}</small>
                <strong>{fmtMoney(row.total)}</strong>
              </span>
            </Link>
          ))}
        </div>
      </section>
    )}

    <section className="panel collection-panel">
      <div className="collection-section-head">
        <div><h2>Todos os lançamentos</h2><p>Cadastre despesas no detalhe de cada imóvel.</p></div>
      </div>
      <DataTable
        columns={columns}
        data={data.despesas || []}
        loading={loading}
        error={error}
        searchPlaceholder="Buscar imóvel ou despesa..."
        exportName="financeiro.csv"
        emptyTitle="Nenhuma despesa registrada"
        emptyDescription="Abra um imóvel e registre planta, deslocamento e outros custos."
        toolbar={error && <button className="btn btn-ghost btn-sm" onClick={load}>Tentar novamente</button>}
      />
    </section>
  </div>;
}
