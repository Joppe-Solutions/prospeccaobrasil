import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Buildings } from '@phosphor-icons/react';
import { api, fmtNum, STATUS } from '../lib/api';
import FormWizard, { WizardReview } from '../components/FormWizard';

const CATEGORIAS = { loja: 'Loja', predio: 'Prédio', terreno: 'Terreno', outro: 'Outro' };

const SELECTS = {
  tipo: [['locacao', 'Locação'], ['venda', 'Venda']],
  status: [['disponivel', 'Disponível'], ['negociacao', 'Em negociação'], ['locado', 'Locado'], ['vendido', 'Vendido'], ['inativo', 'Inativo']],
  categoria: Object.entries(CATEGORIAS),
};

const STEPS = [
  { id: 'identificacao', title: 'Identificação', subtitle: 'Código e situação', heading: 'Como o imóvel se apresenta', description: 'Informações básicas usadas nas listagens e na apresentação pública.',
    fields: [
      { k: 'codigo', l: 'Código', ph: 'PB-007' }, { k: 'titulo', l: 'Título interno', ph: 'Ex.: Esquina Loja A' },
      { k: 'tipo', l: 'Tipo', type: 'select' }, { k: 'categoria', l: 'Categoria', type: 'select' },
      { k: 'status', l: 'Status', type: 'select' },
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
  { id: 'vinculos', title: 'Vínculos', subtitle: 'Proprietário e links', heading: 'Proprietário, parceiro e links', description: 'Vínculos cadastrados, contato legado e links de Google Maps/Drive.',
    fields: [
      { k: 'proprietarioId', l: 'Proprietário (cadastro)', type: 'select', optionsKey: 'proprietarios', full: true },
      { k: 'parceiroId', l: 'Parceiro (quem trouxe)', type: 'select', optionsKey: 'parceiros', full: true },
      { k: 'proprietario', l: 'Proprietário (texto legado)', full: true }, { k: 'telProprietario', l: 'Tel. proprietário' },
      { k: 'googleMapsUrl', l: 'Link Google Maps', type: 'url', full: true }, { k: 'googleDriveUrl', l: 'Link Google Drive (fotos)', type: 'url', full: true },
      { k: 'descricao', l: 'Descrição', type: 'textarea', full: true }, { k: 'observacoes', l: 'Observações internas', type: 'textarea', full: true },
    ] },
];

function Field({ def, value, onChange, options }) {
  const selectOptions = def.optionsKey
    ? [['', 'Não vinculado'], ...(options[def.optionsKey] || []).map(o => [String(o.id), o.nome])]
    : SELECTS[def.k];
  return <div className={`wz-field ${def.full ? 'wz-full' : ''}`}>
    <label htmlFor={`wz-${def.k}`}>{def.l}{def.req && <span className="wz-required">*</span>}</label>
    {def.type === 'select'
      ? <select id={`wz-${def.k}`} value={value ?? ''} onChange={e => onChange(e.target.value)}>{selectOptions.map(([v, l]) => <option key={v || '_'} value={v}>{l}</option>)}</select>
      : def.type === 'textarea'
        ? <textarea id={`wz-${def.k}`} value={value || ''} onChange={e => onChange(e.target.value)} />
        : <input id={`wz-${def.k}`} type={def.type || 'text'} step="any" placeholder={def.ph || ''} value={value ?? ''} onChange={e => onChange(e.target.value)} required={def.req} />}
  </div>;
}

export default function ImovelWizard() {
  const { id } = useParams();
  const nav = useNavigate();
  const [form, setForm] = useState({ tipo: 'locacao', status: 'disponivel', categoria: 'loja', uf: 'RJ', proprietarioId: '', parceiroId: '' });
  const [options, setOptions] = useState({ proprietarios: [], parceiros: [] });
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    Promise.all([
      api('/proprietarios').catch(() => []),
      api('/parceiros').catch(() => []),
    ]).then(([proprietarios, parceiros]) => setOptions({
      proprietarios: (proprietarios || []).filter(p => p.status === 'ativo'),
      parceiros: (parceiros || []).filter(p => p.status === 'ativo'),
    }));
  }, []);

  useEffect(() => {
    if (!id) return;
    api(`/imoveis/${id}`).then(data => setForm({
      ...data,
      proprietarioId: data.proprietarioId ?? '',
      parceiroId: data.parceiroId ?? '',
      categoria: data.categoria || 'loja',
    })).catch(e => setErr(e.message)).finally(() => setLoading(false));
  }, [id]);

  const close = () => nav(-1);

  const propNome = options.proprietarios.find(p => String(p.id) === String(form.proprietarioId))?.nome
    || form.proprietarioRel?.nome || form.proprietario;
  const parcNome = options.parceiros.find(p => String(p.id) === String(form.parceiroId))?.nome
    || form.parceiro?.nome;

  const steps = useMemo(() => [
    ...STEPS.map(step => ({
      ...step,
      content: <div className="wz-grid">{step.fields.map(def => (
        <Field key={def.k} def={def} value={form[def.k]} options={options}
          onChange={v => setForm(f => ({ ...f, [def.k]: v }))} />
      ))}</div>,
    })),
    { id: 'revisao', title: 'Revisão', subtitle: 'Conferir e salvar', heading: 'Revisar cadastro', description: 'Confira os dados antes de salvar o imóvel.',
      content: ({ goToStep }) => <WizardReview
        title={form.codigo ? `Imóvel ${form.codigo}` : 'Novo imóvel'}
        description="Após salvar, você poderá adicionar fotos, documentos e gerar a apresentação pública."
        onEdit={goToStep}
        sections={[
          { title: 'Identificação', items: [['Código', form.codigo], ['Título', form.titulo], ['Tipo', form.tipo === 'venda' ? 'Venda' : 'Locação'], ['Categoria', CATEGORIAS[form.categoria] || form.categoria], ['Status', STATUS[form.status] || form.status]] },
          { title: 'Endereço', items: [['Logradouro', [form.endereco, form.numero].filter(Boolean).join(', ')], ['Bairro', form.bairro], ['Cidade/UF', [form.cidade, form.uf].filter(Boolean).join(' / ')], ['CEP', form.cep]] },
          { title: 'Dimensões', items: [['Área total', form.areaTotal && `${fmtNum(form.areaTotal)} m²`], ['Área útil', form.areaUtil && `${fmtNum(form.areaUtil)} m²`], ['Piso de venda', form.pisoAreaVenda && `${fmtNum(form.pisoAreaVenda)} m²`], ['Frente', form.frenteImovel && `${fmtNum(form.frenteImovel)} m`]] },
          { title: 'Termos', items: [['Aluguel', form.aluguel && `R$ ${fmtNum(form.aluguel)}`], ['Condomínio', form.condominio && `R$ ${fmtNum(form.condominio)}`], ['IPTU', form.iptu && `R$ ${fmtNum(form.iptu)}`], ['CDU', form.cdu && `R$ ${fmtNum(form.cdu)}`], ['Preço de venda', form.precoVenda && `R$ ${fmtNum(form.precoVenda)}`], ['Contrato', form.periodoContrato]] },
          { title: 'Vínculos', items: [['Proprietário', propNome], ['Parceiro', parcNome]] },
        ]} /> },
  ], [form, options, propNome, parcNome]);

  async function submit() {
    setSaving(true); setErr('');
    try {
      const payload = {
        ...form,
        proprietarioId: form.proprietarioId === '' ? null : form.proprietarioId,
        parceiroId: form.parceiroId === '' ? null : form.parceiroId,
      };
      const saved = id
        ? await api(`/imoveis/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
        : await api('/imoveis', { method: 'POST', body: JSON.stringify(payload) });
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
