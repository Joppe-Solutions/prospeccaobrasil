// Menu lateral (ícones = classes fa-* do icones-lucide.css). Grupo sem `caminho` só agrupa os subitens.
export const MENU = [
  { tipo: 'link', rotulo: 'Visão geral', caminho: '/', icone: 'fa-table-cells-large' },
  { tipo: 'link', rotulo: 'Financeiro', caminho: '/financeiro', icone: 'fa-dollar-sign', admin: true },
  { tipo: 'grupo', rotulo: 'Cadastros', icone: 'fa-folder-open', subitens: [
    { rotulo: 'Imóveis', caminho: '/imoveis', icone: 'fa-location-dot' },
    { rotulo: 'Clientes', caminho: '/empresas', icone: 'fa-store' },
    { rotulo: 'Consultores', caminho: '/parceiros', icone: 'fa-users' },
    { rotulo: 'Leads', caminho: '/leads', icone: 'fa-bullseye' },
    { rotulo: 'Proprietários e operadores', caminho: '/proprietarios', icone: 'fa-id-card' },
  ] },
  { tipo: 'grupo', rotulo: 'Conhecimento', icone: 'fa-book', subitens: [
    { rotulo: 'Glossário de Varejo', caminho: '/glossario', icone: 'fa-book-open' },
    { rotulo: 'Inteligência de Mercado', caminho: '/inteligencia', icone: 'fa-chart-column' },
    { rotulo: 'Benchmark', caminho: '/benchmark', icone: 'fa-chart-bar' },
    { rotulo: 'Modelos de contratos', caminho: '/modelos-contratos', icone: 'fa-file-lines' },
  ] },
  { tipo: 'link', rotulo: 'Ações das operações', caminho: '/oportunidades', icone: 'fa-handshake' },
  { tipo: 'grupo', rotulo: 'Conta', icone: 'fa-cog', subitens: [
    { rotulo: 'Perfil', caminho: '/perfil', icone: 'fa-user' },
    { rotulo: 'Usuários', caminho: '/usuarios', icone: 'fa-users', admin: true },
    { rotulo: 'Configurações', caminho: '/configuracoes', icone: 'fa-cog', admin: true },
  ] },
  { tipo: 'link', rotulo: 'Site institucional', href: 'https://prospeccaobrasil.com.br', icone: 'fa-globe' },
];

export const subitemAtivo = (sub, pathname) => pathname === sub.caminho || pathname.startsWith(`${sub.caminho}/`);
export const grupoAtivo = (item, pathname) => item.subitens?.some(s => subitemAtivo(s, pathname));
export const trilhaPorRota = pathname => {
  const grupo = MENU.find(i => grupoAtivo(i, pathname));
  return grupo ? [grupo.rotulo] : [];
};
