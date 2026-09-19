import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Buildings } from '@phosphor-icons/react';
import { api, fmtNum, STATUS } from '../lib/api';
import FormWizard, { WizardReview } from '../components/FormWizard';

const SELECTS = {
  tipo: [['locacao', 'Locação'], ['venda', 'Venda']],
  status: [['disponivel', 'Disponível'], ['negociacao', 'Em negociação'], ['locado', 'Locado'], ['vendido', 'Vendido'], ['inativo', 'Inativo']],
};

const STEPS = [
  { id: 'identificacao', title: 'Identificação', subtitle: 'Código e situação', heading: 'Como o imóvel se apresenta', description: 'Informações básicas usadas nas listagens e na apresentação pública.',
    fields: [
      { k: 'codigo', l: 'Código', ph: 'PB-007' }, { k: 'titulo', l: 'Título interno', ph: 'Ex.: Esquina Loja A' },
      { k: 'tipo', l: 'Tipo', type: 'select' }, { k: 'status', l: 'Status', type: 'select' },
    ] },
  { id: 'endereco', title: 'Endereço', subtitle: 'Localização do ponto', heading: 'Onde fica o imóvel', description: 'Endereço exibido no documento de apresentação enviado aos clientes.',
    fields: [
      { k: 'endereco', l: 'Logradouro', ph: 'Av. Cônego Vasconcelos', full: true, req: true }, { k: 'numero', l: 'Número' }, { k: 'complemento', l: 'Complemento', ph: 'Loja A' },
      { k: 'bairro', l: 'Bairro' }, { k: 'cidade', l: 'Cidade', req: true }, { k: 'uf', l: 'UF' }, { k: 'cep', l: 'CEP' },
    ] },
  { id: 'dimensoes', title: 'Dimensões', subtitle: 'Áreas e medidas', heading: 'Dimensões do ponto', description: 'Áreas e medidas exibidas no bloco "Dimensões" da apresentação.',
    fields: [
      { k: 'areaTotal', l: 'Área total (m²)', type: 'number' }, { k: 'areaUtil', l: 'Área útil (m²)', type: 'number' },
      { k: 'pisoAreaVenda', l: 'Piso área de venda (m²)', type: 'number' }, { k: 'jirau', l: 'Jirau (m²)', type: 'number' },
      { k: 'mezanino', l: 'Mezanino (m²)', type: 'number' }, { k: 'peDireito', l: 'Pé direito (mts)', type: 'number' },
      { k: 'frenteImovel', l: 'Frente do imóvel (mts)', type: 'number' },
    ] },
  { id: 'termos', title: 'Termos', subtitle: 'Valores e contrato', heading: 'Termos comerciais', description: 'Valores mensais e condições que aparecem no bloco "Termos comerciais".',
    fields: [
      { k: 'aluguel', l: 'Aluguel (R$)', type: 'number' }, { k: 'condominio', l: 'Condomínio (R$)', type: 'number' },
      { k: 'iptu', l: 'IPTU (R$)', type: 'number' }, { k: 'cdu', l: 'CDU / Luvas (R$)', type: 'number' },
      { k: 'precoVenda', l: 'Preço de venda (R$)', type: 'number' }, { k: 'periodoContrato', l: 'Período de contrato', ph: '5 anos' },
    ] },
  { id: 'vinculos', title: 'Vínculos', subtitle: 'Proprietário e links', heading: 'Proprietário e links', description: 'Contato do proprietário e links de Google Maps/Drive usados na apresentação.',
    fields: [
      { k: 'proprietario', l: 'Proprietário', full: true }, { k: 'telProprietario', l: 'Tel. proprietário' },
      { k: 'googleMapsUrl', l: 'Link Google Maps', type: 'url', full: true }, { k: 'googleDriveUrl', l: 'Link Google Drive (fotos)', type: 'url', full: true },
      { k: 'descricao', l: 'Descrição', type: 'textarea', full: true }, { k: 'observacoes', l: 'Observações internas', type: 'textarea', full: true },
    ] },
];

