import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { DownloadSimple } from '@phosphor-icons/react';
import { avisar } from '../lib/avisos';
import './exportacao.css';

const ExportContext = createContext(null);
export function ExportProvider({ children }) {
  const [fontes, setFontes] = useState({});
  const registrar = useCallback((id, getter) => {
    setFontes(atual => ({ ...atual, [id]: getter }));
    return () => setFontes(atual => { const proximo = { ...atual }; delete proximo[id]; return proximo; });
  }, []);
  return <ExportContext.Provider value={{ fontes, registrar }}>{children}</ExportContext.Provider>;
}
export function useFonteExportacao(id, fonte) {
  const contexto = useContext(ExportContext);
  const ref = useRef(fonte);
  ref.current = fonte;
  const registrar = contexto?.registrar;
  useEffect(() => id && registrar ? registrar(id, () => ref.current) : undefined, [id, registrar]);
}
const texto = v => v == null ? '' : typeof v === 'object' ? '' : String(v);
const seguroCsv = v => { const s = texto(v); const protegido = typeof v === 'string' && /^[\t\r\n ]*[=+\-@]/.test(s) ? `'${s}` : s; return `"${protegido.replace(/"/g, '""')}"`; };
const baixar = (blob, nome) => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = nome; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
const tituloFonte = id => ({ 'lancamentos': 'Lançamentos', 'resultado-por-imovel': 'Resultado por imóvel', 'financeiro': 'Despesas por imóvel', 'benchmark-rj': 'Referências de benchmark', 'dashboard-imoveis': 'Últimos imóveis', 'modelos-contrato': 'Modelos de contratos', 'executivos-comerciais': 'Executivos comerciais' }[id] || id.replace(/-/g, ' '));

async function exportar(formato, titulo, fonte) {
  const { colunas, linhas, nome } = fonte;
  const nomeArquivo = nome || 'exportacao';
  const valores = linhas.map(item => colunas.map(c => { try { return c.valor(item); } catch { return ''; } }));
  if (formato === 'csv') {
    const csv = '\uFEFF' + [colunas.map(c => seguroCsv(c.titulo)).join(';'), ...valores.map(row => row.map(seguroCsv).join(';'))].join('\r\n');
    baixar(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${nomeArquivo}.csv`); return;
  }
  if (formato === 'xlsx') {
    const mod = await import('exceljs/dist/exceljs.min.js');
    const ExcelJS = mod.default || mod;
    const wb = new ExcelJS.Workbook(); const planilha = wb.addWorksheet('Dados');
    planilha.addRow(colunas.map(c => c.titulo));
    valores.forEach(linha => planilha.addRow(linha.map(v => typeof v === 'number' && Number.isFinite(v) ? v : texto(v))));
    planilha.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    planilha.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF153C34' } };
    planilha.columns.forEach((c, idx) => { c.width = Math.min(45, Math.max(14, colunas[idx].titulo.length + 4)); });
    planilha.views = [{ state: 'frozen', ySplit: 1 }];
    const bytes = await wb.xlsx.writeBuffer();
    baixar(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${nomeArquivo}.xlsx`); return;
  }
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const pdf = new jsPDF({ orientation: colunas.length > 5 ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
  const imagem = await fetch('/images/logo-wide.png').then(r => { if (!r.ok) throw new Error('Não foi possível carregar a marca para o PDF.'); return r.blob(); }).then(blob => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); }));
  const data = new Intl.DateTimeFormat('pt-BR').format(new Date());
  autoTable(pdf, {
    head: [colunas.map(c => c.titulo)], body: valores.map(row => row.map(texto)), startY: 43,
    margin: { top: 43, bottom: 18, left: 12, right: 12 }, theme: 'striped',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.2, overflow: 'linebreak' },
    headStyles: { fillColor: [21, 60, 52], textColor: 255 }, alternateRowStyles: { fillColor: [239, 245, 241] },
    didDrawPage: () => {
      const w = pdf.internal.pageSize.getWidth(); const h = pdf.internal.pageSize.getHeight();
      pdf.setFillColor(21, 60, 52); pdf.rect(0, 0, w, 24, 'F'); pdf.addImage(imagem, 'PNG', 12, 3, 60, 17);
      pdf.setTextColor(21, 60, 52); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13); pdf.text(titulo, 12, 33);
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(90); pdf.text(`Emitido em ${data} · ${linhas.length} registro(s)`, 12, 38);
      pdf.setDrawColor(200, 177, 121); pdf.line(12, h - 13, w - 12, h - 13); pdf.setFontSize(8); pdf.text('Prospecção Brasil · Retail & Real Estate', 12, h - 8); pdf.text(`Página ${pdf.internal.getCurrentPageInfo().pageNumber}`, w - 12, h - 8, { align: 'right' });
    },
  });
  pdf.save(`${nomeArquivo}.pdf`);
}

export function ExportarHeader({ titulo }) {
  const contexto = useContext(ExportContext);
  const [aberto, setAberto] = useState(false); const [selecionado, setSelecionado] = useState(''); const [ocupado, setOcupado] = useState(false);
  const fontes = contexto?.fontes || {}; const ids = Object.keys(fontes);
  if (!ids.length) return null;
  const id = ids.includes(selecionado) ? selecionado : ids[0];
  async function executar(formato) {
    const fonte = fontes[id]?.();
    if (!fonte || fonte.loading || fonte.error) return avisar('Aguarde o carregamento dos dados para exportar.');
    if (!fonte.colunas.length) return avisar('Não há colunas disponíveis para exportação.');
    setOcupado(true);
    try { await exportar(formato, ids.length > 1 ? `${titulo} · ${tituloFonte(id)}` : titulo, fonte); setAberto(false); }
    catch (e) { avisar(e.message || 'Não foi possível exportar.'); } finally { setOcupado(false); }
  }
  return <div className="export-menu" onKeyDown={e => { if (e.key === 'Escape') setAberto(false); }}>
    <button type="button" className="btn btn-outline" aria-expanded={aberto} onClick={() => setAberto(v => !v)}><DownloadSimple size={18} /> Exportar</button>
    {aberto && <div className="export-menu-panel" aria-label="Opções de exportação">
      {ids.length > 1 && <label>Dados a exportar<select value={id} onChange={e => setSelecionado(e.target.value)}>{ids.map(chave => <option key={chave} value={chave}>{tituloFonte(chave)}</option>)}</select></label>}
      <p>Exportar os registros filtrados:</p>
      {['pdf', 'xlsx', 'csv'].map(f => <button type="button" key={f} disabled={ocupado} onClick={() => executar(f)}>{f.toUpperCase()}</button>)}
    </div>}
  </div>;
}
