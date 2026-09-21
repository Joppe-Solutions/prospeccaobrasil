import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Buildings, CurrencyDollar, Plus, Receipt, TrendUp, Wallet, Warning } from '@phosphor-icons/react';
import { api, fmtMoney } from '../lib/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { PageHeader, StatusBadge } from '../components/UI';
import './collections.css';

const TIPOS = { receita: 'Receita', despesa: 'Despesa' };
const CATEGORIAS = { aluguel: 'Aluguel', comissao: 'Comissão', repasse: 'Repasse', condominio: 'Condomínio', iptu: 'IPTU', taxa: 'Taxa', outro: 'Outro' };
const FORMAS = { pix: 'Pix', boleto: 'Boleto', transferencia: 'Transferência', dinheiro: 'Dinheiro', cartao: 'Cartão', outro: 'Outro' };
const STATUS_L = { previsto: { label: 'Previsto', badge: 'pendente' }, pago: { label: 'Pago', badge: 'fechado' }, estornado: { label: 'Estornado', badge: 'perdido' } };
const EMPTY_L = { tipo: 'receita', categoria: 'aluguel', descricao: '', valor: '', competencia: '', vencimento: '', imovelId: '', empresaId: '' };
const fmtData = (v) => v ? String(v).slice(0, 10).split('-').reverse().join('/') : '—';

