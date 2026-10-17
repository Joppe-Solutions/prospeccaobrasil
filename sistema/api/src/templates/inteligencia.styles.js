// Cada folha mede exatamente A4 paisagem (297 × 210 mm), na tela e no papel. Dentro dela o conteúdo é flex:
// o corpo ocupa o espaço que sobra entre o cabeçalho e o rodapé, e os gráficos escalam para caber.
module.exports = `
:root { color-scheme:light; --ink:#153c34; --muted:#67756f; --gold:#a27a35; --line:#dce3dd; --paper:#f4f1ea; --soft:#f4f6f1; }
* { box-sizing:border-box; }
html, body { margin:0; padding:0; }
body { background:#e8ebe7; color:var(--ink); font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:1.45; }
a { color:inherit; text-decoration:none; }
a:focus-visible,button:focus-visible { outline:3px solid var(--gold); outline-offset:4px; }
button { font:inherit; cursor:pointer; }
.toolbar { width:297mm; max-width:100%; margin:18px auto 14px; display:flex; justify-content:space-between; align-items:center; gap:16px; padding:0 4px; }
.toolbar strong,.toolbar span { display:block; }.toolbar strong { font-size:14px; }.toolbar span { font-size:11px; color:var(--muted); }
.toolbar button { background:var(--ink); color:white; border:0; border-radius:6px; padding:12px 18px; font-weight:700; }
main { display:flex; flex-direction:column; align-items:center; gap:18px; padding-bottom:12px; }

/* Folha A4 paisagem exata */
.sheet { background:white; width:297mm; height:210mm; flex:none; overflow:hidden; position:relative; display:flex; box-shadow:0 8px 32px #153c3414; }
.geo-brand { writing-mode:vertical-rl; transform:rotate(180deg); background:var(--ink); color:#e8d9a8; font-size:11px; letter-spacing:6px; font-weight:700; display:flex; align-items:center; justify-content:center; width:11mm; flex:0 0 11mm; }
.sheet-inner { flex:1; min-width:0; min-height:0; padding:7mm 11mm 5mm 10mm; display:flex; flex-direction:column; overflow:hidden; }
.page-top { display:flex; justify-content:space-between; align-items:baseline; font-size:8px; letter-spacing:1.3px; text-transform:uppercase; color:var(--muted); border-bottom:1px solid var(--line); padding-bottom:6px; margin-bottom:10px; flex:none; }
h2.sec { font:23px/1.1 Georgia,serif; font-weight:400; margin:0 0 10px; flex:none; }
h2.sec span { display:block; font-family:Arial,sans-serif; font-size:9px; letter-spacing:2.4px; color:var(--gold); font-weight:700; margin-bottom:4px; }
.page-body { flex:1; min-height:0; display:flex; flex-direction:column; gap:10px; overflow:hidden; }
.page-foot { flex:none; margin-top:8px; border-top:1px solid var(--line); padding-top:6px; display:flex; justify-content:space-between; gap:20px; font-size:8px; color:var(--muted); }
.page-foot span:first-child { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

/* colunas */
.cols2 { display:grid; grid-template-columns:1fr 1fr; gap:22px; min-height:0; }
.cols2.fill { flex:1; }
.col { min-width:0; min-height:0; display:flex; flex-direction:column; gap:10px; }
.col.texto { font-size:13.5px; line-height:1.75; }
.texto p { margin:0 0 12px; } .texto ul { margin:0 0 12px; padding-left:20px; } .texto li { margin-bottom:11px; }
.texto li.alerta { color:#8a5a14; }
.intro { margin:0; font-size:11px; color:var(--muted); flex:none; }
.cartoes { margin-top:auto; display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
.cartoes>div { background:var(--soft); border-left:3px solid var(--gold); padding:20px 18px; }
.cartoes span { display:block; font-size:8px; letter-spacing:1.6px; color:var(--gold); font-weight:700; }
.cartoes strong { display:block; font:21px Georgia,serif; margin:6px 0 3px; font-weight:400; } .cartoes small { color:var(--muted); font-size:10.5px; }

/* sumário, exemplo e elementos de apoio */
.sumario { flex:none; border:1px solid var(--line); border-radius:6px; padding:10px 14px; }
.sumario h3 { margin:0 0 6px; font-size:11px; letter-spacing:1.4px; text-transform:uppercase; color:var(--gold); }
.sumario ol { margin:0; padding:0; list-style:none; columns:3; column-gap:22px; }
.sumario li { font-size:12px; padding:5px 0; break-inside:avoid; color:var(--ink); } .sumario li span { display:inline-block; width:22px; color:var(--gold); font-weight:700; }
.exemplo { margin-top:auto; background:var(--soft); border-left:3px solid var(--gold); padding:11px 14px; font-size:11px; line-height:1.55; }
.exemplo strong { display:block; font-size:10px; letter-spacing:1.4px; text-transform:uppercase; color:var(--gold); margin-bottom:3px; } .exemplo p { margin:0; }
.raios { display:flex; flex-wrap:wrap; gap:14px; margin-top:14px; font-size:10px; color:var(--muted); }
.raios span { display:inline-flex; align-items:center; gap:6px; } .raios i { width:20px; height:0; border-top:2px solid var(--gold); } .raios i.tracejado { border-top-style:dashed; }
.raios b { width:10px; height:10px; border-radius:50%; background:var(--ink); border:2px solid #fff; box-shadow:0 0 0 1px var(--ink); }

/* tabelas */
table.demo { border-collapse:collapse; width:100%; font-size:10.5px; flex:none; }
table.demo th, table.demo td { border:1px solid var(--line); padding:5px 8px; text-align:right; }
table.demo th:first-child, table.demo td:first-child { text-align:left; }
table.demo th { background:var(--ink); color:white; font-weight:600; letter-spacing:.5px; font-size:9px; text-transform:uppercase; }
table.demo tr.hl td { background:var(--soft); font-weight:700; }
table.demo tr.dim td { color:var(--muted); }
table.demo td:not(:first-child) { white-space:nowrap; } table.demo small { color:var(--muted); font-weight:400; }
table.demo.compact { font-size:9.5px; } table.demo.compact th, table.demo.compact td { padding:3px 7px; }
table.demo.crit { font-size:12px; } table.demo.crit td, table.demo.crit th { text-align:center; padding:11px 8px; } table.demo.crit td:first-child, table.demo.crit th:first-child { text-align:center; }
table.demo.classes { font-size:11.5px; } table.demo.classes th, table.demo.classes td { padding:6px 8px; text-align:center; } table.demo.classes th:first-child, table.demo.classes td:first-child { text-align:left; }
table.demo.solto { font-size:12px; } table.demo.solto th, table.demo.solto td { padding:12px 12px; } table.demo.solto th { font-size:9.5px; }
.src { font-size:8.5px; color:var(--muted); margin:2px 0 0; font-style:italic; flex:none; }
.note { border:1px dashed var(--gold); border-radius:6px; padding:9px 12px; font-size:10px; background:#fbfaf6; color:#6b571f; margin:0; flex:none; }
.note.compacta { font-size:9px; line-height:1.45; padding:7px 11px; }

/* gráficos */
.chart-box { display:flex; flex-direction:column; min-height:0; border:1px solid var(--line); border-radius:6px; padding:9px 12px; }
.chart-box.grow { flex:1; } .col.chart-box { flex:1; } .col>.chart-box { flex:1; }
.chart-box h3 { margin:0 0 4px; font-size:11px; color:var(--ink); flex:none; }
.chart { position:relative; flex:1; min-height:0; }
.chart svg { position:absolute; inset:0; width:100%; height:100%; }
.charts { display:flex; flex-direction:column; gap:10px; } .charts .chart-box { flex:1; }
.legenda-mini { margin:3px 0 0; font-size:9px; color:var(--muted); flex:none; } .legenda-mini i { display:inline-block; width:9px; height:9px; border-radius:2px; margin:0 4px 0 10px; vertical-align:-1px; } .legenda-mini i:first-child { margin-left:0; }
.destaque { flex:none; display:flex; align-items:baseline; gap:14px; background:var(--ink); color:#fff; border-radius:6px; padding:12px 18px; }
.destaque span { font-size:9px; letter-spacing:1.6px; color:#e8d9a8; font-weight:700; } .destaque strong { font:34px/1 Georgia,serif; font-weight:400; } .destaque small { color:#cfe0d6; font-size:10px; }

/* localização */
.map-box { flex:1; min-height:0; display:flex; gap:22px; align-items:flex-start; }
.map-slot { flex:0 0 auto; }
.map-real { position:relative; overflow:hidden; border-radius:6px; border:1px solid var(--line); zoom:.6; }
.map-visual { width:614px; height:512px; display:block; }
.map-attr { position:absolute; right:4px; bottom:2px; font-size:10px; color:#555; background:rgba(255,255,255,.85); padding:1px 5px; border-radius:3px; }
.map-info { flex:1; min-width:0; }
.map-info h3 { font:18px Georgia,serif; margin:0 0 8px; font-weight:400; }
.map-info p { font-size:10.5px; color:var(--muted); margin:0 0 6px; } .map-info .link { margin-top:12px; } .map-info .link a { text-decoration:underline; color:var(--ink); }
.map-info .no-raio { margin-top:14px; }
.facts { margin:10px 0 0; } .facts>div { display:flex; justify-content:space-between; gap:12px; padding:6px 0; border-bottom:1px solid #edf0eb; font-size:10.5px; }
.facts dt { color:var(--muted); } .facts dd { margin:0; font-weight:600; text-align:right; }

/* síntese */
.kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; flex:none; }
.kpis>div { border:1px solid var(--line); border-top:3px solid var(--gold); border-radius:4px; padding:10px 12px; background:var(--soft); }
.kpis span { display:block; font-size:8.5px; letter-spacing:1.3px; text-transform:uppercase; color:var(--muted); font-weight:700; }
.kpis strong { display:block; font:26px/1.15 Georgia,serif; font-weight:400; margin:5px 0 1px; } .kpis small { font-size:9.5px; color:var(--muted); }
ul.findings { margin:0; padding:0; list-style:none; }
ul.findings li { padding:6px 0 6px 20px; border-bottom:1px solid #edf0eb; font-size:10.5px; position:relative; }
ul.findings li::before { content:''; position:absolute; left:0; top:11px; width:8px; height:8px; border-radius:2px; }
ul.findings.fortes li::before { background:#4f9e78; } ul.findings.atencao li::before { background:var(--gold); }
ul.findings.leitura li { font-size:12.5px; padding:10px 0 10px 22px; } ul.findings.leitura li::before { top:16px; }
.sintese { align-items:stretch; }
ul.findings.grande li { font-size:13.5px; padding:15px 0 15px 24px; } ul.findings.grande li::before { top:21px; }

/* triagem */
.triagem-topo { flex:none; display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.score-line { display:flex; align-items:center; gap:22px; border:1px solid var(--line); border-radius:8px; padding:14px 20px; }
.score-line p { margin:3px 0 0; font-size:10.5px; color:var(--muted); }
.score-ring { width:84px; height:84px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex:0 0 auto; }
.score-ring>span { background:white; width:64px; height:64px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:700; }
h3.sub { font:16px Georgia,serif; font-weight:400; margin:0 0 6px; } h3.sub span { font:700 9px Arial,sans-serif; letter-spacing:2px; color:var(--gold); margin-right:8px; }
.rodape-triagem { display:flex; flex-direction:column; gap:8px; margin-top:auto; }
.tags { display:flex; flex-wrap:wrap; gap:6px; } .tag { border:1px solid var(--line); border-radius:20px; padding:4px 11px; font-size:9.5px; background:var(--soft); }
.recommend { border-left:3px solid var(--gold); background:var(--soft); padding:14px 18px; font-size:12.5px; line-height:1.55; } .recommend strong { display:block; font-size:10px; letter-spacing:1.4px; text-transform:uppercase; color:var(--gold); margin-bottom:3px; } .recommend p { margin:0; }
.aviso { border:1px solid #e3d5b5; background:#faf6ea; color:#6b571f; border-radius:6px; padding:8px 12px; font-size:9px; line-height:1.5; margin:0; }
.na-rua { font-size:10px; line-height:1.5; margin:0; }
.contato-final { margin-top:auto; display:grid; grid-template-columns:.9fr .9fr 1.7fr 1.2fr; gap:12px; }
.contato-final>div { background:var(--soft); border-left:3px solid var(--gold); padding:12px 14px; }
.contato-final span { display:block; font-size:8px; letter-spacing:1.6px; color:var(--gold); font-weight:700; } .contato-final strong { display:block; margin-top:4px; font-size:11.5px; }
.assinatura { margin:18px 0 6px; text-align:center; } .assinatura .logo { width:150px; height:auto; } .assinatura p { margin:8px 0 0; font-size:9px; letter-spacing:2px; color:var(--muted); }

/* capa */
.cover { }
.cover-grid { flex:1; display:flex; min-width:0; }
.cover-left { flex:1; min-width:0; padding:15mm 14mm 11mm 18mm; display:flex; flex-direction:column; justify-content:space-between; }
.cover-right { flex:0 0 34%; background:var(--ink) center/cover no-repeat; position:relative; }
.cover-right::before { content:''; position:absolute; left:0; top:0; bottom:0; width:4px; background:var(--gold); }
.cover-right-inner { position:absolute; left:12mm; bottom:12mm; display:flex; flex-direction:column; gap:6px; }
.cover-code { font:44px/1 Georgia,serif; color:#fff; letter-spacing:1px; }
.cover-tag { font-size:11px; letter-spacing:3px; text-transform:uppercase; color:#e8d9a8; }
.cover-logo { width:190px; height:auto; }
.cover-mid h1 { font:62px/1.05 Georgia,serif; letter-spacing:-1px; margin:14px 0; font-weight:400; }
.eyebrow { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:3px; color:var(--gold); }
.cover-place { font-size:20px; letter-spacing:4px; text-transform:uppercase; color:var(--muted); }
.cover-sub { margin-top:10px; font-size:13px; color:var(--muted); }
.cover-rule { width:120px; height:3px; background:var(--gold); margin:20px 0; }
.cover-bottom { display:flex; justify-content:space-between; align-items:flex-end; font-size:10px; color:var(--muted); }

.print-help { margin:0 auto 28px; max-width:297mm; text-align:center; color:var(--muted); font-size:11px; padding:0 20px; }

/* tela estreita: a folha mantém o tamanho e é reduzida inteira (nada reflui) */
@media screen and (max-width:1150px) { .sheet { zoom:.8; } .toolbar { zoom:.9; } }
@media screen and (max-width:960px) { .sheet { zoom:.62; } }
@media screen and (max-width:740px) { .sheet { zoom:.46; } }
@media screen and (max-width:540px) { .sheet { zoom:.34; } }

@media print {
 @page { size:297mm 210mm; margin:0; }
 html, body { background:white; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
 .toolbar,.print-help { display:none!important; }
 main { display:block; padding:0; gap:0; }
 /* 0,4 mm de folga: o arredondamento do navegador não pode empurrar uma folha em branco */
 .sheet { zoom:1; width:297mm; height:209.6mm; margin:0; box-shadow:none; overflow:hidden; break-after:page; page-break-after:always; break-inside:avoid; }
 .sheet:last-of-type { break-after:auto; page-break-after:auto; }
}
`;
