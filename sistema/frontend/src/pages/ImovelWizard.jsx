import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowSquareOut, Buildings, Plus, Trash } from '@phosphor-icons/react';
import { api, enviarFotos, fmtNum, mapsUrl, MAPS_AUTO, STATUS, TIPOS_IMOVEL } from '../lib/api';
import FormWizard, { WizardReview } from '../components/FormWizard';
import PhotoUploader from '../components/PhotoUploader';

const CATEGORIAS = { loja: 'Loja', predio: 'Prédio', terreno: 'Terreno', outro: 'Outro' };

const SELECTS = {
  tipo: Object.entries(TIPOS_IMOVEL),
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
  { id: 'dimensoes', title: 'Dimensões', subtitle: 'Áreas e medidas', heading: 'Dimensões', description: 'Áreas por pavimento ou ambiente e medidas exibidas no bloco "Dimensões" da apresentação.',
    fields: [
      { k: 'areaUtil', l: 'Área útil (m²)', type: 'number' },
      { k: 'peDireito', l: 'Pé direito (mts)', type: 'number' },
      { k: 'frenteImovel', l: 'Frente do imóvel (mts)', type: 'number' },
      { k: 'vagas', l: 'Vagas de estacionamento', type: 'number' },
      { k: 'acessibilidade', l: 'Acessibilidade', type: 'textarea', full: true },
      { k: 'infraestrutura', l: 'Infraestrutura e estado de conservação', type: 'textarea', full: true },
      { k: 'restricoesUso', l: 'Restrições de uso / atividades permitidas', type: 'textarea', full: true },
    ] },
  { id: 'termos', title: 'Termos', subtitle: 'Valores e contrato', heading: 'Termos comerciais', description: 'Valores mensais e condições que aparecem no bloco "Termos comerciais".',
    fields: [
      { k: 'cdu', l: 'CDU — cessão de direito de uso (R$)', type: 'number' }, { k: 'aluguel', l: 'Aluguel (R$)', type: 'number' },
      { k: 'iptu', l: 'IPTU (R$)', type: 'number' }, { k: 'condominio', l: 'Condomínio (R$)', type: 'number' },
      { k: 'luvas', l: 'Luvas (R$)', type: 'number' }, { k: 'carenciaMeses', l: 'Carência (meses)', type: 'number' },
      { k: 'precoVenda', l: 'Preço de venda (R$)', type: 'number' }, { k: 'periodoContrato', l: 'Período de contrato', ph: '5 anos' },
    ] },
  { id: 'vinculos', title: 'Vínculos', subtitle: 'Proprietário e parceiro', heading: 'Proprietário, parceiro e observações', description: 'Quem é o dono, quem trouxe o imóvel e o texto usado na apresentação.',
    fields: [
      { k: 'proprietarioId', l: 'Proprietário (cadastro)', type: 'select', optionsKey: 'proprietarios', full: true },
      { k: 'parceiroId', l: 'Parceiro (quem trouxe)', type: 'select', optionsKey: 'parceiros', full: true },
      { k: 'descricao', l: 'Descrição', type: 'textarea', full: true }, { k: 'observacoes', l: 'Observações internas', type: 'textarea', full: true },
    ] },
];

const SUGESTOES_AREA = ['Térreo', '1º piso', '2º piso', '3º piso', 'Piso área de venda', 'Jirau', 'Mezanino', 'Subsolo', 'Depósito', 'Área externa'];
const somaAreas = areas => Math.round(areas.reduce((n, a) => n + (Number(a.area) || 0), 0) * 100) / 100;

