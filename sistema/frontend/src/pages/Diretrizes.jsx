import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Target } from '@phosphor-icons/react';
import { api, fmtMoney, fmtNum } from '../lib/api';
import DataTable from '../components/DataTable';
import { PageHeader } from '../components/UI';
import { DEMANDA_STATUS } from './DemandaWizard';
import './collections.css';

const faixa = (min, max, f) => min == null && max == null ? '—' : [min != null && `de ${f(min)}`, max != null && `até ${f(max)}`].filter(Boolean).join(' ');

// Diretrizes = premissas de cada demanda ativa. É o que a coluna "Diretrizes" de Imóveis cruza.
export default function Diretrizes() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/demandas').then(d => setList(d.filter(x => !['concluida', 'cancelada'].includes(x.status)))).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const columns = [
    { id: 'demanda', header: 'Demanda / cliente', accessorFn: d => `${d.titulo} ${d.empresa?.nome}`, cell: ({ row: { original: d } }) => <Link className="collection-cell-stack collection-title-link" to={`/demandas/${d.id}`}><strong>{d.titulo}</strong><small>{d.empresa?.nome}</small></Link> },
    { accessorKey: 'regioesInteresse', header: 'Regiões', cell: ({ getValue }) => getValue() || '—' },
    { id: 'area', header: 'Área (m²)', accessorFn: d => Number(d.areaMinima || 0), cell: ({ row: { original: d } }) => faixa(d.areaMinima, d.areaMaxima, v => fmtNum(v)) },
    { id: 'medidas', header: 'Frente · pé-direito · vagas', accessorFn: d => `${d.frenteMinima || ''} ${d.peDireitoMinimo || ''}`, cell: ({ row: { original: d } }) => [d.frenteMinima != null && `${fmtNum(d.frenteMinima)} m`, d.peDireitoMinimo != null && `${fmtNum(d.peDireitoMinimo)} m`, d.vagasMinimas != null && `${d.vagasMinimas} vagas`].filter(Boolean).join(' · ') || '—' },
    { id: 'valor', header: 'Aluguel / compra', accessorFn: d => Number(d.aluguelMaximo || d.compraMaxima || 0), cell: ({ row: { original: d } }) => d.tipo === 'aquisicao' ? faixa(d.compraMinima, d.compraMaxima, fmtMoney) : faixa(d.aluguelMinimo, d.aluguelMaximo, fmtMoney) },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => DEMANDA_STATUS[getValue()] },
  ];

  return <div className="collection-page">
    <PageHeader eyebrow="INSTITUCIONAL" title="Diretrizes" description="Premissas de localização, dimensões e valores de cada demanda ativa." />
    <section className="panel collection-panel">
      <div className="collection-section-head">
        <div><h2>Diretrizes de expansão</h2><p>Para ver quais imóveis atendem cada diretriz, use a coluna “Diretrizes” em <Link to="/imoveis">Imóveis</Link>.</p></div>
        <span className="collection-section-symbol"><Target size={22} /></span>
      </div>
      <DataTable columns={columns} data={list} loading={loading} error={error} searchPlaceholder="Buscar demanda, cliente ou região..." exportName="diretrizes.csv" emptyTitle="Nenhuma demanda ativa" emptyDescription="Cadastre uma demanda e defina as premissas do cliente." />
    </section>
  </div>;
}
