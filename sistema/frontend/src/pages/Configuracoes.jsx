import { GearSix, Info, ShieldCheck } from '@phosphor-icons/react';
import { getUser } from '../lib/api';
import { PageHeader } from '../components/UI';
import './collections.css';

const PARAMS = [
  { group: 'Imóveis', items: ['Status: disponível, em negociação, locado, vendido, inativo', 'Categorias: loja, prédio, terreno, outro', 'Código automático na sequência PB-xxx'] },
  { group: 'Financeiro', items: ['Categorias: aluguel, comissão, repasse, imposto, condomínio, IPTU, taxa, deslocamento, documentação, anúncio, planta', 'Status: previsto, pago, estornado', 'Comissão líquida = receita bruta − despesas − impostos − repasses'] },
  { group: 'Relacionamentos comerciais', items: ['Modalidades: expansão de redes, locação direta, passagem de ponto', 'Etapas: apresentado, visita, proposta, negociação, fechado, perdido'] },
  { group: 'Acesso', items: ['Perfis: administrador e equipe comercial', 'Financeiro e usuários restritos a administradores', 'Documentos internos exigem sessão ativa'] },
];

export default function Configuracoes() {
  const u = getUser();
  return <div className="collection-page">
    <PageHeader
      eyebrow="CONTA"
      title="Configurações"
      description="Parâmetros gerais, categorias, status e opções do sistema."
    />
    <section className="panel collection-panel">
      <div className="collection-section-head">
        <div><h2>Parâmetros do sistema</h2><p>Definições vigentes de categorias e regras de negócio.</p></div>
        <span className="collection-section-symbol"><GearSix size={22} /></span>
      </div>
      <div className="collection-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', margin: 0 }}>
        {PARAMS.map(p => (
          <div key={p.group} style={{ alignItems: 'flex-start' }}>
            <span className="collection-stat-icon"><Info size={20} /></span>
            <span>
              <small>{p.group}</small>
              <ul style={{ margin: '6px 0 0', paddingLeft: 16, fontSize: 12, lineHeight: 1.7 }}>
                {p.items.map(i => <li key={i}>{i}</li>)}
              </ul>
            </span>
          </div>
        ))}
      </div>
      <div className="alert" role="note" style={{ marginTop: 18 }}>
        <ShieldCheck size={16} style={{ verticalAlign: -3, marginRight: 6 }} />
        Alterações de parâmetros são feitas pela equipe técnica. Você está conectado como <strong>{u?.nome}</strong> ({u?.role === 'admin' ? 'administrador' : 'equipe comercial'}).
      </div>
    </section>
  </div>;
}