// Composição de áreas (quantas linhas o imóvel precisar) + ABL sugerida pela soma.
function Dimensoes({ form, setForm, ablAuto, setAblAuto }) {
  const areas = form.areas;
  const soma = somaAreas(areas);
  const setAreas = next => setForm(f => ({ ...f, areas: next, ...(ablAuto ? { areaTotal: somaAreas(next) || '' } : {}) }));
  const editar = (index, campo, valor) => setAreas(areas.map((a, n) => n === index ? { ...a, [campo]: valor } : a));
  const usarSoma = () => { setAblAuto(true); setForm(f => ({ ...f, areaTotal: soma || '' })); };
  return <>
    <div className="wz-field wz-full">
      <label id="wz-areas-label">Áreas por pavimento ou ambiente</label>
      <small>Adicione uma linha para cada andar ou espaço: térreo, 2º piso, jirau, mezanino, depósito…</small>
      <ul className="wz-areas" aria-labelledby="wz-areas-label">
        {areas.map((a, index) => <li key={index}>
          <input aria-label={`Nome da área ${index + 1}`} list="wz-areas-sugestoes" placeholder="Ex.: 2º piso" maxLength={60} value={a.nome} onChange={e => editar(index, 'nome', e.target.value)} required={a.area !== '' && a.area != null} />
          <input aria-label={`Metragem da área ${index + 1} (m²)`} type="number" step="any" min="0" placeholder="m²" value={a.area ?? ''} onChange={e => editar(index, 'area', e.target.value)} required={!!a.nome.trim()} />
          <button type="button" className="icon-button" aria-label={`Remover área ${index + 1}`} onClick={() => setAreas(areas.filter((_, n) => n !== index))}><Trash size={16} /></button>
        </li>)}
      </ul>
      <datalist id="wz-areas-sugestoes">{SUGESTOES_AREA.map(s => <option key={s} value={s} />)}</datalist>
      <div><button type="button" className="btn btn-ghost btn-sm" onClick={() => setAreas([...areas, { nome: '', area: '' }])}><Plus size={15} /> Adicionar área</button></div>
    </div>
    <div className="wz-field">
      <label htmlFor="wz-areaTotal">Área Bruta Locável — ABL (m²)</label>
      <input id="wz-areaTotal" type="number" step="any" min="0" value={form.areaTotal ?? ''} onChange={e => { setAblAuto(false); setForm(f => ({ ...f, areaTotal: e.target.value })); }} />
      {ablAuto
        ? <small>Sugerida pela soma das áreas acima. Você pode alterar.</small>
        : soma > 0 && soma !== Number(form.areaTotal)
          ? <small>Soma das áreas: {fmtNum(soma)} m². <button type="button" className="wz-link" onClick={usarSoma}>Usar a soma</button></small>
          : null}
    </div>
  </>;
}

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
  const [form, setForm] = useState({ tipo: 'locacao', status: 'disponivel', categoria: 'loja', uf: 'RJ', proprietarioId: '', parceiroId: '', areas: [{ nome: '', area: '' }] });
  const [ablAuto, setAblAuto] = useState(true);
  const [options, setOptions] = useState({ proprietarios: [], parceiros: [] });
  // Fotos: tudo é aplicado ao salvar (cancelar o formulário descarta as mudanças)
  const [fotos, setFotos] = useState([]);
  const [pendentes, setPendentes] = useState([]);
  const [capa, setCapa] = useState('');
  const savedId = useRef(id ? +id : null);
  const seq = useRef(0);
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
    api(`/imoveis/${id}`).then(data => {
      const areas = (data.areas || []).map(a => ({ nome: a.nome, area: a.area }));
      setForm({
        ...data, areas,
        proprietarioId: data.proprietarioId ?? '',
        parceiroId: data.parceiroId ?? '',
        categoria: data.categoria || 'loja',
      });
      setAblAuto(data.areaTotal == null || (areas.length > 0 && Number(data.areaTotal) === somaAreas(areas)));
      setFotos(data.fotos || []);
    }).catch(e => setErr(e.message)).finally(() => setLoading(false));
  }, [id]);

  const pendentesRef = useRef(pendentes);
  pendentesRef.current = pendentes;
  useEffect(() => () => pendentesRef.current.forEach(p => URL.revokeObjectURL(p.src)), []);

  const close = () => nav(-1);

  const propNome = options.proprietarios.find(p => String(p.id) === String(form.proprietarioId))?.nome
    || form.proprietarioRel?.nome;
  const parcNome = options.parceiros.find(p => String(p.id) === String(form.parceiroId))?.nome
    || form.parceiro?.nome;

  const mapa = mapsUrl(form);
  const mapaManual = !!form.googleMapsUrl && !form.googleMapsUrl.startsWith(MAPS_AUTO);
  const itensFoto = [
    ...fotos.map(f => ({ key: `e:${f.id}`, src: `/uploads/${f.arquivo}`, principal: f.principal })),
    ...pendentes.map(p => ({ key: p.key, src: p.src, pendente: true })),
  ];
  const capaKey = itensFoto.some(f => f.key === capa) ? capa : (itensFoto.find(f => f.principal) || itensFoto[0])?.key;
  const removerFoto = key => {
    if (key.startsWith('e:')) return setFotos(list => list.filter(f => `e:${f.id}` !== key));
    setPendentes(list => list.filter(p => { if (p.key === key) URL.revokeObjectURL(p.src); return p.key !== key; }));
  };

  const steps = [
    ...STEPS.map(step => ({
      ...step,
      content: <div className="wz-grid">
        {step.id === 'dimensoes' && <Dimensoes form={form} setForm={setForm} ablAuto={ablAuto} setAblAuto={setAblAuto} />}
        {step.fields.map(def => (
          <Field key={def.k} def={def} value={form[def.k]} options={options}
            onChange={v => setForm(f => ({ ...f, [def.k]: v }))} />
        ))}
        {step.id === 'endereco' && <div className="wz-field wz-full">
          <label>Link do Google Maps</label>
          {mapa
            ? <a className="wz-link" href={mapa} target="_blank" rel="noopener noreferrer">Conferir a localização no Google Maps <ArrowSquareOut size={13} /></a>
            : <small>Preencha o endereço: o link é gerado automaticamente.</small>}
          <small>{mapaManual
            ? <>Este imóvel usa um link colado manualmente. <button type="button" className="wz-link" onClick={() => setForm(f => ({ ...f, googleMapsUrl: '' }))}>Gerar pelo endereço</button></>
            : 'Gerado pelo endereço e salvo junto com o cadastro; acompanha as alterações.'}</small>
        </div>}
      </div>,
    })),
    { id: 'fotos', title: 'Fotos', subtitle: 'Capa e galeria', heading: 'Fotos do imóvel', description: 'A capa aparece na lista, no detalhe e na apresentação. As demais formam a galeria pública.',
      content: <PhotoUploader items={itensFoto.map(f => ({ ...f, capa: f.key === capaKey }))} onCover={setCapa} onRemove={removerFoto}
        onAdd={files => setPendentes(list => [...list, ...files.map(file => ({ key: `p:${seq.current++}`, file, src: URL.createObjectURL(file) }))])}
        hint="JPEG, PNG ou WebP até 15 MB. As fotos são enviadas quando você salvar o cadastro." /> },
    { id: 'revisao', title: 'Revisão', subtitle: 'Conferir e salvar', heading: 'Revisar cadastro', description: 'Confira os dados antes de salvar o imóvel.',
      content: ({ goToStep }) => <WizardReview
        title={form.codigo ? `Imóvel ${form.codigo}` : 'Novo imóvel'}
        description="Após salvar, você poderá adicionar documentos e gerar a apresentação pública."
        onEdit={goToStep}
        sections={[
          { title: 'Identificação', items: [['Código', form.codigo], ['Título', form.titulo], ['Tipo', TIPOS_IMOVEL[form.tipo]], ['Categoria', CATEGORIAS[form.categoria] || form.categoria], ['Status', STATUS[form.status] || form.status]] },
          { title: 'Endereço', items: [['Logradouro', [form.endereco, form.numero].filter(Boolean).join(', ')], ['Bairro', form.bairro], ['Cidade/UF', [form.cidade, form.uf].filter(Boolean).join(' / ')], ['CEP', form.cep]] },
          { title: 'Dimensões', items: [['ABL', form.areaTotal && `${fmtNum(form.areaTotal)} m²`], ['Área útil', form.areaUtil && `${fmtNum(form.areaUtil)} m²`], ['Áreas', form.areas.filter(a => a.nome.trim() && a.area !== '').map(a => `${a.nome.trim()}: ${fmtNum(a.area)} m²`).join(' · ')], ['Pé direito', form.peDireito && `${fmtNum(form.peDireito)} m`], ['Frente', form.frenteImovel && `${fmtNum(form.frenteImovel)} m`], ['Vagas', form.vagas], ['Acessibilidade', form.acessibilidade], ['Infraestrutura', form.infraestrutura], ['Restrições', form.restricoesUso]] },
          { title: 'Termos', items: [['CDU', form.cdu && `R$ ${fmtNum(form.cdu)}`], ['Aluguel', form.aluguel && `R$ ${fmtNum(form.aluguel)}`], ['IPTU', form.iptu && `R$ ${fmtNum(form.iptu)}`], ['Condomínio', form.condominio && `R$ ${fmtNum(form.condominio)}`], ['Luvas', form.luvas && `R$ ${fmtNum(form.luvas)}`], ['Carência (meses)', form.carenciaMeses], ['Preço de venda', form.precoVenda && `R$ ${fmtNum(form.precoVenda)}`], ['Contrato', form.periodoContrato]] },
          { title: 'Vínculos', items: [['Proprietário', propNome], ['Parceiro', parcNome], ['Descrição', form.descricao], ['Observações internas', form.observacoes]] },
          { title: 'Fotos', items: [['Fotos', itensFoto.length ? `${itensFoto.length} ${itensFoto.length === 1 ? 'foto' : 'fotos'}${pendentes.length ? ` (${pendentes.length} a enviar)` : ''}` : '']] },
        ]} /> },
  ];

  // Fotos são sincronizadas depois que o imóvel existe: remove, envia e define a capa.
  async function salvarFotos(imovelId, originais) {
    const mantidas = new Set(fotos.map(f => f.id));
    for (const f of originais.filter(o => !mantidas.has(o.id))) await api(`/imoveis/${imovelId}/fotos/${f.id}`, { method: 'DELETE' });
    const criadas = await enviarFotos(imovelId, pendentes.map(p => p.file));
    const enviadas = pendentes.map((p, n) => ({ key: p.key, id: criadas[n]?.id }));
    pendentes.forEach(p => URL.revokeObjectURL(p.src));
    setPendentes([]);
    const capaId = capaKey?.startsWith('e:') ? +capaKey.slice(2) : enviadas.find(e => e.key === capaKey)?.id;
    if (capaId) await api(`/imoveis/${imovelId}/fotos/${capaId}/principal`, { method: 'POST' });
  }

  async function submit() {
    setSaving(true); setErr('');
    try {
      const payload = {
        ...form,
        proprietarioId: form.proprietarioId === '' ? null : form.proprietarioId,
        parceiroId: form.parceiroId === '' ? null : form.parceiroId,
      };
      // Se as fotos falharem depois de criar o imóvel, tentar de novo atualiza em vez de duplicar
      const saved = savedId.current
        ? await api(`/imoveis/${savedId.current}`, { method: 'PUT', body: JSON.stringify(payload) })
        : await api('/imoveis', { method: 'POST', body: JSON.stringify(payload) });
      savedId.current = saved.id;
      const originais = id ? (await api(`/imoveis/${saved.id}`)).fotos : [];
      await salvarFotos(saved.id, originais);
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
