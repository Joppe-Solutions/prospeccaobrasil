module.exports = `
:root { color-scheme:light; --ink:#153c34; --muted:#67756f; --gold:#a27a35; --line:#dce3dd; }
* { box-sizing:border-box; }
body { margin:0; background:#eef1ed; color:var(--ink); font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:1.5; }
a { color:inherit; text-decoration:none; }
a:focus-visible,button:focus-visible { outline:3px solid var(--gold); outline-offset:4px; }
button { font:inherit; cursor:pointer; }
.toolbar { max-width:210mm; margin:24px auto 18px; display:flex; justify-content:space-between; align-items:center; gap:16px; }
.toolbar strong,.toolbar span { display:block; }.toolbar strong { font-size:14px; }.toolbar span { font-size:11px; color:var(--muted); }
.toolbar button,.toolbar-pdf { background:var(--ink); color:white; border:0; border-radius:6px; padding:12px 18px; font-weight:700; }
.sheet { background:white; width:210mm; min-height:297mm; padding:13mm 14mm 10mm; margin:0 auto 24px; box-shadow:0 8px 32px #153c3410; overflow-wrap:anywhere; }
.document-header { display:flex; align-items:center; justify-content:space-between; gap:24px; border-bottom:1px solid var(--line); padding-bottom:16px; }
.logo { width:174px; height:51px; object-fit:contain; display:block; }
.header-right { display:flex; align-items:center; gap:16px; }.reference { text-align:right; flex:0 0 auto; }.reference span { display:block; font-size:9px; text-transform:uppercase; letter-spacing:1.5px; color:var(--muted); }.reference strong { font-size:14px; font-weight:600; }
.intro { padding:21px 0 17px; }.eyebrow { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1.8px; color:var(--gold); }.eyebrow>span:not(.status) { padding:0 6px; color:#bcc6bd; }
.status { display:inline-block; margin-left:12px; padding-left:12px; border-left:1px solid var(--line); color:var(--ink); letter-spacing:.7px; }
h1 { font-family:Georgia,'Times New Roman',serif; font-size:31px; line-height:1.14; font-weight:400; margin:10px 0 6px; letter-spacing:-.6px; }
p { margin:0; }.street { font-size:13px; margin-bottom:3px; }.location { color:var(--muted); font-size:11px; }
figure { margin:0; }.hero img { width:100%; height:65mm; display:block; object-fit:cover; background:#f5f6f3; }
.hero-row.has-map { display:grid; grid-template-columns:1fr 1fr; gap:12px; }.hero-row.has-map .no-photo { height:65mm; }
.map { position:relative; display:block; height:65mm; overflow:hidden; background:#eef0ec; contain:strict; } /* contain: os tiles fora da área não podem alargar a página (o Chrome encolhia a impressão inteira) */
.map-img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block; }
.map-tiles { position:absolute; left:50%; top:50%; display:block; }.map-tiles img { position:absolute; display:block; max-width:none; }
.map-pin { position:absolute; left:50%; top:50%; margin:-39px 0 0 -15px; filter:drop-shadow(0 2px 3px #0005); }
.map-attr { position:absolute; right:0; bottom:0; padding:1px 5px; background:#fffc; font-size:7px; color:#4b5a54; }
.hero figcaption,.hero-map figcaption { display:flex; justify-content:space-between; gap:12px; font-size:8px; color:var(--muted); padding:6px 0 0; }
.no-photo { height:48mm; border:1px solid var(--line); display:flex; flex-direction:column; align-items:center; justify-content:center; background:#f7f8f5; text-align:center; padding:20px; }.no-photo span { font-size:9px; letter-spacing:3px; color:var(--gold); }.no-photo strong { font:24px Georgia,serif; margin:12px 0 5px; }.no-photo p { color:var(--muted); font-size:11px; }
.highlights { display:grid; grid-template-columns:1.15fr 1fr; border-top:2px solid var(--ink); border-bottom:1px solid var(--line); margin:18px 0 21px; padding:16px 0; gap:22px; }
.highlights>div+div { padding-left:22px; border-left:1px solid var(--line); }.small-label { text-transform:uppercase; font-size:9px; letter-spacing:1.2px; color:var(--muted); font-weight:700; display:block; }
.highlights strong { display:block; font-size:28px; line-height:1.3; letter-spacing:-.8px; margin:5px 0 2px; font-weight:600; }.highlights small { color:var(--muted); font-size:9px; }
.highlights.three { grid-template-columns:1.2fr 1fr 1fr; }.card-name { display:block; font-size:10px; color:var(--ink); margin-top:1px; }.compact .details { display:none; }.compact .visit-resumo { display:flex; }.highlights.three strong { font-size:24px; }
.first-foot { margin-top:14px; }
.context { margin:0 0 12px; break-inside:avoid; }.context h3 { margin:0 0 8px; font-size:9px; letter-spacing:1.3px; text-transform:uppercase; color:var(--gold); }
.context-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
.context-grid>div { border:1px solid var(--line); padding:8px 10px; }.context-grid .small-label { font-size:8px; }.context-grid strong { display:block; font-size:16px; line-height:1.3; margin:3px 0 1px; font-weight:600; letter-spacing:-.4px; }.context-grid small { font-size:8px; color:var(--muted); }
.facts-grid { display:grid; grid-template-columns:1.08fr 1fr; gap:30px; }
h2 { font-size:12px; margin:0 0 10px; line-height:1.4; }h2>span { font-size:9px; color:var(--gold); margin-right:6px; }
.facts { margin:0; }.facts>div { display:flex; justify-content:space-between; align-items:baseline; gap:12px; padding:8px 0; border-bottom:1px solid #edf0eb; font-size:10px; }.facts dt { color:var(--muted); }.facts dd { margin:0; font-weight:600; text-align:right; }.dimensions>div { padding:5px 0; }
.fine-print { font-size:8px; line-height:1.55; color:var(--muted); margin-top:9px; }.contract { font-size:10px; margin-top:10px; }
.contact { display:flex; justify-content:center; align-items:center; gap:44px; text-align:center; border-top:1px solid var(--line); margin-top:20px; padding:16px 0 10px; }
.contact h2 { font:25px Georgia,serif; margin:3px 0 8px; }.contact p { font-size:11px; }.contact .email { font-size:10px; }.contact .fine-print { font-size:8px; margin-top:5px; }
.hero-open { display:block; position:relative; width:100%; padding:0; border:0; background:none; cursor:zoom-in; font:inherit; }
.hero-count { position:absolute; right:8px; bottom:8px; padding:4px 9px; border-radius:999px; background:#102a28cc; color:#fff; font-size:9px; font-weight:700; letter-spacing:.3px; }
.gallery figure[data-foto] { cursor:zoom-in; }
.viewer { position:fixed; inset:0; z-index:50; display:flex; align-items:center; justify-content:center; gap:10px; padding:20px; background:#0b1f1ce6; }.viewer[hidden] { display:none; }
.viewer figure { max-width:min(1100px,100%); text-align:center; }.viewer img { max-width:100%; max-height:82vh; object-fit:contain; background:#000; }.viewer figcaption { color:#dfe8e2; font-size:12px; padding-top:10px; }
.viewer button { border:0; background:#ffffff1f; color:#fff; cursor:pointer; border-radius:999px; width:44px; height:44px; font-size:26px; line-height:1; flex:none; }.viewer button:hover { background:#ffffff38; }
.viewer-close { position:absolute; top:16px; right:16px; }
.qr { text-align:center; flex:0 0 auto; color:var(--muted); text-decoration:none; }.qr img { display:block; width:58px; height:58px; margin:0 auto 2px; }.qr span { font-size:7px; letter-spacing:.3px; }
.disclaimer { font-size:8px; color:var(--muted); margin:5px 0 15px; }
.document-footer { border-top:1px solid var(--line); padding-top:10px; display:flex; justify-content:space-between; gap:20px; font-size:8px; color:var(--muted); }.document-footer span { display:block; }.document-footer strong { font-size:9px; color:var(--ink); }.document-footer>div:last-child { text-align:right; }
.section-intro { margin:25px 0; }.section-intro h2 { font:28px/1.2 Georgia,serif; margin:8px 0; }.section-intro p { color:var(--muted); font-size:11px; }
h3 { font-size:14px; margin:0 0 12px; }.description { margin-bottom:24px; }.description p { white-space:pre-line; line-height:1.8; font-size:12px; }
.gallery { display:grid; grid-template-columns:1fr 1fr; gap:20px 16px; }.gallery img { display:block; width:100%; height:55mm; object-fit:contain; background:#f5f6f3; }.gallery figure { break-inside:avoid; }.gallery figcaption { font-size:10px; color:var(--muted); padding-top:7px; }.gallery figcaption span { color:var(--gold); font-size:9px; margin-right:6px; }
.documents { margin:26px 0; }.documents ul { list-style:none; padding:0; margin:12px 0 0; }.documents li { border-bottom:1px solid var(--line); break-inside:avoid; }.documents a { padding:12px 0; display:flex; align-items:center; justify-content:space-between; gap:15px; }.documents strong { font-size:11px; }.documents small { display:block; color:var(--muted); font-size:9px; }.details .document-footer { margin-top:28px; }
.document-header.banner { margin:-13mm -14mm 0; padding:9mm 14mm 8mm; border-bottom:0; background:linear-gradient(105deg,#0a3431 0%,#0d4a43 62%,#15463f 100%); }
.banner .reference span { color:#c9dccf; }.banner .reference strong { color:#fff; }
.banner .qr { background:#fff; padding:5px 5px 3px; border-radius:4px; }.banner .qr span { color:#53635d; }
.sheet { display:flex; flex-direction:column; }.first-foot,.sheet:not(.details)>.document-footer { margin-top:auto; padding-top:10px; }
.document-footer.band { margin:auto -14mm -10mm; padding:12px 14mm; border-top:0; background:linear-gradient(105deg,#0a3431 0%,#0d4a43 62%,#15463f 100%); color:#c9dccf; }.document-footer.band strong { color:#fff; }
.document-footer .partner { text-align:center; flex:1; padding:0 10px; }.document-footer .partner strong { font-size:10px; }.document-footer.band .partner span:first-child { color:#d6bf82; text-transform:uppercase; letter-spacing:1.2px; font-size:7px; }
.details .contact { margin:18px 0 24px; }
.infra { margin:0 0 24px; break-inside:avoid; }
.nearby { list-style:none; margin:0; padding:0; columns:2; column-gap:26px; }.nearby li { display:flex; align-items:baseline; gap:8px; padding:6px 0; border-bottom:1px solid var(--line); font-size:10.5px; break-inside:avoid; }
.nearby span { color:var(--muted); flex:none; }.nearby strong { flex:1; min-width:0; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.nearby em { font-style:normal; color:var(--gold); font-weight:700; flex:none; }.infra .fine-print { margin-top:8px; }
.doc-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
.documents .doc-grid li { border:1px solid var(--line); border-radius:4px; }.documents .doc-grid a { padding:9px 11px; gap:8px; }
.documents .doc-grid a>span:first-child { min-width:0; }.documents .doc-grid strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.flash { margin:0 0 22px; padding:16px 18px 12px; border-radius:6px; background:linear-gradient(135deg,#0e3a35,#12312d); color:#dcebe4; break-inside:avoid; }
.flash header { display:flex; align-items:baseline; gap:12px; margin-bottom:12px; }.flash h3 { margin:0; font:20px Georgia,serif; color:#e8b84b; font-weight:400; }.flash header span { font-size:9px; letter-spacing:1px; text-transform:uppercase; color:#9fbfb1; }
.flash-grid { display:grid; grid-template-columns:auto 1.45fr 1fr 1fr; gap:18px; align-items:start; }
.flash-score { text-align:center; }.flash-ring { width:70px; height:70px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 4px; }.flash-ring span { width:52px; height:52px; border-radius:50%; background:#12312d; display:flex; align-items:center; justify-content:center; font-size:21px; font-weight:700; color:#fff; }.flash-score small { font-size:8px; letter-spacing:1px; text-transform:uppercase; color:#9fbfb1; }
.flash-resumo p { margin:0 0 6px; font-size:10.5px; line-height:1.5; }.flash-rec { color:#fff; }.flash-rec strong { color:#e8b84b; }
.flash h4 { margin:0 0 5px; font-size:9px; letter-spacing:1.2px; text-transform:uppercase; color:#e8b84b; }.flash ul { margin:0; padding-left:14px; }.flash li { font-size:10px; line-height:1.4; margin-bottom:4px; }
.flash-seg { margin-top:10px; display:flex; flex-wrap:wrap; align-items:center; gap:5px; }.flash-seg h4 { margin:0 6px 0 0; }.flash-seg span { background:#e8b84b26; color:#e8b84b; border:1px solid #e8b84b66; padding:3px 9px; border-radius:999px; font-size:9px; }
.flash-nota { margin:9px 0 0; font-size:8px; color:#9fbfb1; font-style:italic; }.all-photos a { color:var(--gold); font-weight:700; text-decoration:underline; }
.visit-resumo { display:none; }
.print-help { margin:0 auto 30px; max-width:210mm; text-align:center; color:var(--muted); font-size:11px; padding:0 20px; }
@media screen and (max-width:520px) { .doc-grid { grid-template-columns:1fr; }.banner .logo { width:118px; }.banner .reference span { display:none; }.banner .reference strong { font-size:13px; }.document-header.banner { gap:10px; }.banner .qr img { width:44px; height:44px; } }
@media screen and (max-width:800px) {
 .toolbar { margin:16px; }.toolbar span { max-width:150px; }.toolbar button { font-size:11px; padding:10px 12px; }
 .sheet { width:100%; min-height:0; padding:25px 22px; margin-bottom:12px; box-shadow:none; }
 .logo { width:145px; height:auto; }.reference span { font-size:7px; letter-spacing:1px; }.reference strong { font-size:12px; }
 h1 { font-size:28px; }.hero img { height:auto; max-height:320px; }.hero-row.has-map { grid-template-columns:1fr; }.map { height:230px; }.hero-row.has-map .no-photo { height:48mm; }.eyebrow { font-size:9px; letter-spacing:1px; }
 .highlights { gap:14px; }.highlights>div+div { padding-left:14px; }.highlights strong { font-size:23px; }.highlights .small-label { font-size:8px; }
 .flash-grid { grid-template-columns:1fr; }.flash-score { text-align:left; display:flex; align-items:center; gap:12px; }.flash-ring { margin:0; }
 .highlights.three { grid-template-columns:1fr 1fr; }.highlights.three>div:nth-child(3) { grid-column:1/-1; border-left:0; padding:10px 0 0; border-top:1px solid var(--line); }.context-grid { grid-template-columns:1fr 1fr; }.header-right { gap:10px; }.qr img { width:48px; height:48px; }
 .facts-grid { grid-template-columns:1fr; gap:24px; }.facts>div { font-size:12px; padding:8px 0; }.contact .email { font-size:9px; }
 .gallery { grid-template-columns:1fr; }.gallery img { height:auto; max-height:350px; }.document-footer { font-size:7px; }
 .document-header.banner { margin:-25px -22px 0; padding:18px 22px 14px; }.document-footer.band { margin:auto -22px -25px; padding:12px 22px; }.nearby { columns:1; }.doc-grid { grid-template-columns:1fr 1fr; }
}
.print-only { display:none; }
/* Cada folha é exatamente uma página A4 ISO (210 × 297 mm), sem margem da impressora */
@page { size:A4 portrait; margin:0; }
@media print {
 .compact .details,.digital-only,.viewer { display:none!important; }.print-only { display:block; }
 .compact .visit-resumo { display:flex; }
 /* Visita no papel: faixa de uma linha (rótulo e título à esquerda, contatos à direita) */
 .visit-resumo,.details .contact { margin:8px 0 0; padding:6px 0; }.visit-resumo>div,.details .contact>div { display:grid; grid-template-columns:auto 1fr; column-gap:24px; align-items:center; text-align:left; width:100%; }
 .visit-resumo .small-label,.details .contact .small-label { grid-area:1/1; }.visit-resumo h2,.details .contact h2 { grid-area:2/1; margin:0; font-size:17px; }
 .visit-resumo p:first-of-type,.details .contact p:first-of-type { grid-area:1/2; justify-self:end; font-size:10px; }.visit-resumo .email,.details .contact .email { grid-area:2/2; justify-self:end; font-size:10px; }.visit-resumo .fine-print,.details .contact .fine-print { display:none; }
 .banner .qr img { width:40px; height:40px; }.banner .qr { padding:3px 3px 2px; }
 .hero img,.map,.hero-row.has-map .no-photo { height:60mm; }.intro { padding:12px 0; } h1 { font-size:25px; }
 .highlights { margin:12px 0; padding:10px 0; }.highlights strong { font-size:24px; }.highlights.three strong { font-size:21px; }.context { margin-bottom:8px; }.context-grid strong { font-size:15px; }.first-foot { padding-top:8px; }
 .facts>div { padding:4px 0; font-size:9px; }.contact { margin-top:12px; padding:10px 0; }.contact h2 { font-size:21px; }
 .document-header { padding-bottom:10px; }.document-footer { padding-top:7px; }.disclaimer { margin:4px 0 10px; }
 .section-intro { margin:15px 0; }.description { margin-bottom:15px; }.description p { font-size:10px; line-height:1.5; }
 .gallery img { height:27mm; }.gallery figcaption { font-size:8px; padding-top:4px; }.documents { margin:12px 0; }.documents .doc-grid a { padding:6px 8px; }.documents .doc-grid strong { font-size:9px; }.documents .doc-grid small { font-size:8px; }
 .details .section-intro h2 { font-size:21px; margin:4px 0; }.infra { margin-bottom:12px; }.nearby li { padding:3px 0; font-size:9px; }.details .contact { margin:10px 0 10px; }.documents h3,.infra h3 { margin-bottom:8px; }.flash { margin-bottom:12px; padding:11px 14px 8px; }.flash h3 { font-size:16px; }.flash header { margin-bottom:8px; }.flash-ring { width:56px; height:56px; }.flash-ring span { width:42px; height:42px; font-size:17px; }.flash-resumo p,.flash li { font-size:9px; }.flash-seg { margin-top:7px; }.gallery { margin-bottom:4px; }

 body { background:white; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
 .toolbar,.print-help { display:none!important; }html,body { margin:0; padding:0; }main { margin:0; padding:0; }
 .sheet { width:210mm; height:296.8mm; min-height:0; margin:0; padding:0 12mm 8mm; box-shadow:none; overflow:hidden; break-after:page; page-break-after:always; }.sheet:last-child,.compact .sheet { break-after:auto; page-break-after:auto; }
 .document-header.banner { margin:0 -12mm; padding:6mm 12mm 5mm; }.sheet>.document-header:not(.banner) { padding-top:9mm; }.document-footer.band { margin:auto -12mm -8mm; padding:4mm 12mm 5mm; }.document-header,.intro,.hero-row,.highlights,.facts-grid,.contact,.first-foot,.document-footer { break-inside:avoid; }
 h2,h3,.section-intro { break-after:avoid; }.description p { orphans:3; widows:3; }.gallery { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
 .gallery figure { margin:0; min-width:0; }.gallery figcaption { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
 .documents a { text-decoration:underline; text-decoration-color:#c6ceca; text-underline-offset:3px; }
}
`;
