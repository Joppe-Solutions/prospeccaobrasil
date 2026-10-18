import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Storefront, X } from '@phosphor-icons/react';
import { api, fmtNum } from '../lib/api';
import FormWizard, { WizardReview } from '../components/FormWizard';
import { CampoNumerico } from '../components/NumberFields';
import { juntarBairros, listaBairros } from '../lib/bairros';

const STEPS = [
  { id: 'empresa', title: 'Empresa', subtitle: 'Identidade e segmento', heading: 'Quem é a empresa', description: 'Dados institucionais usados nas listagens e no match com imóveis.',
    fields: [
      { k: 'razaoSocial', l: 'Razão social', full: true },
      { k: 'endereco', l: 'Endereço da sede', full: true },
      { k: 'nome', l: 'Nome fantasia / empresa', ph: 'Ex.: Rede Farma Sul', req: true, full: true },
      { k: 'segmento', l: 'Segmento', ph: 'Farmácias, moda, pet…' }, { k: 'cnpj', l: 'CNPJ' },
      { k: 'site', l: 'Site', type: 'url' }, { k: 'cidade', l: 'Cidade sede' }, { k: 'uf', l: 'UF' },
    ] },
  { id: 'contato', title: 'Contato', subtitle: 'Pessoa e canais', heading: 'Com quem falamos', description: 'Contato principal para negociações e apresentações.',
    fields: [
      { k: 'contatoNome', l: 'Nome do contato' }, { k: 'contatoCargo', l: 'Cargo' },
      { k: 'telefone', l: 'Telefone' }, { k: 'email', l: 'E-mail', type: 'email' },
    ] },
  { id: 'perfil', title: 'Perfil buscado', subtitle: 'Premissas do cliente', heading: 'O que a empresa procura', description: 'Faixa de área e bairros de interesse: o detalhe de cada imóvel mostra os clientes compatíveis.',
    fields: [
      { k: 'areaMinima', l: 'Área mínima (m²)', fmt: 'decimal' }, { k: 'areaMaxima', l: 'Área máxima (m²)', fmt: 'decimal' },
      { k: 'regioesInteresse', type: 'bairros' },
      { k: 'perfilLoja', l: 'Perfil de loja buscado', type: 'textarea', full: true },
      { k: 'observacoes', l: 'Observações', type: 'textarea', full: true },
    ] },
];

// Lista dinâmica: um bairro por linha, com adicionar/remover. Salvo como "Méier; Tijuca".
function BairrosInteresse({ value, onChange }) {
  const [linhas, setLinhas] = useState(() => { const l = listaBairros(value); return l.length ? l : ['']; });
  useEffect(() => { const l = listaBairros(value); if (juntarBairros(l) !== juntarBairros(linhas)) setLinhas(l.length ? l : ['']); }, [value]);
  const mudar = (novas) => { setLinhas(novas); onChange(juntarBairros(novas)); };
  return <div className="wz-field wz-full">
    <label htmlFor="wz-bairro-0">Bairros de interesse</label>
    <ul className="wz-areas wz-bairros">
      {linhas.map((b, n) => <li key={n}>
        <input id={`wz-bairro-${n}`} aria-label={`Bairro de interesse ${n + 1}`} value={b} placeholder="Ex.: Méier" onChange={e => mudar(linhas.map((x, k) => k === n ? e.target.value : x))}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); mudar([...linhas, '']); } }} />
        <button type="button" className="icon-button" aria-label={`Remover bairro ${n + 1}`} disabled={linhas.length === 1 && !b} onClick={() => mudar(linhas.length === 1 ? [''] : linhas.filter((_, k) => k !== n))}><X size={16} /></button>
      </li>)}
    </ul>
    <small><button type="button" className="wz-link" onClick={() => mudar([...linhas, ''])}><Plus size={12} /> Adicionar bairro</button></small>
  </div>;
}

function Field({ def, value, onChange }) {
  if (def.type === 'bairros') return <BairrosInteresse value={value} onChange={onChange} />;
  return <div className={`wz-field ${def.full ? 'wz-full' : ''}`}>
    <label htmlFor={`wz-${def.k}`}>{def.l}{def.req && <span className="wz-required">*</span>}</label>
    {def.type === 'textarea'
      ? <textarea id={`wz-${def.k}`} value={value || ''} onChange={e => onChange(e.target.value)} />
      : def.fmt
        ? <CampoNumerico id={`wz-${def.k}`} formato={def.fmt} value={value ?? ''} onChange={onChange} required={def.req} />
        : <input id={`wz-${def.k}`} type={def.type || 'text'} placeholder={def.ph || ''} value={value ?? ''} onChange={e => onChange(e.target.value)} required={def.req} />}
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
        description="As premissas indicam este cliente como compatível no detalhe de cada imóvel."
        onEdit={goToStep}
        sections={[
          { title: 'Empresa', items: [['Nome fantasia', form.nome], ['Razão social', form.razaoSocial], ['Endereço', form.endereco], ['Segmento', form.segmento], ['CNPJ', form.cnpj], ['Sede', [form.cidade, form.uf].filter(Boolean).join(' / ')]] },
          { title: 'Contato', items: [['Contato', form.contatoNome], ['Cargo', form.contatoCargo], ['Telefone', form.telefone], ['E-mail', form.email]] },
          { title: 'Perfil buscado', items: [['Área', form.areaMinima || form.areaMaxima ? `${fmtNum(form.areaMinima)} – ${fmtNum(form.areaMaxima)} m²` : ''], ['Bairros de interesse', listaBairros(form.regioesInteresse).join(', ')], ['Perfil', form.perfilLoja]] },
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
