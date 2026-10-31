import { Fragment, useEffect, useRef, useState } from 'react';
import Selecao from '../components/Selecao';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { listaBairros, premissasDoCliente } from '../lib/bairros';
import { api, enviarFotos, fmtMoney, fmtNum, mapsUrl, registroProfissional, STATUS, TIPOS_IMOVEL, TIPOS_PARCEIRO, getToken, getUser, useArquivoToken } from '../lib/api';
import PhotoUploader from '../components/PhotoUploader';
import Modal from '../components/Modal';
import { DinheiroInput } from '../components/NumberFields';
import { ArrowSquareOut } from '@phosphor-icons/react';
import Confirmacao from '../components/Confirmacao';
import { PageHeader } from '../components/UI';
import { avisar } from '../lib/avisos';

const DOC_TIPOS = [['planta', 'Planta (PDF)'], ['dwg', 'Planta (DWG)'], ['inteligencia', 'Inteligência de mercado'], ['pre_analise', 'Pré-análise'], ['rgi', 'RGI / Habite-se'], ['avcb', 'AVCB'], ['convencao', 'Convenção Cond.'], ['regimento', 'Regimento'], ['iptu_doc', 'IPTU'], ['doc_locatario', 'Documentação do locatário'], ['outro', 'Outro']];
const ETAPAS = { apresentado: 'Apresentado', visita: 'Visita', proposta: 'Proposta', negociacao: 'Negociação', fechado: 'Fechado', perdido: 'Perdido' };
const CATEGORIAS = { loja: 'Loja', predio: 'Prédio', terreno: 'Terreno', outro: 'Outro' };

const MODALIDADE_PADRAO = { venda: 'venda_ativo', passagem_ponto: 'passagem_ponto' };

