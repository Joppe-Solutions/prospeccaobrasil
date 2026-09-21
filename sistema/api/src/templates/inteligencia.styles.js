module.exports = `
:root { color-scheme:light; --ink:#153c34; --muted:#67756f; --gold:#a27a35; --line:#dce3dd; --paper:#f4f1ea; }
* { box-sizing:border-box; }
body { margin:0; background:#e8ebe7; color:var(--ink); font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:1.5; }
a { color:inherit; text-decoration:none; }
a:focus-visible,button:focus-visible { outline:3px solid var(--gold); outline-offset:4px; }
button { font:inherit; cursor:pointer; }
.toolbar { max-width:297mm; margin:20px auto 14px; display:flex; justify-content:space-between; align-items:center; gap:16px; padding:0 8px; }
.toolbar strong,.toolbar span { display:block; }.toolbar strong { font-size:14px; }.toolbar span { font-size:11px; color:var(--muted); }
.toolbar button { background:var(--ink); color:white; border:0; border-radius:6px; padding:12px 18px; font-weight:700; }

.sheet { background:white; width:297mm; height:210mm; margin:0 auto 22px; box-shadow:0 8px 32px #153c3414; overflow:hidden; position:relative; display:flex; }
.sheet-inner { flex:1; padding:14mm 16mm 12mm; display:flex; flex-direction:column; }
.page-top { display:flex; justify-content:space-between; align-items:baseline; font-size:8px; letter-spacing:1.4px; text-transform:uppercase; color:var(--muted); border-bottom:1px solid var(--line); padding-bottom:8px; margin-bottom:18px; }
.page-top strong { color:var(--ink); font-weight:700; }
.geo-brand { writing-mode:vertical-rl; transform:rotate(180deg); background:var(--ink); color:#e8d9a8; font-size:13px; letter-spacing:7px; font-weight:700; display:flex; align-items:center; justify-content:center; padding:14px 7px; flex:0 0 auto; }
.page-foot { margin-top:auto; border-top:1px solid var(--line); padding-top:8px; display:flex; justify-content:space-between; font-size:8px; color:var(--muted); }

.cover { }
.cover-grid { flex:1; display:flex; }
.cover-left { flex:1; padding:16mm 14mm 12mm 18mm; display:flex; flex-direction:column; justify-content:space-between; }
.cover-right { flex:0 0 34%; background:var(--ink) center/cover no-repeat; position:relative; }
.cover-right::before { content:''; position:absolute; left:0; top:0; bottom:0; width:4px; background:var(--gold); }
.cover-right-inner { position:absolute; left:12mm; bottom:12mm; display:flex; flex-direction:column; gap:6px; }
.cover-code { font:44px/1 Georgia,serif; color:#fff; letter-spacing:1px; }
.cover-tag { font-size:11px; letter-spacing:3px; text-transform:uppercase; color:#e8d9a8; }
.cover-logo { width:190px; height:auto; }
.cover-mid h1 { font:68px/1.05 Georgia,serif; letter-spacing:-1px; margin:16px 0; }
.cover-mid .eyebrow, .eyebrow { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:3px; color:var(--gold); }
.cover-place { font-size:22px; letter-spacing:4px; text-transform:uppercase; color:var(--muted); }
.cover-rule { width:120px; height:3px; background:var(--gold); margin:22px 0; }
.cover-bottom { display:flex; justify-content:space-between; align-items:flex-end; font-size:10px; color:var(--muted); }
.map-real { position:relative; overflow:hidden; border-radius:6px; border:1px solid var(--line); flex:0 0 auto; }
.map-attr { position:absolute; right:4px; bottom:2px; font-size:8px; color:#555; background:rgba(255,255,255,.8); padding:1px 4px; border-radius:3px; }

h2.sec { font:26px/1.15 Georgia,serif; font-weight:400; margin:0 0 18px; }
h2.sec span { display:block; font-family:Arial,sans-serif; font-size:10px; letter-spacing:2.5px; color:var(--gold); font-weight:700; margin-bottom:6px; }
.body-cols { display:grid; grid-template-columns:1fr 1fr; gap:34px; font-size:11.5px; line-height:1.75; }
.body-cols p { margin:0 0 12px; } .body-cols ul { margin:0 0 12px; padding-left:18px; } .body-cols li { margin-bottom:7px; }

table.crit, table.demo { border-collapse:collapse; width:100%; font-size:11px; }
table.crit th, table.crit td, table.demo th, table.demo td { border:1px solid var(--line); padding:7px 10px; text-align:right; }
table.crit th:first-child, table.crit td:first-child, table.demo th:first-child, table.demo td:first-child { text-align:left; }
table.crit th, table.demo th { background:var(--ink); color:white; font-weight:600; letter-spacing:.6px; font-size:10px; text-transform:uppercase; }
table.demo tr.hl td { background:#f4f6f1; font-weight:700; }
table.demo tr.dim td { color:var(--muted); }
.src { font-size:8.5px; color:var(--muted); margin-top:8px; font-style:italic; }
.note { border:1px dashed var(--gold); border-radius:6px; padding:12px 14px; font-size:10.5px; background:#fbfaf6; color:#6b571f; margin-top:14px; }

.map-box { flex:1; display:flex; gap:30px; align-items:center; }
.map-visual { flex:0 0 auto; }
.map-info { flex:1; }
.map-info h3 { font:20px Georgia,serif; margin:0 0 10px; }
.map-info p { font-size:11px; color:var(--muted); margin:0 0 6px; }
.map-info .facts { margin-top:12px; }
.facts>div { display:flex; justify-content:space-between; gap:12px; padding:6px 0; border-bottom:1px solid #edf0eb; font-size:10.5px; }
.facts dt { color:var(--muted); } .facts dd { margin:0; font-weight:600; }

.score-line { display:flex; align-items:center; gap:24px; border:1px solid var(--line); border-radius:8px; padding:16px 20px; margin-bottom:18px; }
.score-ring { width:80px; height:80px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex:0 0 auto; }
.score-ring>span { background:white; width:60px; height:60px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:22px; font-weight:700; }
ul.findings { margin:0; padding:0; list-style:none; }
ul.findings li { padding:8px 0 8px 20px; border-bottom:1px solid #edf0eb; font-size:11px; position:relative; }
ul.findings li::before { content:''; position:absolute; left:0; top:13px; width:8px; height:8px; border-radius:2px; }
ul.findings.fortes li::before { background:#4f9e78; } ul.findings.atencao li::before { background:var(--gold); }
.tags { display:flex; flex-wrap:wrap; gap:8px; } .tag { border:1px solid var(--line); border-radius:20px; padding:6px 13px; font-size:10px; background:#f7f8f5; }
.recommend { border-left:3px solid var(--gold); background:#f7f8f5; padding:13px 16px; font-size:11.5px; margin:14px 0; }
.aviso { border:1px solid #e3d5b5; background:#faf6ea; color:#6b571f; border-radius:6px; padding:11px 13px; font-size:10px; line-height:1.6; margin:12px 0; }
.two-col { display:grid; grid-template-columns:1fr 1fr; gap:30px; }

.print-help { margin:0 auto 28px; max-width:297mm; text-align:center; color:var(--muted); font-size:11px; padding:0 20px; }
@media screen and (max-width:1100px) {
 .sheet { width:100%; height:auto; min-height:0; flex-direction:column; }
 .geo-brand { writing-mode:horizontal-tb; transform:none; padding:10px 14px; letter-spacing:4px; font-size:11px; }
 .cover-grid { flex-direction:column; } .cover-right { min-height:160px; flex:auto; }
 .cover-mid h1 { font-size:40px; } .body-cols,.two-col { grid-template-columns:1fr; } .map-box { flex-direction:column; align-items:flex-start; }
 .map-real { width:100%!important; }
}
@media print {
 @page { size:A4 landscape; margin:10mm 12mm 12mm; @bottom-right { content:counter(page) ' / ' counter(pages); font-family:Arial,sans-serif; font-size:8pt; color:#67756f; } }
 body { background:white; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
 .toolbar,.print-help { display:none!important; }
 .sheet { width:auto; height:auto; min-height:0; margin:0; box-shadow:none; page-break-after:always; overflow:visible; }
 .sheet:last-child { page-break-after:auto; }
 .page-top,.score-line,table.demo,table.crit,.map-box,.page-foot { break-inside:avoid; }
}
`;
