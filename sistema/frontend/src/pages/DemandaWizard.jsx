import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Target } from '@phosphor-icons/react';
import { api } from '../lib/api';
import FormWizard, { WizardReview } from '../components/FormWizard';
import BusinessFields from '../components/BusinessFields';
export const TIPOS = {locacao:'Locação',aquisicao:'Aquisição',passagem_ponto:'Passagem de ponto',implantacao:'Implantação'};
export const DEMANDA_STATUS = {aberta:'Aberta',contratada:'Contratada',em_andamento:'Em andamento',concluida:'Concluída',cancelada:'Cancelada'};
const PURPOSES={expansao_redes:'Expansão de redes',ocupacao:'Ocupação direta',investimento:'Investimento',outro:'Outro'};
const sections=[
 ['demanda','Demanda','Objetivo e regiões', [['empresaId','Empresa','select',true],['titulo','Título da demanda','text',true],['tipo','Tipo de demanda','select',true],['finalidade','Finalidade','select',true],['objetivo','Objetivo','textarea'],['unidades','Unidades desejadas','number'],['prazo','Prazo desejado','date'],['regioesInteresse','Cidades, bairros e áreas prioritárias','textarea'],['perfilImovel','Perfil do imóvel','select']]],
 ['diretrizes','Diretrizes','Premissas técnicas', [['areaMinima','Área mínima (m²)','number'],['areaMaxima','Área máxima (m²)','number'],['frenteMinima','Frente mínima (m)','number'],['peDireitoMinimo','Pé-direito mínimo (m)','number'],['vagasMinimas','Vagas mínimas','number'],['acessibilidade','Acessibilidade exigida','textarea'],['exigencias','Demais exigências técnicas','textarea'],['restricoes','Atividades, localizações e características não aceitas','textarea']]],
 ['condicoes','Condições','Orçamento e negociação', [['aluguelMinimo','Aluguel mínimo (R$/mês)','number'],['aluguelMaximo','Aluguel máximo (R$/mês)','number'],['compraMinima','Compra mínima (R$)','number'],['compraMaxima','Compra máxima (R$)','number'],['cdu','CDU prevista (R$)','number'],['luvas','Luvas previstas (R$)','number'],['valorPonto','Passagem de ponto (R$)','number'],['carenciaMeses','Carência (meses)','number'],['investimento','Investimento previsto (R$)','number']]],
 ['acompanhamento','Acompanhamento','Responsáveis e próxima ação', [['responsavelEmpresa','Responsável da empresa'],['consultor','Consultor Prospecção Brasil'],['inicioEm','Data de início','date'],['status','Status','select',true],['proximaAcao','Próxima ação'],['proximaAcaoEm','Data da próxima ação','date'],['observacoes','Observações','textarea']]],
];
export default function DemandaWizard(){
 const {id}=useParams();const nav=useNavigate();const [search]=useSearchParams();
 const [form,setForm]=useState({empresaId:search.get('empresaId')||'',tipo:'locacao',finalidade:'expansao_redes',status:'aberta'});
 const [empresas,setEmpresas]=useState([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [saving,setSaving]=useState(false);
 useEffect(()=>{Promise.all([api('/empresas'),id?api(`/demandas/${id}`):Promise.resolve(null)]).then(([es,d])=>{setEmpresas(es);if(d)setForm(d);}).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[id]);
 const options=useMemo(()=>({empresaId:empresas.map(e=>[e.id,e.nome]),tipo:Object.entries(TIPOS),status:Object.entries(DEMANDA_STATUS),finalidade:Object.entries(PURPOSES),perfilImovel:Object.entries({loja:'Loja',terreno:'Terreno',predio:'Prédio',outro:'Outro ativo'})}),[empresas]);
 const steps=sections.map(([sid,title,heading,fields])=>({id:sid,title,heading,subtitle:heading,content:<BusinessFields fields={fields} form={form} options={options} onChange={(k,v)=>setForm(f=>({...f,[k]:v}))}/>}));
 steps.push({id:'revisao',title:'Revisão',heading:'Confira a demanda',content:({goToStep})=><WizardReview title={form.titulo||'Nova demanda'} onEdit={goToStep} sections={sections.map(([,title,,fields])=>({title,items:fields.map(([key,label])=>[label,options[key]?.find(([v])=>String(v)===String(form[key]))?.[1]||form[key]])}))}/>});
 async function save(){setSaving(true);setError('');try{const data=await api(id?`/demandas/${id}`:'/demandas',{method:id?'PUT':'POST',body:JSON.stringify(form)});nav(`/demandas/${data.id}`,{replace:true});}catch(e){setError(e.message);throw e;}finally{setSaving(false);}}
 return <FormWizard icon={Target} title={id?'Editar demanda':'Nova demanda'} subtitle="Uma empresa pode ter várias demandas independentes." steps={steps} loading={loading} error={error} submitting={saving} onClose={()=>nav(-1)} onSubmit={save} finishLabel="Salvar demanda"/>;
}
