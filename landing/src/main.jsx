import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/montserrat/latin-600.css';
import '@fontsource/montserrat/latin-700.css';
import '@fontsource/cormorant-garamond/latin-600-italic.css';
import './styles.css';
import './refinement.css';
import { segments } from './segments';

const whatsapp = 'https://wa.me/5521998423232?text=Ol%C3%A1%2C%20gostaria%20de%20planejar%20a%20expans%C3%A3o%20da%20minha%20rede.';

const contact = {
  address: ['Rua Visconde de Pirajá, 495', '5º andar · Ipanema · Rio de Janeiro · RJ · CEP 22410-002'],
  phones: ['+55 21 99842-3232', '+55 21 97034-2617'],
  email: 'comercial@prospeccaobrasil.com.br',
  instagram: 'https://www.instagram.com/prospeccaobrasil/',
  linkedin: 'https://www.linkedin.com',
};

const services = [
  { number: '01', icon: 'ph-compass', title: 'Implantação do negócio', text: 'Da escolha do imóvel à viabilidade da operação. Uma visão completa para começar no endereço certo.', details: 'Apoio na aquisição ou venda de terrenos e imóveis comerciais, desenvolvimento de empreendimentos e documentação para implantação.', tags: ['Viabilidade', 'Desenvolvimento', 'Documentação'] },
  { number: '02', icon: 'ph-chart-line-up', title: 'Expansão de redes', text: 'Planejamento territorial para transformar metas de crescimento em novas operações.', details: 'Definição de mercados-alvo, análise de macro e microlocalização, estudo de rentabilidade e identificação de espaços de mercado para a rede.', tags: ['Geomarketing', 'Mercados-alvo', 'Plano de expansão'] },
  { number: '03', icon: 'ph-map-pin-area', title: 'Prospecção de pontos', text: 'Oportunidades alinhadas ao consumidor, à marca e aos requisitos de cada loja.', details: 'Prospecção de imóveis, avaliação de fluxo e visibilidade, análise de custo de ocupação e negociação de pontos comerciais.', tags: ['Seleção de imóveis', 'Campo', 'Negociação'] },
  { number: '04', icon: 'ph-buildings', title: 'Investidores e family offices', text: 'Estratégia imobiliária para conectar ativos comerciais a operações de longo prazo.', details: 'Avaliação estratégica de ativos, administração de portfólios e estruturação de contratos atípicos, com atenção ao retorno e à segurança jurídica.', tags: ['Ativos comerciais', 'Portfólios', 'Contratos atípicos'] },
];

const steps = [
  ['01', 'Estratégia', 'Entendemos a operação, o público, as metas e os critérios de ocupação.'],
  ['02', 'Inteligência territorial', 'Analisamos renda, fluxo, concorrência, polos geradores e áreas de influência.'],
  ['03', 'Campo e negociação', 'Prospectamos imóveis, validamos premissas e conduzimos a negociação.'],
  ['04', 'Implantação', 'Apoiamos documentação, viabilidade técnica e o avanço seguro do novo ponto.'],
];

const faqs = [
  ['Em quais regiões a Prospecção Brasil atua?', 'Nosso foco é o estado do Rio de Janeiro — capital, Baixada, interior e litoral — onde conduzimos análises de campo e negociações presenciais. Para redes com plano de expansão nacional, avaliamos outros mercados sob demanda.'],
  ['Quanto tempo leva para encontrar um ponto?', 'Depende dos critérios da operação e do mercado-alvo. Uma prospecção ativa costuma levar de algumas semanas a poucos meses, com oportunidades apresentadas e validadas ao longo do processo.'],
  ['Vocês atendem franquias ou apenas redes próprias?', 'Atendemos os dois modelos. Trabalhamos com redes próprias, franqueadores que precisam de pontos para novos franqueados e franqueados em busca do primeiro ou próximo endereço.'],
  ['O que está incluso na análise de um ponto comercial?', 'Macro e microlocalização, renda e perfil do entorno, fluxo de pedestres e veículos, concorrência, polos geradores de tráfego, custo de ocupação e visibilidade do imóvel.'],
  ['Como funciona a remuneração?', 'Trabalhamos com modelos por projeto, success fee ou representação contínua, definidos conforme o escopo e o momento da sua rede. Converse conosco para montar o formato ideal.'],
  ['Vocês negociam diretamente com o proprietário?', 'Sim. Conduzimos a negociação de ponta a ponta: apresentação da marca, condições comerciais, prazos e suporte documental até a implantação do novo ponto.'],
];

