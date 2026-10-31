import excelUrl from './icones/excel.webp';
import pdfUrl from './icones/pdf.png';

function classe(nome) {
  return String(nome || '').toLowerCase();
}

function IconeImagem({ src, size }) {
  return (
    <img
      className="wt-arquivo-icon"
      src={src}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable="false"
    />
  );
}

export function IconeExcel({ size = 18 }) {
  return <IconeImagem src={excelUrl} size={size} />;
}

export function IconePdf({ size = 18 }) {
  return <IconeImagem src={pdfUrl} size={size} />;
}

/** Troca o ícone genérico de arquivo pelo desenho colorido de planilha ou PDF. */
export function iconeDeArquivo(icon, size = 18) {
  const nome = classe(icon);
  if (nome.includes('fa-file-pdf')) return <IconePdf size={size} />;
  if (
    nome.includes('fa-file-excel')
    || nome.includes('fa-file-csv')
    || nome.includes('fa-file-import')
    || nome.includes('fa-file-export')
  ) {
    return <IconeExcel size={size} />;
  }
  return null;
}
