import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../tourflow/LoginLayout.css';

const CHAVE_CONTA = 'pb_conta_lembrada';
const lerConta = () => { try { return JSON.parse(localStorage.getItem(CHAVE_CONTA)); } catch { return null; } };
const gravarConta = conta => { try { if (conta) localStorage.setItem(CHAVE_CONTA, JSON.stringify(conta)); else localStorage.removeItem(CHAVE_CONTA); } catch { /* lembrar é só conveniência */ } };
const iniciais = nome => { const p = nome.trim().split(/\s+/); return ((p[0]?.[0] || '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase(); };
function saudacao() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

export default function Login() {
  const nav = useNavigate();
  const [conta, setConta] = useState(lerConta);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [lembrar, setLembrar] = useState(true);
  const [mostrar, setMostrar] = useState(false);
  const [ajuda, setAjuda] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const senhaRef = useRef(null);
  useEffect(() => { if (conta) senhaRef.current?.focus(); }, [conta]);

  async function entrar(e) {
    e.preventDefault(); if (carregando) return;
    setCarregando(true); setErro('');
    const acesso = (conta?.email || email).trim();
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: acesso, senha }) });
      const dados = await res.json();
      if (!res.ok) throw new Error(dados.error || 'Não foi possível entrar. Confira seus dados.');
      localStorage.setItem('pb_token', dados.token); localStorage.setItem('pb_user', JSON.stringify(dados.usuario));
      gravarConta(lembrar ? { email: acesso, nome: dados.usuario?.nome || acesso } : null);
      nav('/', { replace: true });
    } catch (error) {
      setErro(error.message === 'Failed to fetch' ? 'Não foi possível conectar. Tente novamente em instantes.' : error.message);
      setSenha(''); senhaRef.current?.focus();
    } finally { setCarregando(false); }
  }
  function usarOutraConta() { gravarConta(null); setConta(null); setEmail(''); setSenha(''); setErro(''); }

  return <div className="lg">
    <section className="lg-marca">
      <div className="lg-marca__decoracao" aria-hidden="true"><span /><span /><span /></div>
      <img src="/images/logo-wide.png" alt="Prospecção Brasil" className="lg-marca__logo" />
      <div className="lg-marca__texto">
        {conta
          ? <div className="lg-conta"><span className="lg-conta__avatar">{iniciais(conta.nome)}</span><div><h1 className="lg-marca__titulo">Olá de novo, {conta.nome.split(' ')[0]}</h1><p className="lg-marca__sub">{conta.email}</p></div></div>
          : <><h1 className="lg-marca__titulo">{saudacao()}! Bom te ver por aqui.</h1><p className="lg-marca__sub">Imóveis, clientes, operações e inteligência de mercado da Prospecção Brasil em um só lugar.</p></>}
      </div>
      <p className="lg-marca__rodape">© {new Date().getFullYear()} Prospecção Brasil</p>
    </section>
    <main className="lg-form">
      <form className="lg-form__caixa" onSubmit={entrar} noValidate>
        <div>
          <h2 className="lg-form__titulo">{conta ? 'Digite sua senha' : 'Entrar'}</h2>
          <p className="lg-form__sub">{conta ? 'Para continuar de onde parou.' : 'Use seu e-mail e senha do sistema.'}</p>
        </div>
        {conta
          ? <input type="text" name="email" autoComplete="username" value={conta.email} readOnly hidden />
          : <div className="lg-campo"><label htmlFor="login-email" className="lg-campo__rotulo">E-mail</label><div className="lg-campo__caixa"><input id="login-email" type="email" name="email" autoComplete="username" autoFocus placeholder="voce@prospeccaobrasil.com.br" value={email} onChange={e => { setEmail(e.target.value); setErro(''); }} /></div></div>}
        <div className="lg-campo">
          <label htmlFor="login-password" className="lg-campo__rotulo">Senha</label>
          <div className="lg-campo__caixa">
            <input ref={senhaRef} id="login-password" type={mostrar ? 'text' : 'password'} autoComplete="current-password" placeholder="Sua senha" value={senha} onChange={e => { setSenha(e.target.value); setErro(''); }} />
            <button type="button" className="lg-campo__acao" onClick={() => setMostrar(!mostrar)} aria-label={mostrar ? 'Ocultar senha' : 'Mostrar senha'}><i className={`fas ${mostrar ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" /></button>
          </div>
        </div>
        <div className="lg-linha">
          <label className="lg-chave"><input type="checkbox" checked={lembrar} onChange={e => setLembrar(e.target.checked)} /><span className="lg-chave__trilho" aria-hidden="true"><span className="lg-chave__bola" /></span><span>Lembrar meu acesso</span></label>
          <button type="button" className="lg-link lg-link--botao" onClick={() => setAjuda(!ajuda)}>Esqueci a senha</button>
        </div>
        {ajuda && <p className="lg-aviso" role="status">Fale com o administrador do sistema para redefinir sua senha.</p>}
        {erro && <p className="lg-erro" role="alert"><i className="fas fa-circle-exclamation" aria-hidden="true" /> {erro}</p>}
        <button type="submit" className="lg-botao" disabled={!(conta || email.trim()) || !senha || carregando}>{carregando ? 'Entrando…' : 'Entrar'}</button>
        {conta && <button type="button" className="lg-botao lg-botao--texto" onClick={usarOutraConta}>Entrar com outra conta</button>}
      </form>
    </main>
  </div>;
}
