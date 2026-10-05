import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Target } from '@phosphor-icons/react';
import { api } from '../lib/api';
import DataTable from '../components/DataTable';
import { PageHeader } from '../components/UI';
import { TIPOS, DEMANDA_STATUS } from './DemandaWizard';
import './collections.css';
export default function Demandas(){
 const [list,setList]=useState([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [status,setStatus]=useState('');const [search]=useSearchParams();
 useEffect(()=>{setLoading(true);api(`/demandas${search.get('empresaId')?`?empresaId=${search.get('empresaId')}`:''}`).then(setList).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[search]);
 const columns=[{id:'demanda',header:'Demanda / empresa',accessorFn:d=>`${d.titulo} ${d.empresa?.nome}`,cell:({row:{original:d}})=><Link className="collection-cell-stack collection-title-link" to={`/demandas/${d.id}`}><strong>{d.titulo}</strong><small>{d.empresa?.nome}</small></Link>},{accessorKey:'regioesInteresse',header:'Regiões'},{accessorKey:'tipo',header:'Tipo',cell:({getValue})=>TIPOS[getValue()]},{id:'acompanhamento',header:'Acompanhamento',accessorFn:d=>d.proximaAcao||'',cell:({row:{original:d}})=><span className="collection-cell-stack"><span>{d.proximaAcao||'Próxima ação não definida'}</span><small>{d.proximaAcaoEm||'Sem data'} · {d.oportunidades.length} imóveis apresentados</small></span>},{accessorKey:'status',header:'Status',cell:({getValue})=>DEMANDA_STATUS[getValue()]}];
 return <div className="collection-page"><PageHeader eyebrow="CADASTROS" title="Demandas de Expansão" description="Objetivos independentes por empresa, com premissas e acompanhamento próprios." actions={<Link className="btn btn-gold" to="/demandas/nova"><Plus size={18}/> Nova demanda</Link>}/><section className="panel collection-panel"><div className="collection-section-head"><div><h2>Demandas e contratos</h2><p>{list.length} demandas cadastradas</p></div><Target size={24}/></div><DataTable columns={columns} data={list.filter(d=>!status||d.status===status)} loading={loading} error={error} searchPlaceholder="Buscar demanda, empresa ou região..." emptyTitle="Nenhuma demanda encontrada" emptyDescription="Cadastre uma demanda e defina o que a empresa procura." exportName="demandas.csv" toolbar={<select aria-label="Filtrar status" value={status} onChange={e=>setStatus(e.target.value)}><option value="">Todos os status</option>{Object.entries(DEMANDA_STATUS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>}/></section></div>;
}
