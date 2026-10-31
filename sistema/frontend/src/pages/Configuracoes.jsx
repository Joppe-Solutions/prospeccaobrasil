import { ChartBar, CurrencyDollar, GearSix, Handshake, Lock, MapPinArea, ShieldCheck, Storefront } from '@phosphor-icons/react';
import { getUser } from '../lib/api';
import { PageHeader } from '../components/UI';
import './collections.css';

// Regras vigentes do sistema, só para consulta: quem altera é a equipe técnica.
const PARAMS = [
  { group: 'Imóveis', icon: MapPinArea, items: ['Status: disponível, em análise, concluído, inativo', 'Categorias: loja, prédio, terreno, outro', 'Código automático na sequência PB-xxx'] },
  { group: 'Financeiro', icon: CurrencyDollar, items: ['Categorias: aluguel, comissão, repasse, imposto, condomínio, IPTU, taxa, deslocamento, documentação, anúncio, planta', 'Status: previsto, pago, estornado', 'Comissão líquida = receita bruta − despesas − impostos − repasses'] },
  { group: 'Relacionamentos comerciais', icon: Handshake, items: ['Modalidades: expansão de redes, locação direta, passagem de ponto, ativos à venda', 'Etapas: apresentado, visita, proposta, negociação, fechado, perdido'] },
  { group: 'Clientes', icon: Storefront, items: ['Premissas do cliente: faixa de área e bairros de interesse', 'O detalhe do imóvel indica os clientes compatíveis e registra a apresentação como ação da operação'] },
  { group: 'Conhecimento', icon: ChartBar, items: ['Glossário com busca, categorias e cadastro de novos termos', 'Benchmark de locação parametrizável por administradores na Inteligência de Mercado Imobiliário'] },
  { group: 'Acesso', icon: Lock, items: ['Perfis: administrador e equipe comercial', 'Financeiro e usuários restritos a administradores', 'Documentos internos exigem sessão ativa'] },
];

export default function Configuracoes() {
  const u = getUser();
  return <div className="collection-page">
    <PageHeader eyebrow="Conta" title="Configurações" description="Regras, categorias e status em vigor no sistema." />
    <section className="panel collection-panel">
      <div className="collection-section-head">
        <div><h2>Parâmetros do sistema</h2><p>Definições vigentes de categorias e regras de negócio.</p></div>
        <span className="collection-section-symbol"><GearSix size={22} /></span>
      </div>
      <div className="rules-grid">
        {PARAMS.map(({ group, icon: Icon, items }) => (
          <section className="rules-card" key={group}>
            <header><span className="collection-stat-icon"><Icon size={18} /></span><h3>{group}</h3></header>
            <ul>{items.map(i => <li key={i}>{i}</li>)}</ul>
          </section>
        ))}
      </div>
      <p className="rules-note"><ShieldCheck size={16} />Alterações de parâmetros são feitas pela equipe técnica. Você está conectado como <strong>{u?.nome}</strong> ({u?.role === 'admin' ? 'administrador' : 'equipe comercial'}).</p>
    </section>
  </div>;
}
