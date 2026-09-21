module.exports = `
:root { color-scheme:light; --ink:#153c34; --muted:#67756f; --gold:#a27a35; --line:#dce3dd; --red:#a4442f; }
* { box-sizing:border-box; }
body { margin:0; background:#eef1ed; color:var(--ink); font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:1.55; }
a { color:inherit; text-decoration:none; }
button { font:inherit; cursor:pointer; }
a:focus-visible,button:focus-visible { outline:3px solid var(--gold); outline-offset:4px; }
.toolbar { max-width:210mm; margin:24px auto 18px; display:flex; justify-content:space-between; align-items:center; gap:16px; }
.toolbar strong,.toolbar span { display:block; }.toolbar strong { font-size:14px; }.toolbar span { font-size:11px; color:var(--muted); }
.toolbar button { background:var(--ink); color:white; border:0; border-radius:6px; padding:12px 18px; font-weight:700; }
.sheet { background:white; width:210mm; min-height:297mm; padding:13mm 14mm 10mm; margin:0 auto 24px; box-shadow:0 8px 32px #153c3410; overflow-wrap:anywhere; display:flex; flex-direction:column; }
.document-header { display:flex; align-items:center; justify-content:space-between; gap:24px; border-bottom:1px solid var(--line); padding-bottom:16px; }
.logo { width:160px; height:47px; object-fit:contain; display:block; }
.reference { text-align:right; flex:0 0 auto; }.reference span { display:block; font-size:9px; text-transform:uppercase; letter-spacing:1.5px; color:var(--muted); }.reference strong { font-size:14px; font-weight:600; }
.document-footer { border-top:1px solid var(--line); padding-top:10px; margin-top:auto; display:flex; justify-content:space-between; gap:20px; font-size:8px; color:var(--muted); }
.document-footer span { display:block; }.document-footer strong { font-size:9px; color:var(--ink); }.document-footer>div:last-child { text-align:right; }
.eyebrow { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1.8px; color:var(--gold); }
h1 { font-family:Georgia,'Times New Roman',serif; font-size:30px; line-height:1.15; font-weight:400; margin:10px 0 6px; letter-spacing:-.5px; }
h2 { font-size:13px; margin:0 0 12px; line-height:1.4; }h2>span { font-size:9px; color:var(--gold); margin-right:6px; }
h3 { font-size:12px; margin:0 0 8px; }
p { margin:0; }.muted { color:var(--muted); }
.intro { padding:20px 0 16px; }.intro .location { color:var(--muted); font-size:11px; }
.aviso { border:1px solid #e3d5b5; background:#faf6ea; color:#6b571f; border-radius:6px; padding:12px 14px; font-size:10px; line-height:1.6; margin:14px 0; }
.score-row { display:flex; align-items:center; gap:26px; border-top:2px solid var(--ink); border-bottom:1px solid var(--line); padding:18px 0; margin:6px 0 20px; }
.score-ring { width:86px; height:86px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex:0 0 auto; }
.score-ring>span { background:white; width:64px; height:64px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:700; }
.score-copy { flex:1; }.score-copy strong { font-size:16px; display:block; margin-bottom:4px; }.score-copy p { font-size:11px; color:var(--muted); }
.kpis { display:grid; grid-template-columns:repeat(4,1fr); border:1px solid var(--line); border-radius:6px; margin-bottom:22px; }
.kpis>div { padding:14px 16px; border-left:1px solid var(--line); }.kpis>div:first-child { border-left:0; }
.kpis span { font-size:8px; text-transform:uppercase; letter-spacing:1.1px; color:var(--muted); font-weight:700; display:block; }
.kpis strong { font-size:15px; display:block; margin-top:4px; }
.facts { margin:0; }.facts>div { display:flex; justify-content:space-between; align-items:baseline; gap:12px; padding:7px 0; border-bottom:1px solid #edf0eb; font-size:10px; }
.facts dt { color:var(--muted); }.facts dd { margin:0; font-weight:600; text-align:right; }
.two-col { display:grid; grid-template-columns:1fr 1fr; gap:28px; margin-bottom:22px; }
ul.findings { margin:0; padding:0; list-style:none; }ul.findings li { padding:9px 0 9px 22px; border-bottom:1px solid #edf0eb; font-size:11px; position:relative; }
ul.findings li::before { content:''; position:absolute; left:0; top:14px; width:9px; height:9px; border-radius:2px; }
ul.findings.fortes li::before { background:#4f9e78; }ul.findings.atencao li::before { background:var(--gold); }
.tags { display:flex; flex-wrap:wrap; gap:8px; margin:10px 0; }
.tag { border:1px solid var(--line); border-radius:20px; padding:6px 13px; font-size:10px; background:#f7f8f5; }
.recommend { border-left:3px solid var(--gold); background:#f7f8f5; padding:14px 16px; font-size:12px; margin:16px 0; }
.section { margin-bottom:24px; } .section-intro { margin:22px 0 18px; }.section-intro h2 { font:26px/1.2 Georgia,serif; margin:8px 0; }.section-intro p { color:var(--muted); font-size:11px; }
.method { font-size:10px; color:var(--muted); line-height:1.8; } .method li { margin-bottom:8px; }
.missing { border:1px dashed var(--gold); border-radius:6px; padding:12px 14px; font-size:10px; background:#fbfaf6; }
.print-help { margin:0 auto 30px; max-width:210mm; text-align:center; color:var(--muted); font-size:11px; padding:0 20px; }
@media screen and (max-width:800px) {
 .toolbar { margin:16px; }.toolbar button { font-size:11px; padding:10px 12px; }
 .sheet { width:100%; min-height:0; padding:25px 22px; margin-bottom:12px; box-shadow:none; }
 .logo { width:135px; height:auto; }h1 { font-size:25px; }.kpis { grid-template-columns:1fr 1fr; }.kpis>div:nth-child(3) { border-left:0; border-top:1px solid var(--line); }.kpis>div:nth-child(4) { border-top:1px solid var(--line); }
 .two-col { grid-template-columns:1fr; }
}
@media print {
 @page { size:A4 portrait; margin:12mm 14mm 14mm; @bottom-right { content:counter(page) ' / ' counter(pages); font-family:Arial,sans-serif; font-size:8pt; color:#67756f; } }
 body { background:white; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
 .toolbar,.print-help { display:none!important; }.sheet { width:auto; min-height:0; margin:0; padding:0; box-shadow:none; }
 .sheet+.sheet { break-before:page; }.document-header,.score-row,.kpis,.two-col,.section,.document-footer,.recommend,.aviso { break-inside:avoid; }
 h2,h3,.section-intro { break-after:avoid; }ul.findings li { orphans:3; widows:3; }
}
`;
