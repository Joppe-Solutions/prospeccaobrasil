import { Fragment, useEffect, useRef, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { listaBairros, premissasDoCliente } from '../lib/bairros';
import { api, enviarFotos, fmtMoney, fmtNum, mapsUrl, registroProfissional, STATUS, TIPOS_IMOVEL, TIPOS_PARCEIRO, getToken, getUser, useArquivoToken } from '../lib/api';
import PhotoUploader from '../components/PhotoUploader';
import { DinheiroInput } from '../components/NumberFields';

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
  const [toast, setToast] = useState('');
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
  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 3000); };

  if (loadError) return <div className="empty">Erro ao carregar: {loadError}</div>;
  if (!i) return <div className="empty">Carregando…</div>;
  const isAdmin = getUser()?.role === 'admin';
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
  async function estornarDespesa(despesaId) {
    const motivo = window.prompt('Motivo do estorno (opcional):');
    if (motivo === null) return;
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
      {toast && <div className="toast">{toast}</div>}
      <div className="page-head">
        <h1>{i.codigo} — {i.endereco}{i.numero ? `, ${i.numero}` : ''}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <a className="btn btn-gold" href={`/apresentacao/${i.id}`} target="_blank">Apresentação (PDF)</a>
          <button className="btn btn-ghost" onClick={() => copiarLink()}>Copiar link</button>
          <Link className="btn btn-ghost" to={`/imoveis/${i.id}/editar`} state={{ backgroundLocation: location }}>Editar</Link>
        </div>
      </div>

      <div className="panel"><div className="detail-head">
        {foto ? <img className="detail-photo" src={`/uploads/${foto.arquivo}`} /> : <div className="detail-photo" />}
        <div className="detail-info">
          <h1>{i.titulo || `${i.endereco}${i.numero ? `, ${i.numero}` : ''}`}</h1>
          <div className="sub">{[i.bairro, i.cidade].filter(Boolean).join(' – ')} – {i.uf}{i.cep ? ` · CEP ${i.cep}` : ''}</div>
          <div className="chips">
            <span className={`badge ${i.status}`}>{STATUS[i.status]}</span>
            <span className="badge disponivel">{(TIPOS_IMOVEL[i.tipo] || i.tipo).toUpperCase()}</span>
            {i.categoria && <span className="badge apresentado">{CATEGORIAS[i.categoria] || i.categoria}</span>}
            {i.periodoContrato && <span className="badge negociacao">{i.periodoContrato}</span>}
          </div>
          <p style={{ marginTop: 14, fontSize: 14 }}>
            ABL <b>{fmtNum(i.areaTotal, 'm²')}</b> · Custo total <b>{fmtMoney(custo)}</b>{i.tipo === 'venda' && <> · Venda <b>{fmtMoney(i.precoVenda)}</b></>}
          </p>
          {mapa && <p style={{ marginTop: 8 }}><a href={mapa} target="_blank" rel="noopener noreferrer">Ver no Google Maps ↗</a></p>}
          {i.descricao && <p className="muted" style={{ marginTop: 10 }}>{i.descricao}</p>}
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
        <div className="form-grid">
          <div className="field">
            <label>{i.tipo === 'passagem_ponto' ? 'Operador do ponto' : 'Proprietário'}</label>
            <div style={{ fontWeight: 700 }}>
              {i.tipo === 'passagem_ponto'
                ? <>{i.operador?.nome || '—'}{i.operador ? <div className="muted" style={{ fontWeight: 400, marginTop: 4 }}>{[i.operador.marca, i.operador.telefone].filter(Boolean).join(' · ')}</div> : null}</>
                : <>{i.proprietarioRel?.nome || i.proprietario || '—'}{i.proprietarioRel?.telefone || i.telProprietario ? <div className="muted" style={{ fontWeight: 400, marginTop: 4 }}>{i.proprietarioRel?.telefone || i.telProprietario}</div> : null}</>}
            </div>
          </div>
          <div className="field">
            <label>Parceiro</label>
            <div style={{ fontWeight: 700 }}>
              {i.parceiro?.nome || '—'}
              {i.parceiro ? <div className="muted" style={{ fontWeight: 400, marginTop: 4 }}>{[TIPOS_PARCEIRO[i.parceiro.tipo], registroProfissional(i.parceiro)].filter(Boolean).join(' · ')}</div> : null}
              {i.parceiro?.telefone ? <div className="muted" style={{ fontWeight: 400, marginTop: 4 }}>{i.parceiro.telefone}</div> : null}
            </div>
          </div>
          {i.observacoes && <div className="field" style={{ gridColumn: 'span 2' }}><label>Observações internas</label><div style={{ whiteSpace: 'pre-wrap' }}>{i.observacoes}</div></div>}
        </div>
      </div>

      {isAdmin && <div className="panel">
        <h2>Despesas do imóvel</h2>
        <form onSubmit={addDespesa} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <input placeholder="Descrição" required value={despesaForm.descricao} onChange={e => setDespesaForm({ ...despesaForm, descricao: e.target.value })} style={{ flex: 2, minWidth: 160 }} />
          <DinheiroInput aria-label="Valor da despesa" required value={despesaForm.valor} onChange={v => setDespesaForm({ ...despesaForm, valor: v })} style={{ width: 150 }} />
          <input type="date" value={despesaForm.data} onChange={e => setDespesaForm({ ...despesaForm, data: e.target.value })} />
          <button className="btn btn-ghost btn-sm" type="submit">Adicionar</button>
        </form>
        {(i.despesas || []).length > 0 ? (
          <table><thead><tr><th>Descrição</th><th>Valor</th><th>Data</th><th style={{ width: 80 }} /></tr></thead>
            <tbody>{i.despesas.map(d => (
              <tr key={d.id} style={d.estornada ? { opacity: 0.5, textDecoration: 'line-through' } : undefined}>
                <td>{d.descricao}{d.estornada && <span className="badge perdido" style={{ marginLeft: 8 }}>Estornada</span>}</td>
                <td>{fmtMoney(d.valor)}</td>
                <td>{d.data ? String(d.data).slice(0, 10).split('-').reverse().join('/') : '—'}</td>
                <td>{!d.estornada && <button className="btn btn-danger btn-sm" onClick={() => estornarDespesa(d.id)}>Estornar</button>}</td>
              </tr>
            ))}</tbody>
            <tfoot><tr><td><b>Total</b></td><td colSpan={3}><b>{fmtMoney(i.despesas.filter(d => !d.estornada).reduce((s, d) => s + Number(d.valor || 0), 0))}</b></td></tr></tfoot>
          </table>
        ) : <div className="empty">Nenhuma despesa registrada.</div>}
      </div>}

      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <h2 style={{ margin: 0 }}>Fotos</h2>
          {i.fotos.length > 0 && <div style={{ display: 'flex', gap: 8 }}>
            <a className="btn btn-ghost btn-sm" href={`/apresentacao/${i.id}/fotos`} target="_blank" rel="noopener noreferrer">Abrir galeria pública ↗</a>
            <button className="btn btn-ghost btn-sm" onClick={() => copiarLink('/fotos', 'Link da galeria copiado')}>Copiar link da galeria</button>
          </div>}
        </div>
        <PhotoUploader busy={enviando} onAdd={uploadFotos} onCover={key => acaoFoto(key, 'capa')} onRemove={key => acaoFoto(key, 'remover')}
          items={i.fotos.map(f => ({ key: String(f.id), src: `/uploads/${f.arquivo}`, capa: f.principal }))} />
      </div>

      <div className="panel">
        <h2>Documentos</h2>
        <form onSubmit={addDoc} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <select value={docTipo} onChange={e => setDocTipo(e.target.value)}>{DOC_TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <input placeholder="Nome (opcional)" value={docNome} onChange={e => setDocNome(e.target.value)} />
          <input placeholder="URL (opcional)" value={docUrl} onChange={e => setDocUrl(e.target.value)} />
          <input ref={docFileRef} type="file" />
          <button className="btn btn-ghost btn-sm">Adicionar</button>
        </form>
        <table><tbody>
          {i.documentos.map(d => (
            <tr key={d.id}>
              <td><b>{DOC_TIPOS.find(t => t[0] === d.tipo)?.[1] || d.tipo}</b></td>
              <td>{d.url || d.arquivo ? <a href={d.url || `/uploads/${d.arquivo}?token=${arquivoToken}`} target="_blank" rel="noopener noreferrer">{d.nome}</a> : d.nome}</td>
              <td style={{ width: 60 }}><button className="btn btn-danger btn-sm" onClick={() => api(`/imoveis/${id}/documentos/${d.id}`, { method: 'DELETE' }).then(load)}>Excluir</button></td>
            </tr>
          ))}
        </tbody></table>
      </div>

      <div className="panel ai-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <h2>Inteligência de mercado</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            {analise && <a className="btn btn-ghost btn-sm" href={`/inteligencia/${analise.id}?token=${arquivoToken}`} target="_blank" rel="noopener noreferrer">Documento completo ↗</a>}
            <button className="btn btn-gold btn-sm" onClick={gerarIA} disabled={gerando}>{gerando ? 'Gerando…' : analise ? 'Regenerar análise' : 'Gerar análise'}</button>
          </div>
        </div>
        {analise ? (
          <div style={{ display: 'flex', gap: 22, marginTop: 16 }}>
            <div className="score-ring" style={{ background: `conic-gradient(#e8b84b ${analise.score}%, rgba(255,255,255,.15) 0)` }}>
              <span style={{ background: '#12312d', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{analise.score}</span>
            </div>
            <div style={{ flex: 1 }}>
              {ai.aviso && <p className="muted" style={{ fontSize: 12, fontStyle: 'italic' }}>{ai.aviso}</p>}
              <p>{analise.resumo}</p>
              <h4 style={{ marginTop: 12, color: '#8fd8b8' }}>Pontos fortes</h4>
              <ul>{ai.pontosFortes.map((p, x) => <li key={x}>{p}</li>)}</ul>
              <h4 style={{ color: '#f2c96d' }}>Atenção</h4>
              <ul>{ai.pontosAtencao.map((p, x) => <li key={x}>{p}</li>)}</ul>
              <h4 style={{ color: '#8fd8b8' }}>Segmentos recomendados</h4>
              <div>{ai.segmentosRecomendados.map((s, x) => <span className="tag" key={x}>{s}</span>)}</div>
              <p style={{ marginTop: 12, fontSize: 13, opacity: .85 }}>{ai.recomendacao} · <i>modelo: {analise.modelo}</i></p>
            </div>
          </div>
        ) : <p className="muted" style={{ marginTop: 10, color: '#9fbfb1' }}>Gere a análise automática deste ponto — score, pontos fortes e segmentos recomendados.</p>}
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
            </li>)}</ul> : <p className="muted" style={{ margin: '4px 0 14px' }}>Nenhum cliente ainda não apresentado tem premissas compatíveis com este imóvel.</p>}
            <h3 style={{ fontSize: 13, margin: '16px 0 8px' }}>Apresentar para outro cliente</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <select value={empSel} aria-label="Empresa para apresentação" onChange={e => setEmpSel(e.target.value)} style={{ flex: 1, padding: 11, borderRadius: 10, border: '1px solid var(--line)' }}>
                <option value="">Selecionar cliente…</option>
                {ativos.filter(e => !apresentadas.has(e.id)).map(e => <option key={e.id} value={e.id}>{e.nome} — {e.segmento || 'sem segmento'}</option>)}
              </select>
          <select aria-label="Modalidade da apresentação" value={modalidade} onChange={e => setModalidade(e.target.value)}><option value="">{{ venda: 'Ativos à venda', passagem_ponto: 'Passagem de ponto comercial' }[i.tipo] || 'Locação direta'}</option><option value="locacao_direta">Locação direta</option><option value="passagem_ponto">Passagem de ponto comercial</option><option value="venda_ativo">Ativos à venda</option></select>
          <button className="btn btn-primary btn-sm" disabled={!empSel} onClick={() => addOportunidade()}>Registrar apresentação</button>
            </div>
          </>;
        })()}
        {i.oportunidades.length > 0 && (
          <table style={{ marginTop: 14 }}><thead><tr><th>Empresa</th><th>Contato</th><th>Etapa</th><th>Proposta</th><th>Apresentação</th><th>Data</th></tr></thead>
            <tbody>{i.oportunidades.map(o => (
              <tr key={o.id}>
                <td><Link to={`/oportunidades?empresaId=${o.empresaId}`}>{o.empresa.nome}</Link></td>
                <td>{[o.empresa.contatoNome, o.empresa.telefone || o.empresa.email].filter(Boolean).join(' · ') || '—'}</td>
                <td><span className={`badge ${o.etapa}`}>{ETAPAS[o.etapa] || o.etapa}</span></td>
                <td>{{ sem_proposta: '—', em_elaboracao: 'Em elaboração', enviada: 'Enviada', em_analise: 'Em análise', contraproposta: 'Contraproposta', aceita: 'Aceita', recusada: 'Recusada' }[o.propostaStatus || 'sem_proposta']}{o.propostaEnviadaEm && <small className="muted" style={{ display: 'block' }}>{new Date(`${o.propostaEnviadaEm}T12:00:00`).toLocaleDateString('pt-BR')}</small>}</td>
                <td><a href={`/apresentacao/${i.id}`} target="_blank" rel="noreferrer">Abrir</a></td>
                <td>{new Date(o.criadoEm).toLocaleDateString('pt-BR')}</td>
              </tr>
            ))}</tbody></table>
        )}
      </div>
    </>
  );
}
