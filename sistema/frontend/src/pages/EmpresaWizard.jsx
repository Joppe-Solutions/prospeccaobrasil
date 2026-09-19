import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Storefront } from '@phosphor-icons/react';
import { api, fmtNum } from '../lib/api';
import FormWizard, { WizardReview } from '../components/FormWizard';

const STEPS = [
  { id: 'empresa', title: 'Empresa', subtitle: 'Identidade e segmento', heading: 'Quem é a empresa', description: 'Dados institucionais usados nas listagens e no match com imóveis.',
    fields: [
      { k: 'nome', l: 'Nome da empresa', ph: 'Ex.: Rede Farma Sul', req: true, full: true },
      { k: 'segmento', l: 'Segmento', ph: 'Farmácias, moda, pet…' }, { k: 'cnpj', l: 'CNPJ' },
      { k: 'site', l: 'Site', type: 'url' }, { k: 'cidade', l: 'Cidade sede' }, { k: 'uf', l: 'UF' },
    ] },
  { id: 'contato', title: 'Contato', subtitle: 'Pessoa e canais', heading: 'Com quem falamos', description: 'Contato principal para negociações e apresentações.',
    fields: [
      { k: 'contatoNome', l: 'Nome do contato' }, { k: 'contatoCargo', l: 'Cargo' },
      { k: 'telefone', l: 'Telefone' }, { k: 'email', l: 'E-mail', type: 'email' },
    ] },
  { id: 'perfil', title: 'Perfil buscado', subtitle: 'Demanda de expansão', heading: 'O que a empresa procura', description: 'Esses dados alimentam o match inteligente com os imóveis disponíveis.',
    fields: [
      { k: 'areaMinima', l: 'Área mínima (m²)', type: 'number' }, { k: 'areaMaxima', l: 'Área máxima (m²)', type: 'number' },
      { k: 'regioesInteresse', l: 'Regiões de interesse', ph: 'Zona Oeste, Barra, Centro…', full: true },
      { k: 'perfilLoja', l: 'Perfil de loja buscado', type: 'textarea', full: true },
      { k: 'observacoes', l: 'Observações', type: 'textarea', full: true },
    ] },
];

function Field({ def, value, onChange }) {
  return <div className={`wz-field ${def.full ? 'wz-full' : ''}`}>
    <label htmlFor={`wz-${def.k}`}>{def.l}{def.req && <span className="wz-required">*</span>}</label>
    {def.type === 'textarea'
      ? <textarea id={`wz-${def.k}`} value={value || ''} onChange={e => onChange(e.target.value)} />
      : <input id={`wz-${def.k}`} type={def.type || 'text'} step="any" placeholder={def.ph || ''} value={value ?? ''} onChange={e => onChange(e.target.value)} required={def.req} />}
  </div>;
}

export default function EmpresaWizard() {
  const { id } = useParams();
  const nav = useNavigate();
  const [form, setForm] = useState({ status: 'ativo' });
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!id) return;
    api(`/empresas/${id}`).then(setForm).catch(e => setErr(e.message)).finally(() => setLoading(false));
  }, [id]);

  const steps = useMemo(() => [
    ...STEPS.map(step => ({ ...step, content: <div className="wz-grid">{step.fields.map(def => <Field key={def.k} def={def} value={form[def.k]} onChange={v => setForm(f => ({ ...f, [def.k]: v }))} />)}</div> })),
    { id: 'revisao', title: 'Revisão', subtitle: 'Conferir e salvar', heading: 'Revisar cadastro', description: 'Confira os dados antes de salvar a empresa.',
      content: ({ goToStep }) => <WizardReview
        title={form.nome || 'Nova empresa'}
        description="O perfil buscado alimenta o match com imóveis na página de detalhes de cada ponto."
        onEdit={goToStep}
        sections={[
          { title: 'Empresa', items: [['Nome', form.nome], ['Segmento', form.segmento], ['CNPJ', form.cnpj], ['Sede', [form.cidade, form.uf].filter(Boolean).join(' / ')]] },
          { title: 'Contato', items: [['Contato', form.contatoNome], ['Cargo', form.contatoCargo], ['Telefone', form.telefone], ['E-mail', form.email]] },
          { title: 'Perfil buscado', items: [['Área', form.areaMinima || form.areaMaxima ? `${fmtNum(form.areaMinima)} – ${fmtNum(form.areaMaxima)} m²` : ''], ['Regiões', form.regioesInteresse], ['Perfil', form.perfilLoja]] },
        ]} /> },
  ], [form]);

  async function submit() {
    setSaving(true); setErr('');
    const body = { ...form };
    ['areaMinima', 'areaMaxima'].forEach(k => body[k] = body[k] === '' || body[k] == null ? null : Number(body[k]));
    try {
      id ? await api(`/empresas/${id}`, { method: 'PUT', body: JSON.stringify(body) })
         : await api('/empresas', { method: 'POST', body: JSON.stringify(body) });
      nav('/empresas', { replace: true });
    } catch (e) { setErr(e.message); setSaving(false); throw e; }
  }

  return <FormWizard
    icon={Storefront}
    title={id ? 'Editar empresa' : 'Nova empresa'}
    subtitle={id ? `Atualizando ${form.nome || 'cadastro'}` : 'Cadastro de marca/empresa'}
    steps={steps} onClose={() => nav(-1)} onSubmit={submit}
    finishLabel={id ? 'Salvar alterações' : 'Cadastrar empresa'}
    loading={loading} submitting={saving} error={err} />;
}