export default function ImovelDetalhe() {
  const arquivoToken = useArquivoToken();
  const location = useLocation();
  const { id } = useParams();
  const [i, setI] = useState(null);
  const [empresas, setEmpresas] = useState([]);
  const [modalidade, setModalidade] = useState('');
  const [empSel, setEmpSel] = useState('');
  const [docTipo, setDocTipo] = useState('planta');
  const [docNome, setDocNome] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [despesaForm, setDespesaForm] = useState({ descricao: '', valor: '', data: '' });
  const [gerando, setGerando] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const docFileRef = useRef();

  const load = () => api(`/imoveis/${id}`).then(setI).catch((e) => { setI(null); setLoadError(e.message); });
  useEffect(() => {
    setLoadError('');
    load();
    api('/empresas').then(setEmpresas).catch(() => setEmpresas([]));
  }, [id]);
  const flash = (m) => avisar(m);
  const [estorno, setEstorno] = useState(null); // despesa a estornar
  const nav = useNavigate();
  const [excluir, setExcluir] = useState(null); // null | { erro, ocupado }

  if (loadError) return <div className="empty">Erro ao carregar: {loadError}</div>;
  if (!i) return <div className="empty">Carregando…</div>;
  const isAdmin = getUser()?.role === 'admin';
  async function confirmarExclusao() {
    setExcluir({ ocupado: true });
    try { await api(`/imoveis/${id}`, { method: 'DELETE' }); nav('/imoveis', { replace: true }); }
    catch (e) { setExcluir({ erro: e.message }); }
  }
  async function arquivar() {
    setExcluir({ ocupado: true });
    try { await api(`/imoveis/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'inativo' }) }); setExcluir(null); await load(); flash('Imóvel marcado como inativo'); }
    catch (e) { setExcluir({ erro: e.message }); }
  }
  const custo = [i.aluguel, i.condominio, i.iptu].map(Number).filter(Boolean).reduce((a, b) => a + b, 0);
  const foto = i.fotos.find(f => f.principal) || i.fotos[0];
  const analise = i.analises[0];
  const ai = analise?.conteudoJson ? JSON.parse(analise.conteudoJson) : null;

  async function uploadFotos(files) {
    setEnviando(true);
    try { await enviarFotos(id, files); await load(); flash('Fotos enviadas'); }
    catch (e) { flash(e.message || 'Falha ao enviar fotos'); } finally { setEnviando(false); }
  }
  const acaoFoto = (key, acao) => api(`/imoveis/${id}/fotos/${key}${acao === 'capa' ? '/principal' : ''}`, { method: acao === 'capa' ? 'POST' : 'DELETE' })
    .then(load).catch(e => flash(e.message || 'Não foi possível atualizar a foto'));
  async function addDoc(e) {
    e.preventDefault();
    const fd = new FormData();
    fd.append('tipo', docTipo); fd.append('nome', docNome); fd.append('url', docUrl);
    if (docFileRef.current.files[0]) fd.append('arquivo', docFileRef.current.files[0]);
    try {
      const res = await fetch(`/api/imoveis/${id}/documentos`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return flash(json.error || 'Falha ao adicionar documento');
      setDocNome(''); setDocUrl(''); docFileRef.current.value = '';
      load(); flash('Documento adicionado');
    } catch { flash('Falha ao adicionar documento'); }
  }
  async function gerarIA() {
    setGerando(true);
    try {
      await api(`/imoveis/${id}/analise`, { method: 'POST' });
      await load(); flash('Análise gerada');
    } catch (e) { flash(e.message || 'Falha ao gerar análise'); } finally { setGerando(false); }
  }
  async function addOportunidade(empresaId = empSel) {
    if (!empresaId) return;
    try {
      await api('/oportunidades', { method: 'POST', body: JSON.stringify({ imovelId: +id, empresaId: +empresaId, modalidade: modalidade || MODALIDADE_PADRAO[i.tipo] || 'locacao_direta' }) });
      setEmpSel(''); setModalidade(''); load(); flash('Apresentação registrada em Ações das operações');
    } catch (e) { flash(e.message || 'Falha ao registrar apresentação'); }
  }
  async function addDespesa(e) {
    e.preventDefault();
    if (!despesaForm.descricao || !despesaForm.valor) return;
    try {
      await api(`/imoveis/${id}/despesas`, { method: 'POST', body: JSON.stringify(despesaForm) });
      setDespesaForm({ descricao: '', valor: '', data: '' });
      load(); flash('Despesa adicionada');
    } catch (e) { flash(e.message || 'Falha ao adicionar despesa'); }
  }
  async function estornarDespesa(despesaId, motivo) {
    setEstorno(null);
    try {
      await api(`/imoveis/${id}/despesas/${despesaId}/estornar`, { method: 'POST', body: JSON.stringify({ motivo }) });
      load(); flash('Despesa estornada');
    } catch (e) { flash(e.message || 'Falha ao estornar despesa'); }
  }
  async function copiarLink(caminho = '', aviso = 'Link público copiado') {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/apresentacao/${i.id}${caminho}`);
      flash(aviso);
    } catch { flash('Não foi possível copiar o link'); }
  }
  const mapa = mapsUrl(i);
  const m2 = v => fmtNum(v, 'm²');
  const dimensoes = [
    ['Área Bruta Locável (ABL)', m2(i.areaTotal)], ['Área útil', m2(i.areaUtil)],
    ...(i.areas || []).map(a => [a.nome, m2(a.area)]),
    ['Pé direito', fmtNum(i.peDireito, 'mts')], ['Frente', fmtNum(i.frenteImovel, 'mts')], ['Vagas', fmtNum(i.vagas)],
    ['Acessibilidade', i.acessibilidade || '—'], ['Infraestrutura', i.infraestrutura || '—'], ['Restrições de uso', i.restricoesUso || '—'],
  ];
  const termos = [
    ['CDU', fmtMoney(i.cdu)], ['Aluguel', fmtMoney(i.aluguel)], ['IPTU', fmtMoney(i.iptu)], ['Condomínio', fmtMoney(i.condominio)],
    ['Custo mensal total', fmtMoney(custo)], ['Carência', fmtNum(i.carenciaMeses, 'meses')],
    ['Preço de venda', fmtMoney(i.precoVenda)], ['Período de contrato', i.periodoContrato || '—'],
  ];

  return (
    <>
      <Confirmacao pedido={estorno && { titulo: 'Estornar despesa?', texto: `${estorno.descricao} · ${fmtMoney(estorno.valor)}. A despesa fica no histórico como estornada.`, rotulo: 'Estornar', perigo: true, campo: 'Motivo (opcional)' }} onClose={() => setEstorno(null)} onConfirm={motivo => estornarDespesa(estorno.id, motivo)} />
      {excluir && <Modal title="Excluir imóvel?" description={`${i.codigo} — ${i.endereco}${i.numero ? `, ${i.numero}` : ''}`} onClose={() => !excluir.ocupado && setExcluir(null)}
        footer={<><button className="btn btn-ghost" disabled={excluir.ocupado} onClick={() => setExcluir(null)}>Cancelar</button>
          {excluir.erro && i.status !== 'inativo' && <button className="btn btn-outline" disabled={excluir.ocupado} onClick={arquivar}>Marcar como inativo</button>}
          {!excluir.erro && <button className="btn btn-danger" disabled={excluir.ocupado} onClick={confirmarExclusao}>{excluir.ocupado ? 'Excluindo...' : 'Excluir definitivamente'}</button>}</>}>
        <div className="collection-modal-form">
          {excluir.erro ? <div className="alert error" role="alert">{excluir.erro}</div>
            : <p>O imóvel, as fotos, os documentos e as análises serão apagados e não podem ser recuperados. Se ele já teve negociação, prefira marcá-lo como inativo.</p>}
        </div>
      </Modal>}
      <PageHeader title={`${i.codigo} — ${i.endereco}${i.numero ? `, ${i.numero}` : ''}`} actions={<div className="page-actions">
          <a className="btn btn-primary" href={`/apresentacao/${i.id}`} target="_blank" rel="noopener">Apresentação</a>
          <a className="btn btn-ghost" href={`/apresentacao/${i.id}/pdf`} target="_blank" rel="noopener">PDF</a>
          <button className="btn btn-ghost" onClick={() => copiarLink()}>Copiar link</button>
          <Link className="btn btn-ghost" to={`/imoveis/${i.id}/editar`} state={{ backgroundLocation: location }}>Editar</Link>
          {isAdmin && <button className="btn btn-ghost collection-delete" onClick={() => setExcluir({})}>Excluir</button>}
      </div>} />

      <div className="panel"><div className="detail-head">
        {foto ? <img className="detail-photo" src={`/uploads/${foto.arquivo}`} /> : <div className="detail-photo" />}
        <div className="detail-info">
          <h1>{i.titulo || `${i.endereco}${i.numero ? `, ${i.numero}` : ''}`}</h1>
          <div className="sub">{[i.bairro, i.cidade].filter(Boolean).join(' – ')} – {i.uf}{i.cep ? ` · CEP ${i.cep}` : ''}</div>
          <div className="chips">
            <span className={`badge ${i.status}`}>{STATUS[i.status]}</span>
            <span className="badge disponivel">{TIPOS_IMOVEL[i.tipo] || i.tipo}</span>
            {i.categoria && <span className="badge apresentado">{CATEGORIAS[i.categoria] || i.categoria}</span>}
            {i.periodoContrato && <span className="badge negociacao">{i.periodoContrato}</span>}
          </div>
          <dl className="detail-summary">
            <div><dt>ABL</dt><dd>{fmtNum(i.areaTotal, 'm²')}</dd></div>
            <div><dt>Custo mensal total</dt><dd>{fmtMoney(custo)}</dd></div>
            {i.tipo === 'venda' && <div><dt>Venda</dt><dd>{fmtMoney(i.precoVenda)}</dd></div>}
          </dl>
          {mapa && <a className="text-link" href={mapa} target="_blank" rel="noopener noreferrer">Ver no Google Maps <ArrowSquareOut size={14} /></a>}
          {i.descricao && <p className="detail-description">{i.descricao}</p>}
        </div>
      </div></div>

      <div className="panel">
        <div className="detail-columns">
          {[['Dimensões', dimensoes], ['Termos comerciais', termos]].map(([titulo, itens]) => <section key={titulo}>
            <h2>{titulo}</h2>
            <dl className="detail-list">{itens.map(([l, v]) => <Fragment key={l}><dt>{l}</dt><dd>{v}</dd></Fragment>)}</dl>
          </section>)}
        </div>
      </div>

      <div className="panel">
        <h2>Vínculos</h2>
        <dl className="detail-links">
          <div>
            <dt>{i.tipo === 'passagem_ponto' ? 'Operador do ponto' : 'Proprietário'}</dt>
            {i.tipo === 'passagem_ponto'
              ? <dd><strong>{i.operador?.nome || '—'}</strong>{i.operador && <small>{[i.operador.marca, i.operador.telefone].filter(Boolean).join(' · ')}</small>}</dd>
              : <dd><strong>{i.proprietarioRel?.nome || i.proprietario || '—'}</strong>{(i.proprietarioRel?.telefone || i.telProprietario) && <small>{i.proprietarioRel?.telefone || i.telProprietario}</small>}</dd>}
          </div>
          <div>
            <dt>Parceiro</dt>
            <dd><strong>{i.parceiro?.nome || '—'}</strong>{i.parceiro && <small>{[TIPOS_PARCEIRO[i.parceiro.tipo], registroProfissional(i.parceiro), i.parceiro.telefone].filter(Boolean).join(' · ')}</small>}</dd>
          </div>
          {i.observacoes && <div className="detail-links-wide"><dt>Observações internas</dt><dd className="detail-prewrap">{i.observacoes}</dd></div>}
        </dl>
      </div>

      {isAdmin && <div className="panel">
        <h2>Despesas do imóvel</h2>
        <form onSubmit={addDespesa} className="inline-form">
          <div className="field grow"><label htmlFor="desp-descricao">Descrição</label><input id="desp-descricao" required value={despesaForm.descricao} onChange={e => setDespesaForm({ ...despesaForm, descricao: e.target.value })} placeholder="Ex.: chaveiro, limpeza" /></div>
          <div className="field"><label htmlFor="desp-valor">Valor</label><DinheiroInput id="desp-valor" required value={despesaForm.valor} onChange={v => setDespesaForm({ ...despesaForm, valor: v })} /></div>
          <div className="field"><label htmlFor="desp-data">Data</label><input id="desp-data" type="date" value={despesaForm.data} onChange={e => setDespesaForm({ ...despesaForm, data: e.target.value })} /></div>
          <button className="btn btn-ghost" type="submit">Adicionar despesa</button>
        </form>
        {(i.despesas || []).length > 0 ? (
          <table className="detail-table"><thead><tr><th>Descrição</th><th>Valor</th><th>Data</th><th className="col-acoes" /></tr></thead>
            <tbody>{i.despesas.map(d => (
              <tr key={d.id} className={d.estornada ? 'is-estornada' : undefined}>
                <td>{d.descricao}{d.estornada && <span className="badge perdido">Estornada</span>}</td>
                <td>{fmtMoney(d.valor)}</td>
                <td>{d.data ? String(d.data).slice(0, 10).split('-').reverse().join('/') : '—'}</td>
                <td>{!d.estornada && <button className="btn btn-ghost btn-sm collection-delete" onClick={() => setEstorno(d)}>Estornar</button>}</td>
              </tr>
            ))}</tbody>
            <tfoot><tr><td><b>Total</b></td><td colSpan={3}><b>{fmtMoney(i.despesas.filter(d => !d.estornada).reduce((s, d) => s + Number(d.valor || 0), 0))}</b></td></tr></tfoot>
          </table>
        ) : <p className="muted">Nenhuma despesa registrada.</p>}
      </div>}

      <div className="panel">
        <div className="panel-head">
          <h2>Fotos</h2>
          {i.fotos.length > 0 && <div className="page-actions">
            <a className="btn btn-ghost btn-sm" href={`/apresentacao/${i.id}/fotos`} target="_blank" rel="noopener noreferrer">Abrir galeria pública <ArrowSquareOut size={14} /></a>
            <button className="btn btn-ghost btn-sm" onClick={() => copiarLink('/fotos', 'Link da galeria copiado')}>Copiar link da galeria</button>
          </div>}
        </div>
        <PhotoUploader busy={enviando} onAdd={uploadFotos} onCover={key => acaoFoto(key, 'capa')} onRemove={key => acaoFoto(key, 'remover')}
          items={i.fotos.map(f => ({ key: String(f.id), src: `/uploads/${f.arquivo}`, capa: f.principal }))} />
      </div>

      <div className="panel">
        <h2>Documentos</h2>
        <form onSubmit={addDoc} className="inline-form">
          <div className="field"><label htmlFor="doc-tipo">Tipo</label><Selecao id="doc-tipo" value={docTipo} onChange={e => setDocTipo(e.target.value)}>{DOC_TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Selecao></div>
          <div className="field grow"><label htmlFor="doc-nome">Nome <span className="collection-optional">Opcional</span></label><input id="doc-nome" value={docNome} onChange={e => setDocNome(e.target.value)} /></div>
          <div className="field grow"><label htmlFor="doc-url">Link <span className="collection-optional">Opcional</span></label><input id="doc-url" value={docUrl} onChange={e => setDocUrl(e.target.value)} placeholder="https://" /></div>
          <div className="field"><label htmlFor="doc-arquivo">Arquivo</label><input id="doc-arquivo" ref={docFileRef} type="file" /></div>
          <button className="btn btn-ghost">Adicionar documento</button>
        </form>
        {i.documentos.length === 0 && <p className="muted">Nenhum documento anexado.</p>}
        <table className="detail-table"><tbody>
          {i.documentos.map(d => (
            <tr key={d.id}>
              <td><b>{DOC_TIPOS.find(t => t[0] === d.tipo)?.[1] || d.tipo}</b></td>
              <td>{d.url || d.arquivo ? <a href={d.url || `/uploads/${d.arquivo}?token=${arquivoToken}`} target="_blank" rel="noopener noreferrer">{d.nome}</a> : d.nome}</td>
              <td className="col-acoes"><button className="btn btn-ghost btn-sm collection-delete" onClick={() => api(`/imoveis/${id}/documentos/${d.id}`, { method: 'DELETE' }).then(load)}>Excluir</button></td>
            </tr>
          ))}
        </tbody></table>
      </div>

      <div className="panel ai-box">
        <div className="panel-head">
          <h2>Inteligência de mercado</h2>
          <div className="page-actions">
            {analise && <a className="btn btn-ghost btn-sm" href={`/inteligencia/${analise.id}?token=${arquivoToken}`} target="_blank" rel="noopener noreferrer">Documento completo <ArrowSquareOut size={14} /></a>}
            <button className="btn btn-gold btn-sm" onClick={gerarIA} disabled={gerando}>{gerando ? 'Gerando…' : analise ? 'Regenerar análise' : 'Gerar análise'}</button>
          </div>
        </div>
        {analise ? (
          <div className="ai-body">
            <div className="score-ring" style={{ '--score': `${analise.score}%` }}><span>{analise.score}</span></div>
            <div className="ai-text">
              {ai.aviso && <p className="ai-aviso">{ai.aviso}</p>}
              <p>{analise.resumo}</p>
              <h4>Pontos fortes</h4>
              <ul>{ai.pontosFortes.map((p, x) => <li key={x}>{p}</li>)}</ul>
              <h4 className="is-atencao">Atenção</h4>
              <ul>{ai.pontosAtencao.map((p, x) => <li key={x}>{p}</li>)}</ul>
              <h4>Segmentos recomendados</h4>
              <div>{ai.segmentosRecomendados.map((s, x) => <span className="tag" key={x}>{s}</span>)}</div>
              <p className="ai-rodape">{ai.recomendacao} · modelo: {analise.modelo}</p>
            </div>
          </div>
        ) : <p className="ai-vazio">Gere a análise automática deste ponto: score, pontos fortes e segmentos recomendados.</p>}
      </div>

      <div className="panel">
        <h2>Clientes compatíveis</h2><p className="muted">Clientes cujas premissas (bairros de interesse e faixa de área) batem com este imóvel. Ao apresentar, a negociação passa a ser acompanhada em <Link to="/oportunidades">Ações das operações</Link>.</p>
        {(() => {
          const apresentadas = new Set(i.oportunidades.map(o => o.empresaId));
          const ativos = empresas.filter(e => e.status !== 'inativo');
          const sugeridos = ativos.map(e => ({ e, p: premissasDoCliente(e, i) }))
            .filter(({ e, p }) => ['compativel', 'parcial'].includes(p.nivel) && !apresentadas.has(e.id))
            .sort((a, b) => (a.p.nivel === b.p.nivel ? a.e.nome.localeCompare(b.e.nome) : a.p.nivel === 'compativel' ? -1 : 1));
          const marca = (ok, rotulo) => ok == null ? null : <span className={`match-crit ${ok ? 'ok' : 'no'}`}>{ok ? '✓' : '✗'} {rotulo}</span>;
          return <>
            {sugeridos.length ? <ul className="match-clientes">{sugeridos.map(({ e, p }) => <li key={e.id}>
              <span><strong>{e.nome}</strong><small>{[e.segmento, listaBairros(e.regioesInteresse).join(', ')].filter(Boolean).join(' · ') || 'Sem premissas'}</small></span>
              <span className="match-crits"><span className={`badge ${p.nivel === 'compativel' ? 'disponivel' : 'negociacao'}`}>{p.nivel === 'compativel' ? 'Compatível' : 'Parcial'}</span>{marca(p.bairro, 'Bairro')}{marca(p.area, 'Área')}</span>
              <button className="btn btn-primary btn-sm" onClick={() => addOportunidade(e.id)} aria-label={`Apresentar para ${e.nome}`}>Apresentar</button>
            </li>)}</ul> : <p className="muted">Nenhum cliente ainda não apresentado tem premissas compatíveis com este imóvel.</p>}
            <div className="inline-form">
              <div className="field grow"><label htmlFor="apr-empresa">Apresentar para outro cliente</label><Selecao id="apr-empresa" value={empSel} onChange={e => setEmpSel(e.target.value)}>
                <option value="">Selecionar cliente…</option>
                {ativos.filter(e => !apresentadas.has(e.id)).map(e => <option key={e.id} value={e.id}>{e.nome} — {e.segmento || 'sem segmento'}</option>)}
              </Selecao></div>
              <div className="field"><label htmlFor="apr-modalidade">Modalidade</label><Selecao id="apr-modalidade" value={modalidade} onChange={e => setModalidade(e.target.value)}><option value="">{{ venda: 'Ativos à venda', passagem_ponto: 'Passagem de ponto comercial' }[i.tipo] || 'Locação direta'}</option><option value="locacao_direta">Locação direta</option><option value="passagem_ponto">Passagem de ponto comercial</option><option value="venda_ativo">Ativos à venda</option></Selecao></div>
              <button className="btn btn-primary" disabled={!empSel} onClick={() => addOportunidade()}>Registrar apresentação</button>
            </div>
          </>;
        })()}
        {i.oportunidades.length > 0 && (
          <table className="detail-table"><thead><tr><th>Empresa</th><th>Contato</th><th>Etapa</th><th>Proposta</th><th>Apresentação</th><th>Data</th></tr></thead>
            <tbody>{i.oportunidades.map(o => (
              <tr key={o.id}>
                <td><Link to={`/oportunidades?empresaId=${o.empresaId}`}>{o.empresa.nome}</Link></td>
                <td>{[o.empresa.contatoNome, o.empresa.telefone || o.empresa.email].filter(Boolean).join(' · ') || '—'}</td>
                <td><span className={`badge ${o.etapa}`}>{ETAPAS[o.etapa] || o.etapa}</span></td>
                <td>{{ sem_proposta: '—', em_elaboracao: 'Em elaboração', enviada: 'Enviada', em_analise: 'Em análise', contraproposta: 'Contraproposta', aceita: 'Aceita', recusada: 'Recusada' }[o.propostaStatus || 'sem_proposta']}{o.propostaEnviadaEm && <small className="detail-sub">{new Date(`${o.propostaEnviadaEm}T12:00:00`).toLocaleDateString('pt-BR')}</small>}</td>
                <td><a href={`/apresentacao/${i.id}`} target="_blank" rel="noreferrer">Abrir</a></td>
                <td>{new Date(o.criadoEm).toLocaleDateString('pt-BR')}</td>
              </tr>
            ))}</tbody></table>
        )}
      </div>
    </>
  );
}
