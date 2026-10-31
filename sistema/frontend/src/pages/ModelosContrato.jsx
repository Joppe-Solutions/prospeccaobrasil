import { useCallback, useEffect, useMemo, useState } from 'react';
import Selecao from '../components/Selecao';
import { ArrowSquareOut, FileText, PencilSimple, Plus, Trash } from '@phosphor-icons/react';
import Confirmacao from '../components/Confirmacao';
import { avisar } from '../lib/avisos';
import { api, getUser, useArquivoToken } from '../lib/api';
import DataTable from '../components/DataTable';
import FileUpload from '../tourflow/ui/FileUpload/FileUpload';
import Modal from '../components/Modal';
import { PageHeader } from '../components/UI';
import './collections.css';

const CATEGORIAS = { locacao: 'Locação', compra_venda: 'Compra e venda', passagem_ponto: 'Passagem de ponto', prestacao_servicos: 'Prestação de serviços', confidencialidade: 'Confidencialidade (NDA)', outro: 'Outro' };
const VAZIO = { nome: '', categoria: 'locacao', descricao: '', arquivo: null, arquivoNome: '' };

export default function ModelosContrato() {
  const isAdmin = getUser()?.role === 'admin';
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tipo, setTipo] = useState('');
  const [novoArquivo, setNovoArquivo] = useState(null);
  const arquivoToken = useArquivoToken();

  const load = useCallback(() => api('/modelos-contrato').then(setList).catch(e => setError(e.message)).finally(() => setLoading(false)), []);
  useEffect(() => { load(); }, [load]);
  const abrir = (modelo) => { setFormError(''); setNovoArquivo(null); setForm(modelo); };
  const filtrados = useMemo(() => list.filter(m => !tipo || m.categoria === tipo), [list, tipo]);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function save(e) {
    e.preventDefault(); setBusy(true); setFormError('');
    try {
      if (!form.id && !novoArquivo) throw new Error('Envie o arquivo do modelo.');
      const dados = new FormData();
      dados.append('nome', form.nome); dados.append('categoria', form.categoria); dados.append('descricao', form.descricao);
      if (novoArquivo) dados.append('arquivo', novoArquivo);
      await api(form.id ? `/modelos-contrato/${form.id}` : '/modelos-contrato', { method: form.id ? 'PUT' : 'POST', body: dados });
      avisar(form.id ? 'Modelo atualizado.' : 'Modelo cadastrado.'); setForm(null); await load();
    } catch (err) { setFormError(err.message); } finally { setBusy(false); }
  }
  const [removendo, setRemovendo] = useState(null);
  async function remove(m) {
    try { await api(`/modelos-contrato/${m.id}`, { method: 'DELETE' }); setRemovendo(null); avisar('Modelo excluído.'); await load(); } catch (err) { setError(err.message); setRemovendo(null); }
  }

  const columns = [
    { accessorKey: 'nome', header: 'Modelo', cell: ({ row: { original: m } }) => <span className="collection-cell-stack"><strong>{m.nome}</strong>{m.descricao && <small>{m.descricao}</small>}</span> },
    { accessorKey: 'categoria', header: 'Tipo de contrato', accessorFn: m => CATEGORIAS[m.categoria] || m.categoria, cell: ({ getValue }) => <span className="collection-tag">{getValue()}</span> },
    { accessorKey: 'atualizadoEm', header: 'Atualizado em', cell: ({ getValue }) => new Date(getValue()).toLocaleDateString('pt-BR') },
    { id: 'acoes', header: '', enableSorting: false, enableHiding: false, cell: ({ row: { original: m } }) => <div className="collection-row-actions">
      <a className="btn btn-ghost btn-sm" href={m.arquivo ? `/uploads/${m.arquivo}?token=${arquivoToken}` : m.url} target="_blank" rel="noopener noreferrer"><ArrowSquareOut size={15} /> Abrir</a>
      {isAdmin && <>
        <button type="button" className="icon-button" aria-label={`Editar ${m.nome}`} onClick={() => abrir({ ...m, descricao: m.descricao || '' })}><PencilSimple size={16} /></button>
        <button type="button" className="icon-button collection-delete" aria-label={`Excluir ${m.nome}`} onClick={() => setRemovendo(m)}><Trash size={16} /></button>
      </>}
    </div> },
  ];

  return <div className="collection-page">
    <PageHeader eyebrow="Conhecimento" title="Modelos de contratos" description="Minutas e modelos-padrão para as operações da Prospecção Brasil."
      actions={isAdmin && <button className="btn btn-gold" onClick={() => abrir(VAZIO)}><Plus size={18} weight="bold" />
    <Confirmacao pedido={removendo && { titulo: 'Excluir modelo?', texto: `"${removendo.nome}" será removido da lista de modelos.`, rotulo: 'Excluir', perigo: true }} onClose={() => setRemovendo(null)} onConfirm={() => remove(removendo)} /> Novo modelo</button>} />
    <section className="panel collection-panel">
      <div className="collection-section-head">
        <div><h2>Biblioteca de modelos</h2><p>Arquivos oficiais de cada tipo de contrato.</p></div>
        <span className="collection-section-symbol"><FileText size={22} /></span>
      </div>
      <DataTable columns={columns} data={filtrados} loading={loading} error={error} searchPlaceholder="Buscar modelo..." toolbar={<Selecao aria-label="Filtrar por tipo de contrato" value={tipo} onChange={e => setTipo(e.target.value)}><option value="">Todos os tipos</option>{Object.entries(CATEGORIAS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Selecao>} emptyTitle="Nenhum modelo cadastrado"
        emptyDescription={isAdmin ? 'Clique em “Novo modelo” para adicionar o primeiro.' : 'Peça a um administrador para cadastrar os modelos.'} />
    </section>
    {form && <Modal title={form.id ? 'Editar modelo' : 'Novo modelo de contrato'} onClose={() => !busy && setForm(null)}
      footer={<><button className="btn btn-ghost" disabled={busy} onClick={() => setForm(null)}>Cancelar</button><button form="modelo-form" type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</button></>}>
      <form id="modelo-form" className="collection-modal-form" onSubmit={save}>
        {formError && <div className="alert error" role="alert">{formError}</div>}
        <div className="field"><label htmlFor="mc-nome">Nome do modelo</label><input id="mc-nome" required value={form.nome} onChange={set('nome')} placeholder="Ex.: Contrato de locação comercial" /></div>
        <div className="field"><label htmlFor="mc-categoria">Tipo de contrato</label><Selecao id="mc-categoria" value={form.categoria} onChange={set('categoria')}>{Object.entries(CATEGORIAS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Selecao></div>
        <div className="field modelo-arquivo">
          <FileUpload label="Arquivo do modelo" aria-label="Arquivo do modelo" accept=".pdf,.doc,.docx,.odt" maxSizeMB={15} hint="PDF, Word ou ODT, até 15 MB" onChange={arquivos => setNovoArquivo(arquivos[0] || null)} />
          {form.id && !novoArquivo && <small>{form.arquivoNome ? `Arquivo atual: ${form.arquivoNome}. Envie outro para substituir.` : 'Este modelo ainda usa um link. Envie o arquivo para substituí-lo.'}</small>}
        </div>
        <div className="field"><label htmlFor="mc-descricao">Quando usar (opcional)</label><textarea id="mc-descricao" value={form.descricao} onChange={set('descricao')} /></div>
      </form>
    </Modal>}
  </div>;
}
