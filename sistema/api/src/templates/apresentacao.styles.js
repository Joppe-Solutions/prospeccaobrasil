module.exports = `
:root { color-scheme:light; --ink:#153c34; --muted:#67756f; --gold:#a27a35; --line:#dce3dd; }
* { box-sizing:border-box; }
body { margin:0; background:#eef1ed; color:var(--ink); font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:1.5; }
a { color:inherit; text-decoration:none; }
a:focus-visible,button:focus-visible { outline:3px solid var(--gold); outline-offset:4px; }
button { font:inherit; cursor:pointer; }
.toolbar { max-width:210mm; margin:24px auto 18px; display:flex; justify-content:space-between; align-items:center; gap:16px; }
.toolbar strong,.toolbar span { display:block; }.toolbar strong { font-size:14px; }.toolbar span { font-size:11px; color:var(--muted); }
.toolbar button { background:var(--ink); color:white; border:0; border-radius:6px; padding:12px 18px; font-weight:700; }
.sheet { background:white; width:210mm; min-height:297mm; padding:13mm 14mm 10mm; margin:0 auto 24px; box-shadow:0 8px 32px #153c3410; overflow-wrap:anywhere; }
.document-header { display:flex; align-items:center; justify-content:space-between; gap:24px; border-bottom:1px solid var(--line); padding-bottom:16px; }
.logo { width:174px; height:51px; object-fit:contain; display:block; }
.reference { text-align:right; flex:0 0 auto; }.reference span { display:block; font-size:9px; text-transform:uppercase; letter-spacing:1.5px; color:var(--muted); }.reference strong { font-size:14px; font-weight:600; }
.intro { padding:21px 0 17px; }.eyebrow { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1.8px; color:var(--gold); }.eyebrow>span:not(.status) { padding:0 6px; color:#bcc6bd; }
.status { display:inline-block; margin-left:12px; padding-left:12px; border-left:1px solid var(--line); color:var(--ink); letter-spacing:.7px; }
h1 { font-family:Georgia,'Times New Roman',serif; font-size:31px; line-height:1.14; font-weight:400; margin:10px 0 6px; letter-spacing:-.6px; }
p { margin:0; }.street { font-size:13px; margin-bottom:3px; }.location { color:var(--muted); font-size:11px; }
figure { margin:0; }.hero img { width:100%; height:65mm; display:block; object-fit:contain; background:#f5f6f3; }
.hero figcaption { display:flex; justify-content:space-between; gap:12px; font-size:8px; color:var(--muted); padding:6px 0 0; }
.no-photo { height:48mm; border:1px solid var(--line); display:flex; flex-direction:column; align-items:center; justify-content:center; background:#f7f8f5; text-align:center; padding:20px; }.no-photo span { font-size:9px; letter-spacing:3px; color:var(--gold); }.no-photo strong { font:24px Georgia,serif; margin:12px 0 5px; }.no-photo p { color:var(--muted); font-size:11px; }
.highlights { display:grid; grid-template-columns:1.15fr 1fr; border-top:2px solid var(--ink); border-bottom:1px solid var(--line); margin:18px 0 21px; padding:16px 0; gap:22px; }
.highlights>div+div { padding-left:22px; border-left:1px solid var(--line); }.small-label { text-transform:uppercase; font-size:9px; letter-spacing:1.2px; color:var(--muted); font-weight:700; display:block; }
.highlights strong { display:block; font-size:28px; line-height:1.3; letter-spacing:-.8px; margin:5px 0 2px; font-weight:600; }.highlights small { color:var(--muted); font-size:9px; }
.facts-grid { display:grid; grid-template-columns:1.08fr 1fr; gap:30px; }
h2 { font-size:12px; margin:0 0 10px; line-height:1.4; }h2>span { font-size:9px; color:var(--gold); margin-right:6px; }
.facts { margin:0; }.facts>div { display:flex; justify-content:space-between; align-items:baseline; gap:12px; padding:8px 0; border-bottom:1px solid #edf0eb; font-size:10px; }.facts dt { color:var(--muted); }.facts dd { margin:0; font-weight:600; text-align:right; }.dimensions>div { padding:5px 0; }
.fine-print { font-size:8px; line-height:1.55; color:var(--muted); margin-top:9px; }.contract { font-size:10px; margin-top:10px; }
.contact { display:flex; justify-content:space-between; align-items:center; gap:20px; border-top:1px solid var(--line); margin-top:20px; padding:16px 0 10px; }
.contact h2 { font:25px Georgia,serif; margin:3px 0 8px; }.contact p { font-size:11px; }.contact .email { font-size:10px; }.contact .fine-print { font-size:8px; margin-top:5px; }
.qr { text-align:center; flex:0 0 auto; }.qr img { display:block; width:77px; height:77px; }.qr span { font-size:8px; }
.disclaimer { font-size:8px; color:var(--muted); margin:5px 0 15px; }
.document-footer { border-top:1px solid var(--line); padding-top:10px; display:flex; justify-content:space-between; gap:20px; font-size:8px; color:var(--muted); }.document-footer span { display:block; }.document-footer strong { font-size:9px; color:var(--ink); }.document-footer>div:last-child { text-align:right; }
.section-intro { margin:25px 0; }.section-intro h2 { font:28px/1.2 Georgia,serif; margin:8px 0; }.section-intro p { color:var(--muted); font-size:11px; }
h3 { font-size:14px; margin:0 0 12px; }.description { margin-bottom:24px; }.description p { white-space:pre-line; line-height:1.8; font-size:12px; }
.gallery { display:grid; grid-template-columns:1fr 1fr; gap:20px 16px; }.gallery img { display:block; width:100%; height:55mm; object-fit:contain; background:#f5f6f3; }.gallery figure { break-inside:avoid; }.gallery figcaption { font-size:10px; color:var(--muted); padding-top:7px; }.gallery figcaption span { color:var(--gold); font-size:9px; margin-right:6px; }
.documents { margin:26px 0; }.documents ul { list-style:none; padding:0; margin:12px 0 0; }.documents li { border-bottom:1px solid var(--line); break-inside:avoid; }.documents a { padding:12px 0; display:flex; align-items:center; justify-content:space-between; gap:15px; }.documents strong { font-size:11px; }.documents small { display:block; color:var(--muted); font-size:9px; }.details .document-footer { margin-top:28px; }
.print-help { margin:0 auto 30px; max-width:210mm; text-align:center; color:var(--muted); font-size:11px; padding:0 20px; }
@media screen and (max-width:800px) {
 .toolbar { margin:16px; }.toolbar span { max-width:150px; }.toolbar button { font-size:11px; padding:10px 12px; }
 .sheet { width:100%; min-height:0; padding:25px 22px; margin-bottom:12px; box-shadow:none; }
 .logo { width:145px; height:auto; }.reference span { font-size:7px; letter-spacing:1px; }.reference strong { font-size:12px; }
 h1 { font-size:28px; }.hero img { height:auto; max-height:320px; }.eyebrow { font-size:9px; letter-spacing:1px; }
 .highlights { gap:14px; }.highlights>div+div { padding-left:14px; }.highlights strong { font-size:23px; }.highlights .small-label { font-size:8px; }
 .facts-grid { grid-template-columns:1fr; gap:24px; }.facts>div { font-size:12px; padding:8px 0; }.contact .email { font-size:9px; }
 .gallery { grid-template-columns:1fr; }.gallery img { height:auto; max-height:350px; }.document-footer { font-size:7px; }
}
@media print {
 @page { size:A4 portrait; margin:12mm 14mm 14mm; @bottom-right { content:counter(page) ' / ' counter(pages); font-family:Arial,sans-serif; font-size:8pt; color:#67756f; } }
 body { background:white; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
 .toolbar,.print-help { display:none!important; }.sheet { width:auto; min-height:0; margin:0; padding:0; box-shadow:none; }
 .sheet+.sheet { break-before:page; }.document-header,.intro,.hero,.highlights,.facts-grid,.contact,.document-footer { break-inside:avoid; }
 h2,h3,.section-intro { break-after:avoid; }.description p { orphans:3; widows:3; }.gallery { display:block; }
 .gallery figure { display:inline-block; vertical-align:top; width:calc(50% - 10px); margin:0 16px 18px 0; }.gallery figure:nth-child(even) { margin-right:0; }
 .documents a { text-decoration:underline; text-decoration-color:#c6ceca; text-underline-offset:3px; }
}
`;