export default function Financeiro() {
  const [data, setData] = useState({ total: 0, qtd: 0, porImovel: [], despesas: [] });
  const [resumo, setResumo] = useState(null);
  const [lancamentos, setLancamentos] = useState([]);
  const [imoveis, setImoveis] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_L);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [baixa, setBaixa] = useState(null);
  const [baixaForm, setBaixaForm] = useState({ pagoEm: '', valorPago: '', formaPagamento: 'pix' });

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [d, r, l] = await Promise.all([
        api('/financeiro'), api('/financeiro/resumo'), api('/financeiro/lancamentos'),
      ]);
      setData(d); setResumo(r); setLancamentos(l);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openCreate = async () => {
    setForm(EMPTY_L); setFormError(''); setModal(true);
    try { setImoveis(await api('/imoveis')); } catch { /* opcional */ }
    try { setEmpresas(await api('/empresas')); } catch { /* opcional */ }
  };

  const save = async (e) => {
    e.preventDefault(); setFormError(''); setBusy(true);
    try {
      await api('/financeiro/lancamentos', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          valor: String(form.valor).replace(',', '.'),
          imovelId: form.imovelId || null,
          empresaId: form.empresaId || null,
          competencia: form.competencia || null,
          vencimento: form.vencimento || null,
        }),
      });
      setModal(false); setNotice('Lançamento registrado.'); await load();
    } catch (e2) { setFormError(e2.message); } finally { setBusy(false); }
  };

  const abrirBaixa = (l) => {
    setBaixaForm({ pagoEm: '', valorPago: String(l.valor), formaPagamento: 'pix' });
    setFormError(''); setBaixa(l);
  };
  const confirmarBaixa = async (e) => {
    e.preventDefault(); setFormError(''); setBusy(true);
    try {
      await api(`/financeiro/lancamentos/${baixa.id}/baixar`, {
        method: 'POST',
        body: JSON.stringify({ pagoEm: baixaForm.pagoEm || null, valorPago: baixaForm.valorPago, formaPagamento: baixaForm.formaPagamento }),
      });
      setBaixa(null); setNotice('Baixa registrada.'); await load();
    } catch (e2) { setFormError(e2.message); } finally { setBusy(false); }
  };
  const estornar = async (l) => {
    const motivo = window.prompt('Motivo do estorno (opcional):');
    if (motivo === null) return;
    setBusy(true); setFormError('');
    try {
      await api(`/financeiro/lancamentos/${l.id}/estornar`, { method: 'POST', body: JSON.stringify({ motivo }) });
      setNotice('Lançamento estornado.'); await load();
    } catch (e2) { setFormError(e2.message); setNotice(''); } finally { setBusy(false); }
  };

  const columns = useMemo(() => [
    {
      id: 'imovel',
      header: 'Imóvel',
      accessorFn: d => `${d.imovel?.codigo || ''} ${d.imovel?.endereco || ''} ${d.imovel?.bairro || ''}`,
      cell: ({ row }) => {
        const i = row.original.imovel;
        return <Link className="collection-cell-stack collection-title-link" to={`/imoveis/${row.original.imovelId}`}>
          <span className="collection-code">{i?.codigo || '—'}</span>
          <strong>{i?.endereco || 'Imóvel'}{i?.numero ? `, ${i.numero}` : ''}</strong>
          <small>{[i?.bairro, i?.cidade].filter(Boolean).join(' · ') || '—'}</small>
        </Link>;
      },
    },
    { accessorKey: 'descricao', header: 'Despesa', cell: ({ getValue }) => <strong>{getValue()}</strong> },
    {
      id: 'valor',
      accessorFn: (d) => Number(d.valor) || 0,
      header: 'Valor',
      cell: ({ getValue }) => <span className="collection-money">{fmtMoney(getValue())}</span>,
    },
    {
      id: 'data',
      header: 'Data',
      accessorFn: d => d.data || d.criadoEm,
      cell: ({ getValue }) => fmtData(getValue()),
    },
  ], []);

  const colLanc = useMemo(() => [
    { accessorKey: 'descricao', header: 'Lançamento', cell: ({ row }) => (
      <span className="collection-cell-stack">
        <strong>{row.original.descricao}</strong>
        <small>{TIPOS[row.original.tipo]} · {CATEGORIAS[row.original.categoria] || row.original.categoria}{row.original.imovel ? ` · ${row.original.imovel.codigo}` : ''}{row.original.empresa ? ` · ${row.original.empresa.nome}` : ''}</small>
      </span>
    ) },
    { id: 'valor', accessorFn: (l) => Number(l.valor) || 0, header: 'Valor', cell: ({ getValue, row }) => (
      <span className="collection-money" style={row.original.tipo === 'despesa' ? { color: '#c96a5a' } : { color: '#4f9e78' }}>{row.original.tipo === 'despesa' ? '−' : '+'}{fmtMoney(getValue())}</span>
    ) },
    { id: 'vencimento', accessorFn: (l) => l.vencimento || '', header: 'Vencimento', cell: ({ getValue }) => fmtData(getValue()) },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue, row }) => {
      const s = STATUS_L[getValue()] || { label: getValue(), badge: getValue() };
      return <StatusBadge status={s.badge} label={s.label + (row.original.status === 'pago' && row.original.valorPago ? ` · ${fmtMoney(row.original.valorPago)}` : '')} />;
    } },
    { id: 'acoes', header: '', enableSorting: false, enableHiding: false, cell: ({ row }) => (
      <div className="collection-row-actions">
        {row.original.status === 'previsto' && <button className="icon-button" title="Baixar (registrar pagamento)" aria-label={`Baixar ${row.original.descricao}`} onClick={() => abrirBaixa(row.original)}><Receipt size={17} /></button>}
        {row.original.status !== 'estornado' && <button className="icon-button collection-delete" title="Estornar" aria-label={`Estornar ${row.original.descricao}`} onClick={() => estornar(row.original)}>↩</button>}
      </div>
    ) },
  ], []);

  const count = v => (loading || error ? '—' : v);

  return <div className="collection-page">
    <PageHeader
      eyebrow="CONTROLE FINANCEIRO"
      title="Financeiro"
      description="Receitas, despesas, vencimentos e resultado por negócio."
      actions={<button className="btn btn-gold" onClick={openCreate}><Plus size={18} weight="bold" /> Novo lançamento</button>}
    />
    {notice && <div className="alert success" role="status">{notice}<button className="collection-dismiss" onClick={() => setNotice('')} aria-label="Fechar mensagem">×</button></div>}
    {formError && !modal && !baixa && <div className="alert error" role="alert">{formError}</div>}
    <div className="collection-stats">
      <div>
        <span className="collection-stat-icon is-green"><TrendUp size={21} /></span>
        <span><small>Receita realizada</small><strong>{count(fmtMoney(resumo?.receitaRealizada))}</strong></span>
      </div>
      <div>
        <span className="collection-stat-icon is-gold"><Wallet size={21} /></span>
        <span><small>Resultado realizado</small><strong>{count(fmtMoney(resumo?.resultadoRealizado))}</strong></span>
      </div>
      <div>
        <span className="collection-stat-icon"><Receipt size={21} /></span>
        <span><small>Previsto a receber − pagar</small><strong>{count(`${fmtMoney(resumo?.receitaPrevista)} / ${fmtMoney(resumo?.despesaPrevista)}`)}</strong></span>
      </div>
      <div>
        <span className="collection-stat-icon is-red"><Warning size={21} /></span>
        <span><small>Vencidos em aberto</small><strong>{count(`${resumo?.vencidos?.qtd ?? 0} · ${fmtMoney(resumo?.vencidos?.total)}`)}</strong></span>
      </div>
    </div>

    <section className="panel collection-panel" style={{ marginBottom: 18 }}>
      <div className="collection-section-head">
        <div><h2>Lançamentos</h2><p>Receitas e despesas com baixa e estorno — histórico preservado.</p></div>
        <span className="collection-section-symbol"><CurrencyDollar size={22} /></span>
      </div>
      <DataTable
        columns={colLanc}
        data={lancamentos}
        loading={loading}
        error={error}
        searchPlaceholder="Buscar lançamento..."
        exportName="lancamentos.csv"
        emptyTitle="Nenhum lançamento"
        emptyDescription="Registre receitas e despesas no botão Novo lançamento."
      />
    </section>

    {!!resumo?.porImovel?.length && (
      <section className="panel collection-panel" style={{ marginBottom: 18 }}>
        <div className="collection-section-head">
          <div><h2>Resultado por negócio</h2><p>Receitas menos despesas por imóvel.</p></div>
          <span className="collection-section-symbol"><Buildings size={22} /></span>
        </div>
        <div className="collection-stats" style={{ margin: 0 }}>
          {resumo.porImovel.slice(0, 8).map(row => (
            <Link key={row.imovel?.id} to={`/imoveis/${row.imovel?.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <span className="collection-stat-icon"><Buildings size={18} /></span>
              <span>
                <small>{row.imovel?.codigo} · +{fmtMoney(row.receita)} / −{fmtMoney(row.despesa)}</small>
                <strong>{fmtMoney(row.resultado)}</strong>
              </span>
            </Link>
          ))}
        </div>
      </section>
    )}

    {!!data.porImovel?.length && (
      <section className="panel collection-panel" style={{ marginBottom: 18 }}>
        <div className="collection-section-head">
          <div><h2>Custos de imóvel (legado)</h2><p>Despesas cadastradas no detalhe de cada imóvel.</p></div>
          <span className="collection-section-symbol"><CurrencyDollar size={22} /></span>
        </div>
        <div className="collection-stats" style={{ margin: 0 }}>
          {data.porImovel.slice(0, 6).map(row => (
            <Link key={row.imovel?.id || row.imovel?.codigo} to={`/imoveis/${row.imovel?.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <span className="collection-stat-icon"><Buildings size={18} /></span>
              <span>
                <small>{row.imovel?.codigo} · {row.qtd} lançamento{row.qtd === 1 ? '' : 's'}</small>
                <strong>{fmtMoney(row.total)}</strong>
              </span>
            </Link>
          ))}
        </div>
      </section>
    )}

    <section className="panel collection-panel">
      <div className="collection-section-head">
        <div><h2>Despesas por imóvel</h2><p>Custos registrados no detalhe de cada imóvel.</p></div>
      </div>
      <DataTable
        columns={columns}
        data={data.despesas || []}
        loading={loading}
        error={error}
        searchPlaceholder="Buscar imóvel ou despesa..."
        exportName="financeiro.csv"
        emptyTitle="Nenhuma despesa registrada"
        emptyDescription="Abra um imóvel e registre planta, deslocamento e outros custos."
        toolbar={error && <button className="btn btn-ghost btn-sm" onClick={load}>Tentar novamente</button>}
      />
    </section>

    {modal && <Modal
      title="Novo lançamento"
      description="Receita ou despesa com vencimento e vínculo opcional a imóvel/empresa."
      onClose={() => !busy && setModal(false)}
      footer={<><button className="btn btn-ghost" disabled={busy} onClick={() => setModal(false)}>Cancelar</button><button className="btn btn-primary" type="submit" form="lanc-form" disabled={busy}>{busy ? 'Salvando...' : 'Registrar lançamento'}<ArrowRight size={17} /></button></>}
    >
      <form id="lanc-form" className="collection-modal-form" onSubmit={save}>
        {formError && <div className="alert error" role="alert">{formError}</div>}
        <div className="field"><label htmlFor="l-tipo">Tipo</label><select id="l-tipo" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>{Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div className="field"><label htmlFor="l-cat">Categoria</label><select id="l-cat" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>{Object.entries(CATEGORIAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div className="field"><label htmlFor="l-desc">Descrição <span className="required">*</span></label><input id="l-desc" required value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Ex.: Comissão locação PB-001" /></div>
        <div className="field"><label htmlFor="l-valor">Valor (R$) <span className="required">*</span></label><input id="l-valor" required inputMode="decimal" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} placeholder="0,00" /></div>
        <div className="field"><label htmlFor="l-comp">Competência</label><input id="l-comp" type="date" value={form.competencia} onChange={e => setForm({ ...form, competencia: e.target.value })} /></div>
        <div className="field"><label htmlFor="l-venc">Vencimento</label><input id="l-venc" type="date" value={form.vencimento} onChange={e => setForm({ ...form, vencimento: e.target.value })} /></div>
        <div className="field"><label htmlFor="l-imovel">Imóvel</label><select id="l-imovel" value={form.imovelId} onChange={e => setForm({ ...form, imovelId: e.target.value })}><option value="">Nenhum</option>{imoveis.map(i => <option key={i.id} value={i.id}>{i.codigo} — {i.titulo || i.endereco}</option>)}</select></div>
        <div className="field"><label htmlFor="l-empresa">Empresa</label><select id="l-empresa" value={form.empresaId} onChange={e => setForm({ ...form, empresaId: e.target.value })}><option value="">Nenhuma</option>{empresas.map(em => <option key={em.id} value={em.id}>{em.nome}</option>)}</select></div>
      </form>
    </Modal>}

    {baixa && <Modal
      title={`Baixar: ${baixa.descricao}`}
      description="Registra o pagamento/recebimento. O lançamento é preservado no histórico."
      onClose={() => !busy && setBaixa(null)}
      footer={<><button className="btn btn-ghost" disabled={busy} onClick={() => setBaixa(null)}>Cancelar</button><button className="btn btn-primary" type="submit" form="baixa-form" disabled={busy}>{busy ? 'Baixando...' : 'Confirmar baixa'}<Receipt size={17} /></button></>}
    >
      <form id="baixa-form" className="collection-modal-form" onSubmit={confirmarBaixa}>
        {formError && <div className="alert error" role="alert">{formError}</div>}
        <div className="field"><label htmlFor="b-data">Data do pagamento</label><input id="b-data" type="date" value={baixaForm.pagoEm} onChange={e => setBaixaForm({ ...baixaForm, pagoEm: e.target.value })} /><small className="collection-optional">Em branco = hoje</small></div>
        <div className="field"><label htmlFor="b-valor">Valor pago (R$)</label><input id="b-valor" inputMode="decimal" value={baixaForm.valorPago} onChange={e => setBaixaForm({ ...baixaForm, valorPago: e.target.value })} /></div>
        <div className="field"><label htmlFor="b-forma">Forma</label><select id="b-forma" value={baixaForm.formaPagamento} onChange={e => setBaixaForm({ ...baixaForm, formaPagamento: e.target.value })}>{Object.entries(FORMAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
      </form>
    </Modal>}
  </div>;
}