function Field({ def, value, onChange }) {
  return <div className={`wz-field ${def.full ? 'wz-full' : ''}`}>
    <label htmlFor={`wz-${def.k}`}>{def.l}{def.req && <span className="wz-required">*</span>}</label>
    {def.type === 'select'
      ? <select id={`wz-${def.k}`} value={value || ''} onChange={e => onChange(e.target.value)}>{SELECTS[def.k].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      : def.type === 'textarea'
        ? <textarea id={`wz-${def.k}`} value={value || ''} onChange={e => onChange(e.target.value)} />
        : <input id={`wz-${def.k}`} type={def.type || 'text'} step="any" placeholder={def.ph || ''} value={value ?? ''} onChange={e => onChange(e.target.value)} required={def.req} />}
  </div>;
}

export default function ImovelWizard() {
  const { id } = useParams();
  const nav = useNavigate();
  const [form, setForm] = useState({ tipo: 'locacao', status: 'disponivel', uf: 'RJ' });
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!id) return;
    api(`/imoveis/${id}`).then(setForm).catch(e => setErr(e.message)).finally(() => setLoading(false));
  }, [id]);

  const close = () => nav(-1);

  const steps = useMemo(() => [
    ...STEPS.map(step => ({ ...step, content: <div className="wz-grid">{step.fields.map(def => <Field key={def.k} def={def} value={form[def.k]} onChange={v => setForm(f => ({ ...f, [def.k]: v }))} />)}</div> })),
    { id: 'revisao', title: 'Revisão', subtitle: 'Conferir e salvar', heading: 'Revisar cadastro', description: 'Confira os dados antes de salvar o imóvel.',
      content: ({ goToStep }) => <WizardReview
        title={form.codigo ? `Imóvel ${form.codigo}` : 'Novo imóvel'}
        description="Após salvar, você poderá adicionar fotos, documentos e gerar a apresentação pública."
        onEdit={goToStep}
        sections={[
          { title: 'Identificação', items: [['Código', form.codigo], ['Título', form.titulo], ['Tipo', form.tipo === 'venda' ? 'Venda' : 'Locação'], ['Status', STATUS[form.status] || form.status]] },
          { title: 'Endereço', items: [['Logradouro', [form.endereco, form.numero].filter(Boolean).join(', ')], ['Bairro', form.bairro], ['Cidade/UF', [form.cidade, form.uf].filter(Boolean).join(' / ')], ['CEP', form.cep]] },
          { title: 'Dimensões', items: [['Área total', form.areaTotal && `${fmtNum(form.areaTotal)} m²`], ['Área útil', form.areaUtil && `${fmtNum(form.areaUtil)} m²`], ['Piso de venda', form.pisoAreaVenda && `${fmtNum(form.pisoAreaVenda)} m²`], ['Frente', form.frenteImovel && `${fmtNum(form.frenteImovel)} m`]] },
          { title: 'Termos', items: [['Aluguel', form.aluguel && `R$ ${fmtNum(form.aluguel)}`], ['Condomínio', form.condominio && `R$ ${fmtNum(form.condominio)}`], ['IPTU', form.iptu && `R$ ${fmtNum(form.iptu)}`], ['CDU', form.cdu && `R$ ${fmtNum(form.cdu)}`], ['Preço de venda', form.precoVenda && `R$ ${fmtNum(form.precoVenda)}`], ['Contrato', form.periodoContrato]] },
        ]} /> },
  ], [form]);

  async function submit() {
    setSaving(true); setErr('');
    try {
      const saved = id
        ? await api(`/imoveis/${id}`, { method: 'PUT', body: JSON.stringify(form) })
        : await api('/imoveis', { method: 'POST', body: JSON.stringify(form) });
      nav(`/imoveis/${saved.id}`, { replace: true });
    } catch (e) { setErr(e.message); setSaving(false); throw e; }
  }

  return <FormWizard
    icon={Buildings}
    title={id ? 'Editar imóvel' : 'Novo imóvel'}
    subtitle={id ? `Atualizando ${form.codigo || 'cadastro'}` : 'Cadastro de ponto comercial'}
    steps={steps} onClose={close} onSubmit={submit}
    finishLabel={id ? 'Salvar alterações' : 'Cadastrar imóvel'}
    loading={loading} submitting={saving} error={err} />;
}
