import { PESSOA_PARCEIRO, TIPOS_PARCEIRO, UFS } from '../lib/api';
import { documentoValido, mascararDocumento } from '../lib/numeros';

const UF_OPCOES = UFS.map(u => <option key={u} value={u}>{u}</option>);
const juridica = (p) => (p === 'pj' ? 'juridica' : 'fisica');

// Ao trocar o tipo, a pessoa segue o tipo (consultor, advogado e corretor: física; imobiliária: jurídica)
export function mudarTipo(form, tipo) {
  const tipoPessoa = PESSOA_PARCEIRO[tipo] || form.tipoPessoa || 'pf';
  return { ...form, tipo, tipoPessoa, documento: tipoPessoa === form.tipoPessoa ? form.documento : '' };
}

/** Mensagem de erro (ou '') para os campos que dependem do tipo, antes de enviar à API */
export function validarParceiro(form) {
  if (!form.nome?.trim()) return 'Informe o nome.';
  if (form.tipo === 'consultor' && !form.documento) return 'Informe o CPF do consultor.';
  if (form.documento && !documentoValido(form.documento, juridica(form.tipoPessoa))) return form.tipoPessoa === 'pj' ? 'CNPJ inválido: confira os 14 dígitos.' : 'CPF inválido: confira os 11 dígitos.';
  if (['corretor', 'imobiliaria'].includes(form.tipo) && !form.creci) return `Informe o ${form.tipo === 'imobiliaria' ? 'CRECI-PJ' : 'CRECI-PF'}.`;
  if (form.tipo === 'advogado' && !form.oab) return 'Informe o número da OAB.';
  return '';
}

// Campos que mudam com o tipo do parceiro: consultor (CPF), advogado (OAB), corretor (CRECI-PF),
// imobiliária (CRECI-PJ) e indicador (sem registro profissional).
export default function ParceiroCampos({ form, setForm, prefixo = 'parc', Campo = 'div', classe = 'field' }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const pj = form.tipoPessoa === 'pj';
  const docObrigatorio = form.tipo === 'consultor';
  return <>
    <Campo className={classe}><label htmlFor={`${prefixo}-tipo`}>Tipo de parceiro</label>
      <select id={`${prefixo}-tipo`} value={form.tipo} onChange={e => setForm(f => mudarTipo(f, e.target.value))}>{Object.entries(TIPOS_PARCEIRO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Campo>
    {form.tipo === 'indicador' && <Campo className={classe}><label htmlFor={`${prefixo}-pessoa`}>Pessoa</label>
      <select id={`${prefixo}-pessoa`} value={form.tipoPessoa} onChange={e => setForm(f => ({ ...f, tipoPessoa: e.target.value, documento: '' }))}><option value="pf">Pessoa física</option><option value="pj">Pessoa jurídica</option></select></Campo>}
    <Campo className={classe}><label htmlFor={`${prefixo}-nome`}>{pj ? 'Razão social ou nome fantasia' : 'Nome completo'}</label>
      <input id={`${prefixo}-nome`} value={form.nome} onChange={e => set('nome', e.target.value)} /></Campo>
    <Campo className={classe}><label htmlFor={`${prefixo}-doc`}>{pj ? 'CNPJ' : 'CPF'}{!docObrigatorio && <span className="collection-optional"> Opcional</span>}</label>
      <input id={`${prefixo}-doc`} inputMode="numeric" autoComplete="off" value={form.documento} onChange={e => set('documento', mascararDocumento(e.target.value, juridica(form.tipoPessoa)))} /></Campo>
    {['corretor', 'imobiliaria'].includes(form.tipo) && <>
      <Campo className={classe}><label htmlFor={`${prefixo}-creci`}>{form.tipo === 'imobiliaria' ? 'CRECI-PJ' : 'CRECI-PF'}</label>
        <input id={`${prefixo}-creci`} inputMode="numeric" autoComplete="off" value={form.creci} onChange={e => set('creci', e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="Só o número" /></Campo>
      <Campo className={classe}><label htmlFor={`${prefixo}-creci-uf`}>UF do CRECI</label>
        <select id={`${prefixo}-creci-uf`} value={form.creciUf} onChange={e => set('creciUf', e.target.value)}>{UF_OPCOES}</select></Campo>
    </>}
    {form.tipo === 'advogado' && <>
      <Campo className={classe}><label htmlFor={`${prefixo}-oab`}>Número da OAB</label>
        <input id={`${prefixo}-oab`} inputMode="numeric" autoComplete="off" value={form.oab} onChange={e => set('oab', e.target.value.replace(/\D/g, '').slice(0, 7))} placeholder="Ex.: 123456" /></Campo>
      <Campo className={classe}><label htmlFor={`${prefixo}-oab-uf`}>UF da OAB</label>
        <select id={`${prefixo}-oab-uf`} value={form.oabUf} onChange={e => set('oabUf', e.target.value)}>{UF_OPCOES}</select></Campo>
    </>}
  </>;
}