function Header({ activeSection, minimal }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  if (minimal) {
    return <header className={`nav-wrap nav-minimal ${scrolled ? 'is-scrolled' : ''}`}>
      <a className="brand" href="#inicio" aria-label="Prospecção Brasil, início"><img src="/images/logo-wide.png" alt="Prospecção Brasil" /></a>
      <a className="nav-back" href="#inicio"><i className="ph ph-arrow-left" /> Voltar ao site</a>
    </header>;
  }

  return <header className={`nav-wrap ${scrolled ? 'is-scrolled' : ''}`}>
    <a className="brand" href="#inicio" aria-label="Prospecção Brasil, início"><img src="/images/logo-wide.png" alt="Prospecção Brasil" /></a>
    <nav className={menuOpen ? 'nav-links open' : 'nav-links'} aria-label="Navegação principal">
      <a href="#atuacao" onClick={closeMenu} className={activeSection === 'atuacao' ? 'active' : ''}>Atuação</a>
      <a href="#segmentos" onClick={closeMenu} className={activeSection === 'segmentos' ? 'active' : ''}>Segmentos</a>
      <a href="#metodo" onClick={closeMenu} className={activeSection === 'metodo' ? 'active' : ''}>Método</a>
      <a href="#/sobre" onClick={closeMenu} className={activeSection === 'sobre' ? 'active' : ''}>Quem somos</a>
      <a href="#faq" onClick={closeMenu} className={activeSection === 'faq' ? 'active' : ''}>Dúvidas</a>
    </nav>
    <a className="nav-cta" href="#/contato">Falar com um especialista <i className="ph ph-arrow-up-right" /></a>
    <button type="button" className="menu-toggle" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><i aria-hidden="true" className={`ph ${menuOpen ? 'ph-x' : 'ph-list'}`} /></button>
  </header>;
}

