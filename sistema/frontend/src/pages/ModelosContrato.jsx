import { useCallback, useEffect, useState } from 'react';
import { ArrowSquareOut, FileText, PencilSimple, Plus, Trash } from '@phosphor-icons/react';
import { api, getUser } from '../lib/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { PageHeader } from '../components/UI';
import './collections.css';

const CATEGORIAS = { locacao: 'Locação', compra_venda: 'Compra e venda', passagem_ponto: 'Passagem de ponto', prestacao_servicos: 'Prestação de serviços', confidencialidade: 'Confidencialidade (NDA)', outro: 'Outro' };
const VAZIO = { nome: '', categoria: 'locacao', descricao: '', url: '' };

export default function ModelosContrato() {
  const isAdmin = getUser()?.role === 'admin';
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api('/modelos-contrato').then(setList).catch(e => setError(e.message)).finally(() => setLoading(false)), []);
  useEffect(() => { load(); }, [load]);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function save(e) {
    e.preventDefault(); setBusy(true); setFormError('');
    try {
      await api(form.id ? `/modelos-contrato/${form.id}` : '/modelos-contrato', { method: form.id ? 'PUT' : 'POST', body: JSON.stringify(form) });
      setForm(null); await load();
    } catch (err) { setFormError(err.message); } finally { setBusy(false); }
  }
  async function remove(m) {
    if (!window.confirm(`Excluir o modelo "${m.nome}"?`)) return;
    try { await api(`/modelos-contrato/${m.id}`, { method: 'DELETE' }); await load(); } catch (err) { setError(err.message); }
  }

  const columns = [
    { accessorKey: 'nome', header: 'Modelo', cell: ({ row: { original: m } }) => <span className="collection-cell-stack"><strong>{m.nome}</strong>{m.descricao && <small>{m.descricao}</small>}</span> },
    { accessorKey: 'categoria', header: 'Categoria', accessorFn: m => CATEGORIAS[m.categoria] || m.categoria, cell: ({ getValue }) => <span className="collection-tag">{getValue()}</span> },
    { accessorKey: 'atualizadoEm', header: 'Atualizado em', cell: ({ getValue }) => new Date(getValue()).toLocaleDateString('pt-BR') },
    { id: 'acoes', header: '', enableSorting: false, enableHiding: false, cell: ({ row: { original: m } }) => <div className="collection-row-actions">
      <a className="btn btn-ghost btn-sm" href={m.url} target="_blank" rel="noopener noreferrer"><ArrowSquareOut size={15} /> Abrir</a>
      {isAdmin && <>
        <button type="button" className="icon-button" aria-label={`Editar ${m.nome}`} onClick={() => { setFormError(''); setForm({ ...m, descricao: m.descricao || '' }); }}><PencilSimple size={16} /></button>
        <button type="button" className="icon-button collection-delete" aria-label={`Excluir ${m.nome}`} onClick={() => remove(m)}><Trash size={16} /></button>
      </>}
    </div> },
  ];

  return <div className="collection-page">
    <PageHeader eyebrow="CONHECIMENTO" title="Modelos de contratos" description="Minutas e modelos-padrão para as operações da Prospecção Brasil."
      actions={isAdmin && <button className="btn btn-gold" onClick={() => { setFormError(''); setForm(VAZIO); }}><Plus size={18} weight="bold" /> Novo modelo</button>} />
    <section className="panel collection-panel">
      <div className="collection-section-head">
        <div><h2>Biblioteca de modelos</h2><p>Cada modelo aponta para o arquivo oficial (Drive, OneDrive ou outro link).</p></div>
        <span className="collection-section-symbol"><FileText size={22} /></span>
      </div>
      <DataTable columns={columns} data={list} loading={loading} error={error} searchPlaceholder="Buscar modelo ou categoria..." emptyTitle="Nenhum modelo cadastrado"
        emptyDescription={isAdmin ? 'Clique em “Novo modelo” para adicionar o primeiro.' : 'Peça a um administrador para cadastrar os modelos.'} />
    </section>
    {form && <Modal title={form.id ? 'Editar modelo' : 'Novo modelo de contrato'} onClose={() => !busy && setForm(null)}
      footer={<><button className="btn btn-ghost" disabled={busy} onClick={() => setForm(null)}>Cancelar</button><button form="modelo-form" type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</button></>}>
      <form id="modelo-form" className="collection-modal-form" onSubmit={save}>
        {formError && <div className="alert error" role="alert">{formError}</div>}
        <div className="field"><label htmlFor="mc-nome">Nome do modelo</label><input id="mc-nome" required value={form.nome} onChange={set('nome')} placeholder="Ex.: Contrato de locação comercial" /></div>
        <div className="field"><label htmlFor="mc-categoria">Categoria</label><select id="mc-categoria" value={form.categoria} onChange={set('categoria')}>{Object.entries(CATEGORIAS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        <div className="field"><label htmlFor="mc-url">Link do arquivo</label><input id="mc-url" type="url" required value={form.url} onChange={set('url')} placeholder="https://" /></div>
        <div className="field"><label htmlFor="mc-descricao">Quando usar (opcional)</label><textarea id="mc-descricao" value={form.descricao} onChange={set('descricao')} /></div>
      </form>
    </Modal>}
  </div>;
}
