// Medidas em pt tiradas do PDF modelo (A4 595,3 × 841,9 pt; margens laterais de 56,7 pt).
module.exports = `
@font-face { font-family:Gelasio; font-weight:400; src:url(/fonts/gelasio-latin-400-normal.woff2) format('woff2'); }
@font-face { font-family:Gelasio; font-weight:400; font-style:italic; src:url(/fonts/gelasio-latin-400-italic.woff2) format('woff2'); }
@font-face { font-family:Gelasio; font-weight:700; src:url(/fonts/gelasio-latin-700-normal.woff2) format('woff2'); }
@font-face { font-family:Carlito; font-weight:400; src:url(/fonts/carlito-latin-400-normal.woff2) format('woff2'); }
@font-face { font-family:Carlito; font-weight:400; font-style:italic; src:url(/fonts/carlito-latin-400-italic.woff2) format('woff2'); }
@font-face { font-family:Carlito; font-weight:700; src:url(/fonts/carlito-latin-700-normal.woff2) format('woff2'); }
* { box-sizing:border-box; } html { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
body { margin:0; background:#e9ebe7; font-family:Carlito,Calibri,Arial,sans-serif; }
.toolbar { max-width:595.3pt; margin:18px auto; display:flex; justify-content:space-between; align-items:center; gap:16px; font:13px Arial,sans-serif; color:#153c34; }
.toolbar span { display:block; font-size:11px; color:#67756f; margin-top:3px; } .toolbar button { border:0; background:#153c34; color:#fff; font-weight:700; padding:11px 16px; border-radius:6px; cursor:pointer; }
.print-help { max-width:595.3pt; margin:0 auto 30px; font:11px Arial,sans-serif; color:#67756f; text-align:center; }
main { display:flex; flex-direction:column; align-items:center; gap:18px; padding-bottom:24px; }

.pg { position:relative; width:595.3pt; height:841.9pt; flex:none; overflow:hidden; background:#fff; color:#33393d; font-size:10.5pt; line-height:15pt; box-shadow:0 8px 30px #0002; }
.pg p { margin:0; } .pg b.v, .pg b.ph { font-weight:700; color:#6e4600; } .pg b.ph { background:#fcefc7; }

/* Cabeçalho e rodapé de cada página */
.hl { position:absolute; left:56.7pt; top:25.6pt; width:27.7pt; height:22.5pt; }
.hb { position:absolute; left:99.4pt; top:41.3pt; font:8.5pt/12pt Gelasio,Georgia,serif; color:#1c2124; white-space:pre; letter-spacing:.47pt; }
.hr { position:absolute; right:58.7pt; top:44pt; font:700 7.5pt/8.7pt Carlito,sans-serif; color:#b08a3e; white-space:pre; letter-spacing:.53pt; }
.hx { position:absolute; left:56.7pt; right:56.7pt; top:58.6pt; border-top:.5pt solid #e3ddd0; }
.pg footer { position:absolute; left:56.7pt; right:56.7pt; top:803.6pt; display:flex; justify-content:space-between; align-items:baseline; font-size:7.5pt; line-height:12pt; color:#666c70; }
.pg footer b { font-size:7.5pt; } .pg footer span:last-child { font-size:10.5pt; color:#000; }

.bd { position:absolute; left:56.7pt; right:56.7pt; top:75.33pt; text-align:justify; }
.eb { font-weight:700; font-size:8.5pt; line-height:10pt; color:#b08a3e; white-space:pre; text-align:left; letter-spacing:.6pt; }
.bd h1 { margin:0 0 18.7pt; padding-bottom:6.2pt; border-bottom:1pt solid #b08a3e; font:400 18pt/23pt Gelasio,Georgia,serif; color:#1c2124; text-align:left; padding-top:1.5pt; }
.bd h1 b { font:700 18pt/23pt Carlito,sans-serif; }
.sc { margin-top:25.8pt; }
.bd p + p { margin-top:7.2pt; } .bd > p, .carta p { word-spacing:-.2pt; }
.lb { margin:5.8pt 0 5.3pt !important; font-weight:700; font-size:8.5pt; line-height:10.67pt; color:#8c6a2c; white-space:pre; text-align:left; letter-spacing:.18pt; }
.nota { font-style:italic; color:#666c70; margin-bottom:5pt !important; text-align:left; } .nota.topo { text-align:justify; margin-bottom:0 !important; }

.bd ul { list-style:none; margin:6.3pt 0 0; padding:0; text-align:left; }
.bd li { position:relative; padding-left:20pt; line-height:13.33pt; margin-bottom:3.54pt; }
.bd li::before { content:''; position:absolute; left:8.2pt; top:5.2pt; width:3pt; height:3pt; background:#b08a3e; }
.cols { display:grid; grid-template-columns:246.7pt 1fr; margin-bottom:0; } .cols ul:last-child li { padding-left:13.3pt; } .cols ul:last-child li::before { left:0; }
.cols ul:first-child { padding-right:6pt; } .cols ul:last-child { padding-right:10pt; }
.apos { margin-top:17pt !important; } .apos2 { margin-top:20pt !important; } .topo { margin-top:0 !important; } .topo ul { margin-top:0; }

.bd h2 { margin:17pt 0 6.5pt; padding-left:9.3pt; border-left:2pt solid #b08a3e; font:400 13.5pt/17pt Gelasio,Georgia,serif; color:#1c2124; text-align:left; display:flex; align-items:baseline; gap:9pt; }
.bd h2 b { font:700 14pt/17pt Gelasio,Georgia,serif; color:#b08a3e; } .bd h2.topo { margin-top:0; } .cols + h2 { margin-top:26pt; } ul + h2 { margin-top:22.5pt; } .topo > .lb:first-child { margin-top:0 !important; } .lb + .cols ul, .lb + ul { margin-top:1.5pt; } .cols + .lb { margin-top:21pt !important; } p + .lb { margin-top:9.4pt !important; }

table { border-collapse:collapse; width:100%; font-size:10pt; text-align:left; }
.kv th, .kv td { height:22.2pt; padding:0 8pt; border-bottom:.5pt solid #ddd6c6; line-height:13pt; vertical-align:middle; } .kv.first tr:first-child > * { border-top:.5pt solid #ddd6c6; } .kv.first, .kv.dark { margin-top:-3.8pt; }
.kv th { background:#f7f3ea; font-weight:700; color:#33393d; } .kv th:first-child { width:120pt; } .kv.a th:first-child { width:161pt; } .kv.b th:first-child { width:202pt; }
.kv.dark tr:first-child th { height:18.7pt; background:#1c2124; color:#e9d9b0; font-size:8pt; white-space:pre; border:0; } .kv.dark tr:first-child th + th { border-left:.5pt solid #fff; }
.kv.dark td { padding-top:4pt; padding-bottom:4pt; }
.etapas { margin:5pt 0 12pt; } .etapas th { height:18.7pt; background:#1c2124; color:#e9d9b0; font-size:8pt; white-space:pre; padding:0 8pt; } .etapas th:first-child { text-align:center; }
.etapas td { height:24.4pt; padding:0 8pt; border-bottom:.5pt solid #ddd6c6; } .etapas td:first-child { width:60pt; background:#f1e6cc; border-bottom-color:#fff; font:700 12.5pt Gelasio,Georgia,serif; color:#8c6a2c; text-align:center; }

.carta { margin-top:24pt; padding:11pt 15pt 12.5pt 15.3pt; background:#f7f3ea; border-left:2pt solid #b08a3e; } .carta p + p { margin-top:7.2pt; }
.saud { font:11.5pt/17pt Gelasio,Georgia,serif; color:#1c2124; margin-bottom:6pt !important; }
.limites { margin-top:26pt; } .limites .lb { margin-top:0 !important; }
.tags { display:flex; gap:6pt; margin:1pt 0 12pt !important; } .tags span { background:#f1e6cc; color:#1c2124; font-weight:700; font-size:9.5pt; line-height:12.5pt; padding:0 4pt; }

.bd ol { list-style:none; margin:6pt 0 0; padding:0; text-align:left; } .bd ol li { padding-left:28pt; line-height:13.33pt; margin-bottom:4.1pt; } .bd ol li::before { display:none; }
.bd ol b { position:absolute; left:6.5pt; font:700 11pt/13.33pt Gelasio,Georgia,serif; color:#b08a3e; }
.fecho { margin:31pt 30pt 0 !important; font:italic 11.5pt/16.8pt Gelasio,Georgia,serif; color:#1c2124; text-align:center; } .fecho b { font:700 11.5pt Carlito,sans-serif; font-style:normal; }
.dm { display:block; width:5pt; height:5pt; margin:9pt auto 0; background:#b08a3e; transform:rotate(45deg); }

.ass { margin-top:28pt; width:362pt; } .ass i { display:block; border-top:.5pt solid #8d8d8d; margin-top:34pt; } .ass i:first-child { margin-top:0; }
.ass p { font-weight:700; font-size:7.5pt; line-height:10pt; color:#8c6a2c; white-space:pre; margin-top:3.5pt !important; letter-spacing:.3pt; } .ass span b { font-size:7.5pt; }
.obs { margin-top:25pt !important; } .caixa { height:110pt; border:.5pt solid #ddd6c6; }

/* Capa: imagem do modelo (logo e moldura) + textos sobrepostos */
.capa { background:#15191c url(/proposta/capa.jpg) center/100% 100% no-repeat; color:#a89b84; text-align:center; }
.capa p { position:absolute; left:0; right:0; white-space:pre; } .capa b.v { color:#e9d9b0; }
.capa .dm { position:absolute; left:50%; top:372pt; margin:0 0 0 -2.5pt; }
.c1 { top:389.3pt; font:15.5pt/21.3pt Gelasio,Georgia,serif; color:#d9b567; letter-spacing:.95pt; } .c2 { top:412pt; font-size:8pt; line-height:10pt; letter-spacing:9.6pt; text-indent:9.6pt; }
.c3 { top:466.7pt; font-weight:700; font-size:9.5pt; line-height:10.7pt; color:#b08a3e; letter-spacing:1.8pt; }
.c4 { top:483.3pt; font:22pt/28pt Gelasio,Georgia,serif; color:#f3eee4; white-space:normal !important; } .c4 em { color:#d9b567; }
.c5 { top:604.7pt; font-size:7.5pt; line-height:9.3pt; letter-spacing:1.6pt; } .c6 { top:618pt; font-size:12pt; line-height:14.7pt; } .c7 { top:635.3pt; font-size:9.5pt; line-height:10.7pt; } .c8 { top:676.7pt; font-size:8pt; line-height:10pt; }

@media screen and (max-width:820px) { main { align-items:flex-start; overflow-x:auto; padding:0 8px 24px; } }
@media print {
  @page { size:A4 portrait; margin:0; }
  body { background:#fff; } .toolbar,.print-help { display:none !important; } main { display:block; padding:0; }
  .pg { box-shadow:none; break-after:page; width:210mm; height:297mm; } .pg:last-child { break-after:auto; }
}
`;
