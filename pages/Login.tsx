import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Lock, Mail, User as UserIcon } from 'lucide-react';
import tecerLogo from '../assets/logo_tecer.png';
import { useAuth } from '../app/hooks';
import { getAuthMode, getAuthModeLabel } from '../services/authMode';
import { sendPasswordResetEmail } from '../services/data/authApi';
import Button from '../ui/Button';
import Input from '../ui/Input';

type AuthView = 'login' | 'forgot' | 'reset';

const getViewFromPath = (pathname: string): AuthView => {
  if (pathname === '/forgot-password') return 'forgot';
  if (pathname === '/reset-password') return 'reset';
  return 'login';
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const view = getViewFromPath(location.pathname);
  const authMode = getAuthMode();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const title = useMemo(() => {
    if (view === 'forgot') return 'Recuperacao de senha';
    if (view === 'reset') return 'Redefinicao externa';
    return 'Acesso institucional';
  }, [view]);

  const handleLoginSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!identifier.trim() || !password) {
      setError('Preencha usuario/e-mail e senha.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(identifier, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Credenciais invalidas ou usuario inativo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!email.trim()) {
      setError('Informe o e-mail cadastrado.');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    setIsSubmitting(true);
    try {
      await sendPasswordResetEmail(normalizedEmail);
      setMessage('Se o e-mail estiver cadastrado, voce recebera um link seguro para redefinicao de senha.');
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao solicitar redefinicao de senha.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-tecer-bgLight p-4 dark:bg-tecer-darkBg">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,61,102,0.04)_1px,transparent_1px),linear-gradient(rgba(15,61,102,0.04)_1px,transparent_1px)] bg-[size:34px_34px]" />
        <div className="absolute left-[6%] top-[8%] h-52 w-52 rounded-full border border-[rgba(167,111,44,0.14)]" />
        <div className="absolute right-[8%] top-[12%] h-64 w-64 rounded-full border border-[rgba(45,106,159,0.12)]" />
        <div className="absolute bottom-[-5%] left-[14%] h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(167,111,44,0.08),transparent_62%)]" />
      </div>

      <div className="relative grid w-full max-w-[1180px] overflow-hidden rounded-[36px] border border-[rgba(190,175,152,0.52)] bg-[rgba(255,251,245,0.68)] shadow-[0_30px_80px_rgba(20,18,15,0.12)] backdrop-blur-xl dark:border-[rgba(69,83,96,0.8)] dark:bg-[rgba(20,27,34,0.78)] lg:grid-cols-[1.08fr_0.92fr]">
        <div className="relative hidden min-h-[720px] flex-col justify-between border-r border-white/10 bg-[linear-gradient(180deg,#13181e_0%,#1d2730_48%,#233240_100%)] p-12 text-white lg:flex">
          <div className="absolute inset-8 rounded-[28px] border border-white/8" />
          <div className="relative">
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/42">TECER PCM</p>
            <h1 className="mt-8 max-w-[460px] font-display text-[72px] font-semibold leading-[0.92] text-white">
              Controle com presenca executiva.
            </h1>
            <p className="mt-8 max-w-md text-sm leading-7 text-white/72">
              Uma interface desenhada para contextos corporativos exigentes, onde leitura, confianca e estrutura precisam ser imediatas.
            </p>
          </div>

          <div className="relative grid grid-cols-2 gap-4">
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/42">Qualidade</p>
              <p className="mt-3 font-display text-2xl text-white">Organizacao densa</p>
              <p className="mt-2 text-sm leading-6 text-white/62">Conteudo importante em blocos claros, sem poluicao visual.</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/42">Direcao</p>
              <p className="mt-3 font-display text-2xl text-white">Design corporativo</p>
              <p className="mt-2 text-sm leading-6 text-white/62">Enquadramento forte, acabamentos editoriais e assinatura premium.</p>
            </div>
          </div>
        </div>

        <div className="relative bg-[linear-gradient(180deg,rgba(255,252,247,0.96),rgba(244,237,228,0.9))] dark:bg-[linear-gradient(180deg,rgba(23,29,35,0.96),rgba(19,25,31,0.92))]">
          <div className="mx-auto flex min-h-full max-w-[520px] flex-col justify-center px-7 py-10 sm:px-10">
            <div className="rounded-[28px] border border-[color:var(--color-border)] bg-[rgba(255,255,255,0.5)] p-3 shadow-[var(--shadow-soft)] dark:border-[color:var(--color-border)] dark:bg-[rgba(255,255,255,0.03)]">
              <div className="flex min-h-[100px] items-center justify-center rounded-[22px] border border-white/50 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,242,234,0.9))] px-6 py-4 dark:border-white/6 dark:bg-[linear-gradient(180deg,rgba(27,35,45,0.96),rgba(22,29,36,0.92))]">
                <img src={tecerLogo} alt="Logo da TECER" className="max-h-16 w-auto object-contain" />
              </div>
            </div>

            <div className="mt-10">
              <p className="text-[10px] font-bold uppercase tracking-[0.34em] text-tecer-grayMed">Acesso seguro</p>
              <h2 className="mt-4 font-display text-5xl font-semibold leading-[0.96] text-tecer-grayDark dark:text-white">{title}</h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-tecer-grayMed">
                Entre no ambiente de manutencao com uma experiencia mais limpa, profissional e orientada a contexto.
              </p>
              <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-tecer-grayMed">Modo de autenticacao: {getAuthModeLabel(authMode)}</p>
            </div>

            {error || message ? (
              <div className={`mt-8 flex items-start gap-3 rounded-[20px] border p-4 text-sm leading-6 ${error ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300' : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/10 dark:text-blue-300'}`}>
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span>{error || message}</span>
              </div>
            ) : null}

            {view === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="mt-8 space-y-6">
                <div className="rounded-[24px] border border-[color:var(--color-border)] bg-[rgba(255,255,255,0.5)] p-5 shadow-[var(--shadow-soft)] dark:border-[color:var(--color-border)] dark:bg-[rgba(255,255,255,0.03)]">
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-tecer-grayMed">Usuario ou e-mail</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-tecer-grayMed" size={18} />
                    <Input value={identifier} onChange={event => setIdentifier(event.target.value)} placeholder="Seu login institucional ou e-mail" className="pl-10" />
                  </div>
                </div>

                <div className="rounded-[24px] border border-[color:var(--color-border)] bg-[rgba(255,255,255,0.5)] p-5 shadow-[var(--shadow-soft)] dark:border-[color:var(--color-border)] dark:bg-[rgba(255,255,255,0.03)]">
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-tecer-grayMed">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-tecer-grayMed" size={18} />
                    <Input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Sua senha" className="pl-10" />
                  </div>
                  {authMode === 'local' ? <p className="mt-3 text-xs leading-6 text-tecer-grayMed">No modo local, a senha e validada por `VITE_LOCAL_AUTH_PASSWORD`.</p> : null}
                </div>

                <button type="button" onClick={() => navigate('/forgot-password')} className="text-sm font-semibold text-tecer-primary hover:underline">
                  Esqueci minha senha
                </button>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Entrando...' : 'Entrar no sistema'}
                </Button>
              </form>
            ) : null}

            {view === 'forgot' ? (
              <form onSubmit={handleForgotSubmit} className="mt-8 space-y-6">
                <div className="rounded-[24px] border border-[color:var(--color-border)] bg-[rgba(255,255,255,0.5)] p-5 shadow-[var(--shadow-soft)] dark:border-[color:var(--color-border)] dark:bg-[rgba(255,255,255,0.03)]">
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-tecer-grayMed">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-tecer-grayMed" size={18} />
                    <Input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="usuario@empresa.com" className="pl-10" />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Enviando...' : 'Enviar link de redefinicao'}
                </Button>

                <button type="button" onClick={() => navigate('/login')} className="flex w-full items-center justify-center gap-2 text-sm font-semibold text-tecer-grayMed hover:text-tecer-primary">
                  <ArrowLeft size={16} />
                  Voltar ao login
                </button>
              </form>
            ) : null}

            {view === 'reset' ? (
              <div className="mt-8 space-y-6">
                <div className="rounded-[24px] border border-[color:var(--color-border)] bg-[rgba(255,255,255,0.5)] p-5 text-sm leading-7 text-tecer-grayDark shadow-[var(--shadow-soft)] dark:border-[color:var(--color-border)] dark:bg-[rgba(255,255,255,0.03)] dark:text-white">
                  A redefinicao de senha e feita diretamente pelo link seguro enviado pelo Supabase para o seu e-mail.
                </div>
                <button type="button" onClick={() => navigate('/login')} className="flex w-full items-center justify-center gap-2 text-sm font-semibold text-tecer-grayMed hover:text-tecer-primary">
                  <ArrowLeft size={16} />
                  Voltar ao login
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
