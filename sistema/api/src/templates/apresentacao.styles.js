module.exports = `
@font-face { font-family:'Cormorant Garamond'; font-weight:500; src:url(/fonts/cormorant-garamond-latin-500-normal.woff2) format('woff2'); }
@font-face { font-family:'Cormorant Garamond'; font-weight:500; font-style:italic; src:url(/fonts/cormorant-garamond-latin-500-italic.woff2) format('woff2'); }
@font-face { font-family:'Cormorant Garamond'; font-weight:600; src:url(/fonts/cormorant-garamond-latin-600-normal.woff2) format('woff2'); }
@font-face { font-family:Inter; font-weight:400; src:url(/fonts/inter-latin-400-normal.woff2) format('woff2'); }
@font-face { font-family:Inter; font-weight:500; src:url(/fonts/inter-latin-500-normal.woff2) format('woff2'); }
@font-face { font-family:Inter; font-weight:600; src:url(/fonts/inter-latin-600-normal.woff2) format('woff2'); }
@font-face { font-family:Inter; font-weight:700; src:url(/fonts/inter-latin-700-normal.woff2) format('woff2'); }
@font-face { font-family:Montserrat; font-weight:700; src:url(/fonts/montserrat-latin-700-normal.woff2) format('woff2'); }
:root { color-scheme:light; --ink:#153c34; --muted:#67756f; --gold:#a27a35; --line:#dce3dd; --serif:'Cormorant Garamond',Georgia,'Times New Roman',serif; --rotulo:Montserrat,Inter,Arial,sans-serif; }
* { box-sizing:border-box; }
body { margin:0; background:#eef1ed; color:var(--ink); font-family:Inter,Arial,Helvetica,sans-serif; font-size:12px; line-height:1.5; font-variant-numeric:lining-nums; -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility; }
a { color:inherit; text-decoration:none; }
a:focus-visible,button:focus-visible { outline:3px solid var(--gold); outline-offset:4px; }
button { font:inherit; cursor:pointer; }
.toolbar { max-width:210mm; margin:24px auto 18px; display:flex; justify-content:space-between; align-items:center; gap:16px; }
.toolbar strong,.toolbar span { display:block; }.toolbar strong { font-size:14px; }.toolbar span { font-size:11px; color:var(--muted); }
.toolbar button,.toolbar-pdf { background:var(--ink); color:white; border:0; border-radius:6px; padding:12px 18px; font-weight:700; }
.sheet { position:relative; overflow:hidden; background:white; width:210mm; min-height:297mm; padding:13mm 14mm 10mm 17mm; margin:0 auto 24px; box-shadow:0 8px 32px #153c3410; overflow-wrap:anywhere; }
/* Papel timbrado: lombada verde com a assinatura da marca na borda esquerda e monograma translúcido ao fundo (como na capa da inteligência) */
.sheet>* { position:relative; z-index:1; }
.spine { position:absolute; left:0; top:0; bottom:0; z-index:2; width:6mm; padding:0 0 12mm; display:flex; align-items:center; justify-content:flex-end; background:linear-gradient(180deg,#0a3431,#15463f); box-shadow:inset -1px 0 0 #c9a84c; color:#d6bf82; font-family:var(--rotulo); font-size:7px; font-weight:700; letter-spacing:3px; text-transform:uppercase; writing-mode:vertical-rl; transform:rotate(180deg); white-space:nowrap; }
.sheet-mark { position:absolute; z-index:0; right:-34mm; top:36%; width:150mm; height:auto; opacity:.06; pointer-events:none; }
.document-header { display:flex; align-items:center; justify-content:space-between; gap:24px; border-bottom:1px solid var(--line); padding-bottom:16px; }
.logo { width:174px; height:51px; object-fit:contain; display:block; }
.header-right { display:flex; align-items:center; gap:16px; }.reference { text-align:right; flex:0 0 auto; }.reference span { display:block; font-family:var(--rotulo); font-size:9px; text-transform:uppercase; letter-spacing:1.5px; color:var(--muted); }.reference strong { font-size:14px; font-weight:600; }
.intro { padding:21px 0 17px; }.eyebrow { font-family:var(--rotulo); font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1.6px; color:var(--gold); }.eyebrow>span:not(.status) { padding:0 6px; color:#bcc6bd; }
.status { display:inline-block; margin-left:12px; padding-left:12px; border-left:1px solid var(--line); color:var(--ink); letter-spacing:.7px; }
h1 { font-family:var(--serif); font-size:37px; line-height:1.08; font-weight:600; margin:10px 0 6px; letter-spacing:-.3px; }
p { margin:0; }.street { font-size:13px; margin-bottom:3px; }.location { color:var(--muted); font-size:11px; }
figure { margin:0; }.hero img { width:100%; height:65mm; display:block; object-fit:cover; background:#f5f6f3; }
.hero-row.has-map { display:grid; grid-template-columns:1fr 1fr; gap:12px; }.hero-row.has-map .no-photo { height:65mm; }
.map { position:relative; display:block; height:65mm; overflow:hidden; background:#eef0ec; contain:strict; } /* contain: os tiles fora da área não podem alargar a página (o Chrome encolhia a impressão inteira) */
.map-img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block; }
.map-tiles { position:absolute; left:50%; top:50%; display:block; }.map-tiles img { position:absolute; display:block; max-width:none; }
.map-pin { position:absolute; left:50%; top:50%; margin:-39px 0 0 -15px; filter:drop-shadow(0 2px 3px #0005); }
.map-attr { position:absolute; right:0; bottom:0; padding:1px 5px; background:#fffc; font-size:7px; color:#4b5a54; }
.hero figcaption,.hero-map figcaption { display:flex; justify-content:space-between; gap:12px; font-size:8px; color:var(--muted); padding:6px 0 0; }
.no-photo { height:48mm; border:1px solid var(--line); display:flex; flex-direction:column; align-items:center; justify-content:center; background:#f7f8f5; text-align:center; padding:20px; }.no-photo span { font-size:9px; letter-spacing:3px; color:var(--gold); }.no-photo strong { font:600 27px var(--serif); margin:12px 0 5px; }.no-photo p { color:var(--muted); font-size:11px; }
.highlights { display:grid; grid-template-columns:1.15fr 1fr; border-top:2px solid var(--ink); border-bottom:1px solid var(--line); margin:18px 0 21px; padding:16px 0; gap:22px; }
.highlights>div+div { padding-left:22px; border-left:1px solid var(--line); }.small-label { font-family:var(--rotulo); text-transform:uppercase; font-size:9px; letter-spacing:1.6px; color:var(--muted); font-weight:700; display:block; }
.highlights strong { display:block; font-size:28px; line-height:1.3; letter-spacing:-.8px; margin:5px 0 2px; font-weight:600; }.highlights small { color:var(--muted); font-size:9px; }
.highlights.three { grid-template-columns:1.2fr 1fr 1fr; }.card-name { display:block; font-size:10px; color:var(--ink); margin-top:1px; }.compact .details { display:none; }.compact .visit-resumo { display:flex; }.highlights.three strong { font-size:24px; }
.first-foot { margin-top:14px; display:flex; flex-direction:column; }.first-foot>.band { margin-top:12px; }
.context { margin:0 0 12px; break-inside:avoid; }.context h3 { margin:0 0 8px; text-align:center; font-size:19px; color:var(--ink); }
.context-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
.context-grid>div { background:#e4ede7; border-radius:11px; padding:9px 12px; text-align:center; }.context-grid .small-label { font-size:8px; }.context-grid strong { display:block; font-size:16px; line-height:1.3; margin:3px 0 1px; font-weight:600; letter-spacing:-.4px; }.context-grid small { font-size:8px; color:var(--muted); }
.facts-grid { display:grid; grid-template-columns:1.08fr 1fr; gap:30px; }
h2 { font-size:12px; margin:0 0 10px; line-height:1.4; }h2>span { font-size:9px; color:var(--gold); margin-right:6px; }
.facts { margin:0; border-top:2px solid var(--ink); }
.facts>div:nth-child(even) { background:#f6f8f4; }
.facts-grid h2 { font-size:13px; margin-bottom:8px; }.facts>div { display:flex; justify-content:space-between; align-items:baseline; gap:12px; padding:9px 10px; border-bottom:1px solid #e3e8e2; font-size:11.5px; }.facts dt { color:var(--muted); }.facts dd { margin:0; font-weight:700; text-align:right; color:var(--ink); }.dimensions>div { padding:5px 0; }
.fine-print { font-size:8px; line-height:1.55; color:var(--muted); margin-top:9px; }.contract { font-size:10px; margin-top:10px; }
.contact { display:flex; justify-content:center; align-items:center; gap:44px; text-align:center; border-top:1px solid var(--line); margin-top:20px; padding:16px 0 10px; }
.contact h2 { font:600 29px var(--serif); margin:3px 0 8px; }.contact p { font-size:11px; }.contact .email { font-size:10px; }.contact .fine-print { font-size:8px; margin-top:5px; }
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
.section-intro { margin:25px 0; }.section-intro h2 { font:600 33px/1.12 var(--serif); margin:8px 0; }.section-intro p { color:var(--muted); font-size:11px; }
h3 { font:600 22px/1.2 var(--serif); margin:0 0 12px; }.details h3,.documents>.fine-print { text-align:center; }.description { margin-bottom:24px; }.description p { white-space:pre-line; line-height:1.65; font-size:12px; }
.gallery { display:grid; grid-template-columns:1fr 1fr; gap:20px 16px; }.gallery img { display:block; width:100%; height:55mm; object-fit:contain; background:#f5f6f3; }.gallery figure { break-inside:avoid; }.gallery figcaption { font-size:10px; color:var(--muted); padding-top:7px; }.gallery figcaption span { color:var(--gold); font-size:9px; margin-right:6px; }
.observacoes { margin:0 0 16px; }.observacoes p { white-space:pre-line; overflow-wrap:anywhere; line-height:1.5; font-size:12px; }
.documents { margin:26px 0; }.documents ul { list-style:none; padding:0; margin:12px 0 0; }.documents li { break-inside:avoid; min-width:0; }.documents strong { font-size:10px; line-height:1.3; }.documents small { display:block; font-family:var(--rotulo); color:var(--gold); font-size:7.5px; letter-spacing:1px; text-transform:uppercase; font-weight:700; }.details .document-footer { margin-top:28px; }
.document-header.banner { margin:-13mm -14mm 0 -17mm; padding:9mm 14mm 8mm 17mm; border-bottom:0; box-shadow:inset 0 -2px 0 #c9a84c; background:linear-gradient(105deg,#0a3431 0%,#0d4a43 62%,#15463f 100%); }
.banner .reference span { color:#c9dccf; }.banner .reference strong { color:#fff; }
.banner .qr { background:#fff; padding:5px 5px 3px; border-radius:4px; }.banner .qr span { color:#53635d; }
.sheet { display:flex; flex-direction:column; }.first-foot,.sheet:not(.details)>.document-footer { margin-top:auto; padding-top:10px; }
.banner.slim { padding:7mm 14mm 6mm 17mm; }
.document-footer.band { margin:auto -14mm -10mm -17mm; padding:12px 14mm 12px 17mm; border-top:0; background:linear-gradient(105deg,#0a3431 0%,#0d4a43 62%,#15463f 100%); color:#c9dccf; }.document-footer.band strong { color:#fff; }
.document-footer .partner { text-align:center; flex:1; padding:0 10px; }.document-footer .partner strong { font-size:10px; }.document-footer.band .partner span:first-child { color:#d6bf82; text-transform:uppercase; letter-spacing:1.2px; font-size:7px; }
.details .contact { margin:auto 0 24px; }
/* Chamada de visita da 2ª folha: cartão verde (como o painel) com QR do WhatsApp */
.details .contact { display:block; border:0; padding:0; text-align:left; }
.details .contact>div { display:grid; grid-template-columns:1fr auto; align-items:center; gap:2px 24px; padding:20px 26px; border-radius:22px; background:linear-gradient(135deg,#2c6753 0%,#1f5244 55%,#163f35 100%); color:#f7f2e7; }
.details .contact .small-label { color:#cfdfd5; }.details .contact h2 { color:#f7f2e7; margin:2px 0 10px; }.details .contact p { color:#f7f2e7; }.details .contact p a { color:#fff; font-weight:600; }.details .contact .email { color:#cfdfd5; }.details .contact .fine-print { color:#b4cdc0; }
.details .contact .qr-visita { grid-row:1/6; grid-column:2; text-align:center; }.details .contact .qr-visita img { display:block; width:84px; height:84px; padding:5px; border-radius:8px; background:#fff; margin:0 auto 5px; }.details .contact .qr-visita span { display:block; font-family:var(--rotulo); font-size:7px; letter-spacing:1px; text-transform:uppercase; color:#cfdfd5; }
.infra { margin:0 0 24px; break-inside:avoid; }
.nearby { list-style:none; margin:0; padding:0; columns:2; column-gap:26px; }.nearby li { display:flex; align-items:baseline; gap:8px; padding:6px 0; border-bottom:1px solid var(--line); font-size:10.5px; break-inside:avoid; }
.nearby span { color:var(--muted); flex:none; }.nearby strong { flex:1; min-width:0; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.nearby em { font-style:normal; color:var(--gold); font-weight:700; flex:none; }.infra .fine-print { margin-top:8px; }
.entorno1km { margin:0 0 24px; break-inside:avoid; }
.entorno1km-grid { display:grid; grid-template-columns:1fr 1.25fr; gap:22px; align-items:stretch; }
.transporte-box { border:1px solid var(--line); border-radius:6px; overflow:hidden; }
.transporte { width:100%; border-collapse:collapse; font-size:10.5px; }
.transporte th { background:var(--ink); color:#fff; text-align:left; font-family:var(--rotulo); font-size:9px; letter-spacing:.8px; text-transform:uppercase; padding:7px 10px; }
.transporte th:last-child,.transporte td:last-child { text-align:right; }
.transporte td { padding:8px 10px; border-bottom:1px solid var(--line); }.transporte tr:last-child td { border-bottom:0; }
.composicao { margin:0; border:1px solid var(--line); border-radius:6px; padding:8px 10px 4px; }
.composicao figcaption { font-size:10px; font-weight:700; margin-bottom:4px; }
.composicao svg { display:block; width:100%; height:auto; }
.entorno1km .fine-print { margin-top:8px; }
.doc-grid { display:grid; grid-template-columns:repeat(var(--docs,4),minmax(0,1fr)); gap:8px; }
.doc-grid li { border:1px solid #c9d6cd; border-radius:8px; background:#fbfcfa; transition:border-color .15s,box-shadow .15s,transform .15s; }.doc-grid a { display:flex; flex-direction:column; align-items:center; text-align:center; gap:4px; padding:12px 8px 10px; height:100%; border-radius:7px; }
.doc-grid li:hover,.doc-grid li:focus-within { border-color:var(--ink); box-shadow:0 6px 16px #153c3426; transform:translateY(-2px); }
.doc-abrir { margin-top:auto; padding:3px 9px; border-radius:999px; background:var(--ink); color:#fff; font:700 8.5px var(--rotulo); letter-spacing:.3px; white-space:nowrap; }
.doc-grid li:hover .doc-abrir,.doc-grid li:focus-within .doc-abrir { background:#1f7a66; }
.doc-grid a>strong { margin-bottom:5px; }
@media (prefers-reduced-motion:reduce) { .doc-grid li { transition:none; } .doc-grid li:hover,.doc-grid li:focus-within { transform:none; } }
.doc-ico { display:grid; place-items:center; width:38px; height:38px; margin-bottom:4px; border-radius:50%; background:linear-gradient(135deg,#0d4a43,#15463f); color:#e8d9a8; }.doc-ico svg { width:21px; height:21px; }
.doc-grid strong { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; max-width:100%; }
.visit-resumo { display:none; }
.print-help { margin:0 auto 30px; max-width:210mm; text-align:center; color:var(--muted); font-size:11px; padding:0 20px; }
@media screen and (max-width:520px) { .doc-grid { grid-template-columns:1fr 1fr; }.banner .logo { width:118px; }.banner .reference span { display:none; }.banner .reference strong { font-size:13px; }.document-header.banner { gap:10px; }.banner .qr img { width:44px; height:44px; } }
@media screen and (max-width:800px) {
 .toolbar { margin:16px; }.toolbar span { max-width:150px; }.toolbar button { font-size:11px; padding:10px 12px; }
 .sheet { width:100%; min-height:0; padding:25px 22px; margin-bottom:12px; box-shadow:none; }.spine,.sheet-mark { display:none; }.banner.slim { padding:14px 22px; }
 .logo { width:145px; height:auto; }.reference span { font-size:7px; letter-spacing:1px; }.reference strong { font-size:12px; }
 h1 { font-size:28px; }.hero img { height:auto; max-height:320px; }.hero-row.has-map { grid-template-columns:1fr; }.map { height:230px; }.hero-row.has-map .no-photo { height:48mm; }.eyebrow { font-size:9px; letter-spacing:1px; }
 .highlights { gap:14px; }.highlights>div+div { padding-left:14px; }.highlights strong { font-size:23px; }.highlights .small-label { font-size:8px; }
 .highlights.three { grid-template-columns:1fr 1fr; }.highlights.three>div:nth-child(3) { grid-column:1/-1; border-left:0; padding:10px 0 0; border-top:1px solid var(--line); }.context-grid { grid-template-columns:1fr 1fr; }.header-right { gap:10px; }.qr img { width:48px; height:48px; }
 .facts-grid { grid-template-columns:1fr; gap:24px; }.facts>div { font-size:12px; padding:8px 0; }.contact .email { font-size:9px; }
 .gallery { grid-template-columns:1fr; }.gallery img { height:auto; max-height:350px; }.document-footer { font-size:7px; }
 .document-header.banner { margin:-25px -22px 0; padding:18px 22px 14px; }.document-footer.band { margin:auto -22px -25px; padding:12px 22px; }.nearby { columns:1; }.doc-grid { grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); }
}
/* Algarismos: alinhados nos títulos em serifa (o atalho font: zera esta propriedade) e tabulares só nos valores */
.sheet h1,.sheet h2,.sheet h3,.sheet .caixa { font-variant-numeric:lining-nums; }
.val,.highlights strong,.context-grid strong,.transporte td { font-variant-numeric:lining-nums tabular-nums; }
.print-only { display:none; }
/* Cada folha é exatamente uma página A4 ISO (210 × 297 mm), sem margem da impressora */
@page { size:A4 portrait; margin:0; }
/* Cards de KPI: texto centralizado e título em destaque (laranja) */
.highlights>div { text-align:center; }
.highlights .small-label { color:#c46a1c; font-weight:800; font-size:11px; letter-spacing:1.4px; }
.highlights .card-name { font-weight:600; }
/* Painel premium: bloco verde arredondado com camadas à esquerda, destaques em creme e cartões sálvia */
.painel { --creme:#f7f2e7; --salvia:#cfdfd5; --suave:#b4cdc0; --tinta:#15382f; margin:16px 0 14px 14px; padding:24px 26px; border-radius:26px; background:linear-gradient(135deg,#2c6753 0%,#1f5244 55%,#163f35 100%); box-shadow:-15px 0 0 -8px #2c675399,-32px 0 0 -18px #2c675359; color:var(--creme); break-inside:avoid; }
.painel .highlights { margin:0 0 18px; padding:0 0 18px; border:0; border-bottom:1px solid #ffffff38; gap:0; }
.painel .highlights>div { min-width:0; padding:0 8px; text-align:center; }
.painel .highlights>div+div { border-left:1px solid #ffffff38; }
.painel .highlights .small-label { color:var(--salvia); font-weight:700; font-size:11px; letter-spacing:1.6px; }
.painel .highlights .card-name { color:var(--suave); font-weight:600; font-size:9px; letter-spacing:.2px; text-transform:uppercase; white-space:nowrap; margin-top:2px; }
.painel .highlights .por-m2 .small-label,.painel .highlights .por-m2 .card-name { color:#d5ad62; }
.painel .highlights strong { color:var(--creme); font-size:30px; letter-spacing:-.5px; white-space:nowrap; overflow-wrap:normal; margin:6px 0 2px; }
.painel .highlights.three strong { font-size:25px; }
.painel .highlights small { color:var(--suave); }
.ficha { display:grid; grid-template-columns:1fr 1fr; }
.bloco { min-width:0; padding-right:24px; }.bloco+.bloco { padding:0 0 0 24px; border-left:1px solid #ffffff38; }
.caixa { margin:0 0 12px; text-align:center; font:600 22px/1.2 var(--serif); color:var(--creme); text-transform:uppercase; letter-spacing:.6px; text-decoration:underline; text-decoration-thickness:1px; text-underline-offset:4px; }
.linhas { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:8px; }
.linhas li { display:grid; grid-template-columns:22px minmax(0,1fr) auto; align-items:center; gap:9px; height:44px; padding:0 13px; border-radius:11px; background:var(--salvia); color:var(--tinta); }
.ico { display:grid; place-items:center; color:var(--tinta); }
.ico svg { width:20px; height:20px; }
.rot { min-width:0; }
.rot b,.rot small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.rot b { font-size:12px; line-height:1.25; }
.rot small { font-size:9px; line-height:1.25; color:#3d5f53; }
.val { font-size:13.5px; font-weight:700; white-space:nowrap; }
.ficha .fine-print,.ficha .contract { margin-top:10px; }
.painel .fine-print { color:var(--suave); }
.painel .contract { color:var(--salvia); text-align:center; }
@media screen and (max-width:720px) { .ficha { grid-template-columns:1fr; gap:20px; } .bloco,.bloco+.bloco { padding:0; border-left:0; } .painel .highlights,.painel .highlights.three { grid-template-columns:1fr; gap:12px; } .painel .highlights>div+div,.painel .highlights.three>div:nth-child(3) { border-left:0; border-top:1px solid #ffffff38; padding:12px 8px 0; } }
@media print {
 .painel { margin:10px 0 8px 10px; padding:14px 18px; border-radius:20px; box-shadow:-11px 0 0 -6px #2c675399,-23px 0 0 -13px #2c675359; } .painel .highlights { margin:0 0 9px; padding:0 0 9px; gap:0; } .painel .highlights strong,.painel .highlights.three strong { font-size:23px; margin:3px 0 1px; } .painel .highlights .small-label { font-size:10px; } .painel .highlights .card-name { font-size:8.5px; }
 .bloco { padding-right:20px; } .bloco+.bloco { padding:0 0 0 20px; } .linhas { gap:5px; } .caixa { margin-bottom:6px; font-size:17px; } .linhas li { grid-template-columns:17px minmax(0,1fr) auto; gap:7px; height:29px; padding:0 10px; border-radius:8px; } .ico svg { width:15px; height:15px; } .rot b { font-size:9.5px; } .rot small { font-size:8px; } .val { font-size:11px; } .ficha .fine-print { margin-top:6px; } .ficha .contract { margin-top:6px; }
 .compact .details,.digital-only,.viewer { display:none!important; }.print-only { display:block; }
 .compact .visit-resumo { display:flex; }
 /* Visita no papel: faixa de uma linha (rótulo e título à esquerda, contatos à direita) */
 .visit-resumo,.details .contact { margin:8px 0 0; padding:6px 0; }.visit-resumo>div,.details .contact>div { display:grid; grid-template-columns:auto 1fr; column-gap:24px; align-items:center; text-align:left; width:100%; }
 .visit-resumo .small-label,.details .contact .small-label { grid-area:1/1; }.visit-resumo h2,.details .contact h2 { grid-area:2/1; margin:0; font-size:17px; }
 .visit-resumo p:first-of-type,.details .contact p:first-of-type { grid-area:1/2; justify-self:end; font-size:10px; }.visit-resumo .email,.details .contact .email { grid-area:2/2; justify-self:end; font-size:10px; }.visit-resumo .fine-print,.details .contact .fine-print { display:none; }
 .banner .qr img { width:40px; height:40px; }.banner .qr { padding:3px 3px 2px; }
 .hero-row { flex:1 1 auto; min-height:38mm; max-height:74mm; }.hero,.hero-map { display:flex; flex-direction:column; min-height:0; }.hero-open { display:flex; flex-direction:column; flex:1; min-height:0; }.hero img,.hero .no-photo,.map { flex:1 1 auto; min-height:0; height:auto; }.hero img,.map,.hero-row.has-map .no-photo { height:52mm; }.compact .hero img,.compact .map,.compact .hero-row.has-map .no-photo { height:38mm; }.complete .hero img,.complete .map,.complete .hero-row.has-map .no-photo { height:52mm; }.complete .painel { padding:17px 20px; }.complete .linhas { gap:7px; }.complete .linhas li { height:30px; }.complete .painel .highlights { margin-bottom:11px; padding-bottom:11px; }.intro { padding:12px 0; } h1 { font-size:30px; }
 .highlights { margin:12px 0; padding:10px 0; }.highlights strong { font-size:24px; }.highlights.three strong { font-size:21px; }.context { margin-bottom:8px; }.context h3 { margin-bottom:5px; font-size:16px; }.context-grid strong { font-size:15px; }.first-foot { padding-top:8px; }
 .facts>div { padding:7px 9px; font-size:10.5px; }.contact { margin-top:12px; padding:10px 0; }.contact h2 { font-size:21px; }
 .document-header { padding-bottom:10px; }.document-footer { padding-top:7px; }.disclaimer { margin:4px 0 10px; }
 .section-intro { margin:15px 0; }.section-intro h2 { font-size:28px; }.description { margin-bottom:15px; }.description p { font-size:10px; line-height:1.5; }
 .gallery img { height:27mm; }.gallery figcaption { font-size:8px; padding-top:4px; }.documents { margin:12px 0; }.doc-grid { gap:6px; }.doc-grid a { padding:8px 5px 7px; gap:3px; }.doc-ico { width:30px; height:30px; margin-bottom:2px; }.doc-ico svg { width:17px; height:17px; }.doc-grid strong { font-size:8.5px; }.doc-grid small { font-size:7px; }.doc-grid li { box-shadow:none; transform:none; }.details h3 { font-size:17px; }
 .details .section-intro h2 { font-size:25px; margin:4px 0; }.infra { margin-bottom:12px; }.nearby li { padding:3px 0; font-size:9px; }.details .contact { margin:auto 0 10px; }.details .contact>div { grid-template-columns:1fr auto; padding:12px 18px; gap:4px 16px; border-radius:16px; }.details .contact .small-label,.details .contact h2,.details .contact p:first-of-type,.details .contact .email { grid-area:auto; grid-column:1; justify-self:start; }.details .contact .qr-visita { grid-column:2; grid-row:1/5; }.details .contact h2 { font-size:22px; margin:1px 0 4px; }.details .contact .qr-visita img { width:64px; height:64px; padding:4px; }.documents h3,.infra h3,.entorno1km h3 { margin-bottom:6px; }.entorno1km { margin-bottom:12px; }.entorno1km table { font-size:9px; }.entorno1km td,.entorno1km th { padding:4px 8px; }.composicao svg { max-height:40mm; }.gallery { margin-bottom:4px; }

 body { background:white; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
 .toolbar,.print-help { display:none!important; }html,body { margin:0; padding:0; }main { margin:0; padding:0; }
 .sheet { width:210mm; height:296.8mm; min-height:0; margin:0; padding:0 12mm 8mm 15mm; box-shadow:none; overflow:hidden; break-after:page; page-break-after:always; }.spine { width:5.5mm; padding-bottom:10mm; font-size:6.5px; }.sheet:last-child,.compact .sheet { break-after:auto; page-break-after:auto; }
 .document-header.banner { margin:0 -12mm 0 -15mm; padding:6mm 12mm 5mm 15mm; }.banner.slim { padding:5mm 12mm 4.5mm 15mm; }.document-footer.band { margin:auto -12mm -8mm -15mm; padding:4mm 12mm 5mm 15mm; }.first-foot>.band { margin-top:5px; }.document-header,.intro,.hero-row,.highlights,.facts-grid,.contact,.first-foot,.document-footer { break-inside:avoid; }
 h2,h3,.section-intro { break-after:avoid; }.description p { orphans:3; widows:3; }.gallery { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
 .gallery figure { margin:0; min-width:0; }.gallery figcaption { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
 .observacoes { margin:0 0 6px; }.observacoes h3 { margin-bottom:4px; }.observacoes p { font-size:9px; line-height:1.3; }
 .documents .doc-grid a { text-decoration:none; }
}
`;