function Footer({ minimal }) {
  if (minimal) {
    return <footer className="footer-minimal">
      <small>© 2026 Prospecção Brasil. Todos os direitos reservados.</small>
      <small>CRECI-RJ · CJ-8762/RJ</small>
    </footer>;
  }
  return <footer>
    <div className="footer-top">
      <div className="footer-brand-col">
        <a className="brand footer-brand" href="#inicio"><img src="/images/logo-full-hd.png" alt="Prospecção Brasil" /></a>
        <p>Inteligência para expansão de redes e ativos comerciais.</p>
        <div className="footer-social">
          <a href={contact.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><i className="ph ph-instagram-logo" /></a>
          <a href={contact.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn"><i className="ph ph-linkedin-logo" /></a>
          <a href={whatsapp} target="_blank" rel="noreferrer" aria-label="WhatsApp"><i className="ph ph-whatsapp-logo" /></a>
        </div>
      </div>
      <div className="footer-col footer-nav-col">
        <h4>Navegação</h4>
        <nav className="footer-nav-stair" aria-label="Navegação do rodapé">
          <a href="#atuacao"><span className="footer-nav-dot" aria-hidden="true" />Atuação</a>
          <a href="#segmentos"><span className="footer-nav-dot" aria-hidden="true" />Segmentos</a>
          <a href="#metodo"><span className="footer-nav-dot" aria-hidden="true" />Método</a>
          <a href="#/sobre"><span className="footer-nav-dot" aria-hidden="true" />Quem somos</a>
          <a href="#faq"><span className="footer-nav-dot" aria-hidden="true" />Dúvidas</a>
          <a href="#contato"><span className="footer-nav-dot" aria-hidden="true" />Contato</a>
        </nav>
      </div>
      <div className="footer-col">
        <h4>Contato</h4>
        <p>{contact.address.map((line, i) => <React.Fragment key={i}>{i > 0 && <br />}{line}</React.Fragment>)}</p>
        {contact.phones.map((phone) => <a key={phone} href={`tel:${phone.replace(/\D/g, '')}`}>{phone}</a>)}
        <a href={`mailto:${contact.email}`}>{contact.email}</a>
        <a href={whatsapp} target="_blank" rel="noreferrer">WhatsApp <i className="ph ph-whatsapp-logo" /></a>
      </div>
    </div>
    <div className="footer-bottom">
      <small>© 2026 Prospecção Brasil. Todos os direitos reservados.</small>
      <small>CRECI-RJ</small>
    </div>
  </footer>;
}

// URL da API do CRM por ambiente: VITE_API_URL > dev local > produção.
const API_URL = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8090' : 'https://sistema.prospeccaobrasil.com.br')).replace(/\/$/, '');

function ContactPage() {
  const [envio, setEnvio] = useState({ estado: 'idle', erro: '', waUrl: '' });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (envio.estado === 'enviando') return;
    const data = new FormData(event.target);
    const nome = data.get('name') || '';
    const email = data.get('email') || '';
    const telefone = data.get('phone') || '';
    const mensagem = data.get('message') || '';
    const lines = [
      `Olá! Meu nome é ${nome}.`,
      data.get('company') && `Empresa: ${data.get('company')}.`,
      `E-mail: ${email}`,
      telefone && `Telefone: ${telefone}`,
      '',
      mensagem,
    ].filter(Boolean).join('\n');
    const waUrl = `https://wa.me/5521998423232?text=${encodeURIComponent(lines)}`;

    setEnvio({ estado: 'enviando', erro: '', waUrl });
    try {
      const res = await fetch(`${API_URL}/api/public/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome, telefone, email,
          interesse: data.get('company') ? `Empresa: ${data.get('company')}` : null,
          mensagem,
          origem: 'site',
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || (res.status === 429 ? 'Muitos envios. Aguarde alguns minutos.' : 'Não foi possível registrar seu contato.'));
      }
      // Persistido no CRM — o WhatsApp fica como passo seguinte explícito (evita bloqueio de popup)
      setEnvio({ estado: 'ok', erro: '', waUrl });
    } catch (e) {
      setEnvio({
        estado: 'erro',
        erro: e.message === 'Failed to fetch'
          ? 'Sem conexão com o sistema. Seu contato não foi registrado — tente novamente ou fale direto pelo WhatsApp.'
          : e.message,
        waUrl,
      });
    }
  };

  return <main>
    <section className="contact-page">
      <div className="contact-aura" aria-hidden="true" />
      <div className="contact-grid">
        <div className="contact-copy" data-reveal>
          <div className="eyebrow"><span /> Fale conosco</div>
          <h1>Vamos encontrar o próximo endereço da <em>sua marca.</em></h1>
          <p>Conte o momento da sua expansão. Analisamos o cenário e respondemos rápido — pelo formulário, WhatsApp, telefone ou e-mail.</p>
          <ul className="contact-points">
            <li><i className="ph ph-whatsapp-logo" /><div><strong>WhatsApp</strong><a href={whatsapp} target="_blank" rel="noreferrer">+55 21 99842-3232 · resposta rápida</a></div></li>
            <li><i className="ph ph-envelope-simple" /><div><strong>E-mail</strong><a href={`mailto:${contact.email}`}>{contact.email}</a></div></li>
            <li><i className="ph ph-phone" /><div><strong>Telefones</strong><span>{contact.phones.join(' · ')}</span></div></li>
            <li><i className="ph ph-map-pin" /><div><strong>Escritório</strong><span>{contact.address.join(' · ')}</span></div></li>
          </ul>
          <p className="contact-social-line">Também estamos no <a href={contact.instagram} target="_blank" rel="noreferrer">Instagram</a> e <a href={contact.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>.</p>
        </div>
        <form className="contact-form" onSubmit={handleSubmit} data-reveal>
          <div className="contact-form-head field-full">
            <span>Fale com um especialista</span>
            <h2>Conte sobre o seu projeto</h2>
            <p>Preencha e abriremos o WhatsApp com a mensagem pronta para envio.</p>
          </div>
          <div className="field field-full"><label htmlFor="cf-name">Seu nome</label><input id="cf-name" name="name" type="text" autoComplete="name" placeholder="Como podemos chamar você?" required /></div>
          <div className="field"><label htmlFor="cf-company">Empresa</label><input id="cf-company" name="company" type="text" autoComplete="organization" placeholder="Ex.: Rede de farmácias" /></div>
          <div className="field"><label htmlFor="cf-phone">Telefone / WhatsApp</label><input id="cf-phone" name="phone" type="tel" autoComplete="tel" placeholder="(21) 99999-9999" /></div>
          <div className="field field-full"><label htmlFor="cf-email">E-mail</label><input id="cf-email" name="email" type="email" autoComplete="email" placeholder="voce@empresa.com.br" required /></div>
          <div className="field field-full"><label htmlFor="cf-message">Como podemos ajudar?</label><textarea id="cf-message" name="message" placeholder="Conte sobre sua operação, regiões de interesse e metas de expansão." required /></div>
          {envio.estado === 'ok' ? (
            <div className="contact-form-status ok" role="status">
              <p><strong>Recebemos seu contato!</strong> Nossa equipe retorna em breve.</p>
              <a className="button" href={envio.waUrl} target="_blank" rel="noreferrer">Continuar pelo WhatsApp <i className="ph ph-whatsapp-logo" /></a>
            </div>
          ) : (
            <>
              {envio.estado === 'erro' && <div className="contact-form-status erro" role="alert"><p>{envio.erro}</p><a href={envio.waUrl} target="_blank" rel="noreferrer">Ou fale direto pelo WhatsApp</a></div>}
              <button className="button" type="submit" disabled={envio.estado === 'enviando'}>
                {envio.estado === 'enviando' ? 'Enviando…' : 'Enviar'} <i className="ph ph-whatsapp-logo" />
              </button>
            </>
          )}
          <small className="contact-form-note">Prefere e-mail? Escreva para <a href={`mailto:${contact.email}`}>{contact.email}</a></small>
        </form>
      </div>
    </section>
  </main>;
}

function AboutPage() {
  const values = [
    ['ph-map-pin-area', 'Campo antes de tudo', 'Nenhum ponto entra em pauta sem visita, leitura de fluxo e conversa com o entorno.'],
    ['ph-chart-line-up', 'Dados com contexto', 'Renda, densidade e concorrência interpretados por quem conhece a rua, não só a planilha.'],
    ['ph-handshake', 'Negociação de ponta a ponta', 'Condições, prazos e documentação conduzidos até a implantação do novo ponto.'],
    ['ph-users-three', 'Relacionamento duradouro', 'Marcas e proprietários atendidos ao longo de anos — não de uma operação só.'],
  ];

  return <main>
    <section className="about-page">
      <div className="contact-aura" aria-hidden="true" />
      <div className="about-hero" data-reveal>
        <div className="eyebrow"><span /> Quem somos</div>
        <h1>Inteligência de localização com vivência de <em>varejo.</em></h1>
        <p>A Prospecção Brasil nasceu da experiência de quem viveu a expansão de redes por dentro. Há 15 anos conectamos marcas, proprietários e investidores aos endereços certos do Rio de Janeiro.</p>
      </div>
      <div className="about-grid">
        <div className="about-photo" data-reveal>
          <div className="photo-frame"><img src="/images/luiz-claudio.png" alt="Luiz Cláudio P. André, fundador da Prospecção Brasil" /></div>
          <em className="founder-quote">“Qualidade, compromisso de todos.”</em>
        </div>
        <div className="about-copy" data-reveal>
          <h2>Luiz Cláudio P. André</h2>
          <span className="about-credentials">CEO e fundador · CRECI-RJ · CJ-8762/RJ</span>
          <p>À frente da expansão e da prospecção de lojas comerciais para redes próprias e franquias, Luiz Cláudio reúne sólida experiência executiva e ampla atuação nesses segmentos. Além das operações de locação, conduz também a comercialização de ativos imobiliários para venda.</p>
          <p>Ao longo da trajetória, acumulou mais de 400 pontos comercializados e dezenas de clientes atendidos — de farmácias a petshops — sempre com o mesmo método: campo, dados e negociação criteriosa até a assinatura.</p>
          <div className="about-values">
            {values.map(([icon, title, text]) => (
              <div key={title} className="about-value"><i className={`ph ${icon}`} /><div><strong>{title}</strong><p>{text}</p></div></div>
            ))}
          </div>
          <a className="button button-gold" href={whatsapp} target="_blank" rel="noreferrer">Conversar com o Luiz <i className="ph ph-whatsapp-logo" /></a>
        </div>
      </div>
    </section>
  </main>;
}

function Metric({ target, suffix, label }) {
  const ref = useRef(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setValue(target); return; }
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (t) => {
        const p = Math.min((t - start) / 1500, 1);
        setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: .55 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [target]);

  return <div ref={ref} data-reveal><strong>{value}{suffix}</strong><span>{label}</span></div>;
}

function HomePage() {
  const [activeSegment, setActiveSegment] = useState(2);
  const selectedSegment = segments[activeSegment];

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const img = document.querySelector('.hero-architecture img');
    const orbit = document.querySelector('.architecture-orbit');
    if (!img) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        img.style.transform = y < 1000 ? `translateY(${y * .07}px)` : '';
        if (orbit) orbit.style.transform = y < 1000 ? `translateY(${y * .04}px)` : '';
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);

  return <main>
      <section className="hero" id="inicio">
        <div className="hero-aura" aria-hidden="true" />
        <div className="hero-layout">
        <div className="hero-content">
          <div className="eyebrow"><span /> Retail &amp; Real Estate</div>
          <h1>O próximo endereço da <em>sua expansão.</em></h1>
          <p>Inteligência de mercado, prospecção e negociação para redes que querem crescer com mais precisão e menos risco.</p>
          <div className="hero-actions">
            <a className="button button-gold" href={whatsapp} target="_blank" rel="noreferrer">Planejar minha expansão <i className="ph ph-arrow-right" /></a>
            <a className="button button-glass" href="#metodo">Conhecer o método <i aria-hidden="true" className="ph ph-arrow-down-right" /></a>
          </div>
          <div className="hero-footnote"><span /> Estratégia, campo e negociação. Do início ao ponto.</div>
        </div>
        <figure className="hero-architecture">
          <div className="architecture-orbit" aria-hidden="true">
            <span className="orbit orbit-outer"><i className="planet" /><i className="planet planet-secondary" /></span>
            <span className="orbit orbit-mid"><i className="planet" /></span>
            <span className="orbit orbit-inner"><i className="planet" /></span>
          </div>
          <img src="/images/hero-architecture.png" alt="Maquete conceitual de edifício comercial com lojas de rua" width="1024" height="1024" fetchPriority="high" />

        </figure>
        </div>
        <div className="hero-scroll"><span>Explore</span><i className="ph ph-arrow-down" /></div>
      </section>

      <section className="trust-strip" aria-label="Clientes atendidos">
        <p>Marcas que confiam em nossa inteligência</p>
        <div className="logos">{[['sono-show.png','Sono Show'],['oticas-do-bem.png','Óticas do Bem'],['drogasmil.png','Drogasmil'],['ri-happy.svg','Ri Happy'],['drogarias-pacheco.png','Drogarias Pacheco'],['o-amigao.png','O Amigão'],['americanpet.webp','American Pet'],['monamie.png','Monamie']].map(([logo, name]) => <img key={logo} src={`/images/${logo}`} alt={name} />)}</div>
      </section>

      <section className="legacy-metrics" aria-label="Resultados da Prospecção Brasil">
        {[[405, '+', 'Pontos comercializados'], [92, '+', 'Clientes atendidos'], [5, '+', 'Cidades atendidas'], [15, '+', 'Anos de mercado']].map(([target, suffix, label]) => <Metric key={label} target={target} suffix={suffix} label={label} />)}
      </section>

      <section className="intro section" id="atuacao">
        <div className="section-kicker" data-reveal><span>Áreas de atuação</span><b>01</b></div>
        <div className="intro-copy" data-reveal>
          <h2>Entre uma boa oportunidade e o ponto certo, existe <em>inteligência.</em></h2>
          <p>Uma decisão imobiliária impacta vendas, operação e marca por muitos anos. Reunimos visão estratégica, leitura territorial e experiência de campo para encontrar endereços que sustentem o crescimento.</p>
        </div>
        <div className="area-grid">
          {services.map((service) => <article className="area-card" key={service.title} data-reveal>
            <div className="area-card-top"><i aria-hidden="true" className={`ph ${service.icon}`} /><span>{service.number}</span></div>
            <h3>{service.title}</h3><p>{service.text}</p>
            <div className="area-tags">{service.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
            <details><summary>Explorar atuação <i aria-hidden="true" className="ph ph-plus" /></summary><p>{service.details}</p><a className="text-link" href={whatsapp} target="_blank" rel="noreferrer">Conversar sobre esta frente <i aria-hidden="true" className="ph ph-arrow-up-right" /></a></details>
          </article>)}
        </div>
      </section>

      <section className="segments-section section" id="segmentos">
        <div className="section-kicker" data-reveal><span>Segmentos que atendemos</span><b>02</b></div>
        <div className="segments-heading" data-reveal><h2>Cada cliente pede<br />um olhar <em>específico.</em></h2><p>Cada cliente solicita um olhar de acordo com as suas premissas. Selecione o segmento e conheça o que orienta nossa análise.</p></div>
        <div className="segment-workspace" data-reveal>
          <div className="segment-cloud" role="group" aria-label="Escolha um segmento de atuação">
            {segments.map((segment, index) => <button type="button" key={segment.name} aria-pressed={activeSegment === index} aria-controls="segment-detail" onClick={() => setActiveSegment(index)}><i aria-hidden="true" className={`ph ${segment.icon}`} />{segment.name}</button>)}
          </div>
          <div className="segment-detail" id="segment-detail" role="region" aria-live="polite" aria-label="Critérios do segmento selecionado">
            <div className="segment-detail-top"><i aria-hidden="true" className={`ph ${selectedSegment.icon}`} /><span>Localização com propósito</span></div>
            <h3>{selectedSegment.name}</h3><p>{selectedSegment.text}</p><div className="segment-criteria"><span>O que analisamos</span>{selectedSegment.criteria.map(criterion => <div key={criterion}><i aria-hidden="true" className="ph ph-check" />{criterion}</div>)}</div>
          </div>
        </div>
        <div className="formats-strip"><span>Formatos de localização</span><div><span>Lojas de rua</span><span>Calçadões</span><span>Shopping centers</span><span>Centros comerciais</span></div><p>Para redes próprias e franquias.</p></div>
      </section>

      <section className="method section-dark" id="metodo">
        <div className="method-glow" />
        <div className="section-kicker light" data-reveal><span>Nosso método</span><b>03</b></div>
        <div className="method-heading" data-reveal>
          <h2>Decisões melhores nascem de um processo <em>completo.</em></h2>
          <p>Do mapa ao contrato, cada etapa reduz incertezas e aproxima sua rede do ponto que faz sentido para o negócio.</p>
        </div>
        <div className="steps">
          {steps.map(([n, title, text]) => <article className="step" key={n} data-reveal><span>{n}</span><div className="step-icon"><i className={`ph ${['ph-compass','ph-map-trifold','ph-handshake','ph-storefront'][Number(n)-1]}`} /></div><h3>{title}</h3><p>{text}</p></article>)}
        </div>
        <div className="metrics glass-card" data-reveal>
          <div><strong>360°</strong><span>Visão estratégica do processo</span></div><div><strong>RJ</strong><span>Atuamos no Rio de Janeiro</span></div><div><strong>1:1</strong><span>Atendimento próximo e especializado</span></div>
        </div>
      </section>

      <section className="case section">
        <div className="case-image" data-reveal><img src="/images/case-aerea.jpg" alt="Vista aérea de centro comercial com lojas de rua" /><span>Projeto comercial ilustrativo</span></div>
        <div className="case-copy" data-reveal>
          <div className="section-kicker compact"><span>Da visão ao endereço</span><b>04</b></div>
          <h2>O imóvel certo é aquele que funciona para <em>todos os lados.</em></h2>
          <p>Para a rede, precisa entregar mercado, operação e retorno. Para o proprietário, uma ocupação sólida. Nossa atuação conecta esses interesses com análise técnica e negociação transparente.</p>
          <ul><li><i className="ph ph-check" /> Macro e microlocalização</li><li><i className="ph ph-check" /> Viabilidade técnica e comercial</li><li><i className="ph ph-check" /> Negociação e suporte documental</li></ul>
          <a className="text-link" href={whatsapp} target="_blank" rel="noreferrer">Conversar sobre uma oportunidade <i className="ph ph-arrow-up-right" /></a>
        </div>
      </section>

      <section className="founder section" id="sobre">
        <div className="founder-copy" data-reveal>
          <div className="section-kicker compact"><span>Experiência que orienta</span><b>05</b></div>
          <h2 className="founder-statement">Construir presença onde a marca tem potencial para prosperar.</h2>
          <p>À frente da expansão e da prospecção de lojas comerciais para redes próprias e franquias, Luiz Cláudio P. André reúne sólida experiência executiva e ampla atuação nesses segmentos. Além das operações de locação, também conduz a comercialização de ativos imobiliários para venda.</p>
          <div className="founder-name"><strong>Luiz Cláudio P. André</strong><span>CEO e fundador · CRECI-RJ · CJ-8762/RJ</span></div>
        </div>
        <div className="founder-photo" data-reveal><div className="photo-frame"><img src="/images/luiz-claudio.png" alt="Luiz Cláudio Poeta André" /></div><div className="founder-badge glass-card"><i className="ph ph-seal-check" /><span><strong>Atuação especializada</strong>Retail &amp; Real Estate</span></div><em className="founder-quote">“Qualidade, compromisso de todos.”</em></div>
      </section>

      <section className="social-proof section">
        <div className="section-kicker" data-reveal><span>Relações de confiança</span><b>06</b></div>
        <div className="social-heading" data-reveal><h2>A confiança se constrói<br /><em>ponto a ponto.</em></h2><p>Proximidade com quem decide e compromisso com o crescimento de cada negócio.</p></div>
        <div className="testimonial-grid">
          <article className="testimonial-main" data-reveal><i aria-hidden="true" className="ph ph-quotes" /><blockquote>“A Prospecção Brasil selecionou os melhores pontos comerciais. Eles foram extremamente úteis para ajudar-nos a identificar novos mercados e pontos de venda.”</blockquote><div><strong>Carla Barbosa</strong></div></article>
          <div className="testimonial-side" data-reveal><p>“A Prospecção Brasil tem fornecido informações preciosas sobre mercados-alvo que ajudaram a acelerar nosso crescimento.”</p><strong>Lucas Medeiros</strong><span>Investidor imobiliário</span></div>
        </div>
      </section>

      <section className="faq section" id="faq">
        <div className="section-kicker" data-reveal><span>Dúvidas frequentes</span><b>07</b></div>
        <div className="faq-grid">
          <div className="faq-intro" data-reveal>
            <h2>Perguntas que ouvimos <em>toda semana.</em></h2>
            <p>O essencial sobre escopo, prazos e modelo de trabalho. Se a sua dúvida não estiver aqui, fale direto com a gente.</p>
            <a className="text-link" href={whatsapp} target="_blank" rel="noreferrer">Perguntar no WhatsApp <i className="ph ph-arrow-up-right" /></a>
          </div>
          <div className="faq-list" data-reveal>
            {faqs.map(([question, answer]) => <details key={question}><summary>{question}<i aria-hidden="true" className="ph ph-plus" /></summary><p>{answer}</p></details>)}
          </div>
        </div>
      </section>

      <section className="final-cta" id="contato">
        <div className="cta-orb" />
        <div className="cta-map" aria-hidden="true" />
        <div data-reveal><span className="eyebrow"><span /> Vamos conversar</span><h2>Qual será o próximo endereço da sua marca?</h2><p>Conte o momento da sua expansão. Vamos analisar o cenário e indicar o melhor caminho.</p></div>
        <a className="button button-gold button-large" href={whatsapp} target="_blank" rel="noreferrer">Falar com um especialista <i className="ph ph-whatsapp-logo" /></a>
      </section>
    </main>;
}

function App() {
  const [page, setPage] = useState(() => window.location.hash === '#/contato' ? 'contato' : window.location.hash === '#/sobre' ? 'sobre' : 'home');
  const [progress, setProgress] = useState(0);
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const onHashChange = () => setPage(window.location.hash === '#/contato' ? 'contato' : window.location.hash === '#/sobre' ? 'sobre' : 'home');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      setProgress(doc.scrollTop / Math.max(doc.scrollHeight - doc.clientHeight, 1));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [page]);

  useEffect(() => {
    if (page !== 'home') {
      window.scrollTo(0, 0);
    } else {
      const id = window.location.hash.replace(/^#\/?/, '');
      if (id) document.getElementById(id)?.scrollIntoView();
    }
    const observer = new IntersectionObserver((items) => items.forEach((item) => item.isIntersecting && item.target.classList.add('visible')), { threshold: .14 });
    document.querySelectorAll('[data-reveal]').forEach((el) => {
      const siblings = Array.from(el.parentElement?.children ?? []).filter((c) => c.hasAttribute('data-reveal'));
      el.style.transitionDelay = `${Math.min(siblings.indexOf(el) * 90, 400)}ms`;
      el.addEventListener('transitionend', () => { el.style.transitionDelay = '0ms'; }, { once: true });
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, [page]);

  useEffect(() => {
    if (page !== 'home') { setActiveSection(''); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) setActiveSection(entry.target.id); });
    }, { rootMargin: '-40% 0px -55% 0px' });
    ['atuacao', 'segmentos', 'metodo', 'sobre', 'faq'].forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, [page]);

  return <div className="site-shell">
    <div className="scroll-progress" style={{ transform: `scaleX(${progress})` }} />
    <Header activeSection={activeSection} minimal={page !== 'home'} />
    <div key={page} className="page-transition">{page === 'contato' ? <ContactPage /> : page === 'sobre' ? <AboutPage /> : <HomePage />}</div>
    <Footer minimal={page !== 'home'} />
    <a className="whatsapp-float" href={whatsapp} target="_blank" rel="noreferrer" aria-label="Conversar no WhatsApp"><i className="ph ph-whatsapp-logo" /></a>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
