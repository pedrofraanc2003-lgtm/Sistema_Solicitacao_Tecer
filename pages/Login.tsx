import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Lock, Mail, User as UserIcon } from 'lucide-react';
import tecerLogo from '../assets/logo_tecer.png';
import { User, UserStatus } from '../types';
import { sendPasswordResetEmail, signIn } from '../services/data/authApi';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface LoginProps {
  onLogin: (user: User | null) => void;
  users: User[];
}

type AuthView = 'login' | 'forgot' | 'reset';

const getViewFromPath = (pathname: string): AuthView => {
  if (pathname === '/forgot-password') return 'forgot';
  if (pathname === '/reset-password') return 'reset';
  return 'login';
};

const Login: React.FC<LoginProps> = ({ onLogin, users }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const view = getViewFromPath(location.pathname);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const title = useMemo(() => {
    if (view === 'forgot') return 'Recuperar senha';
    if (view === 'reset') return 'Redefinição externa';
    return 'Acesso ao sistema';
  }, [view]);

  const handleLoginSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!identifier.trim() || !password) {
      setError('Preencha usuário/e-mail e senha.');
      return;
    }

    setIsSubmitting(true);
    try {
      const authenticatedUser = await signIn(identifier, password);
      onLogin(authenticatedUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Credenciais inválidas ou usuário inativo.');
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
    const activeUser = users.find(
      user => user.status === UserStatus.ATIVO && (user.email || '').toLowerCase() === normalizedEmail
    );

    setIsSubmitting(true);
    try {
      if (activeUser?.email) {
        await sendPasswordResetEmail(normalizedEmail);
      }

      setMessage('Se o e-mail estiver cadastrado, você receberá um link seguro para redefinição de senha.');
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao solicitar redefinição de senha.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-tecer-bgLight p-4 dark:bg-tecer-darkBg">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-tecer-primary/10 to-transparent" />
        <div className="absolute -top-10 left-0 h-72 w-72 rounded-full bg-tecer-secondary/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-tecer-primary/10 blur-3xl" />
      </div>

      <div className="relative grid w-full max-w-[1080px] overflow-hidden rounded-[32px] border border-white/50 shadow-2xl shadow-slate-900/10 dark:border-white/10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="hidden flex-col justify-between bg-gradient-to-br from-[#083b74] via-[#005cb9] to-[#0c74d4] p-12 text-white lg:flex">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-white/60">TECER PCM</p>
            <h1 className="mt-5 font-display text-5xl font-extrabold leading-[0.95] text-white">
              Operação mais clara, madura e confiável.
            </h1>
            <p className="mt-6 max-w-md text-sm leading-7 text-white/80">
              Plataforma central para gestão de solicitações, materiais, ativos operacionais e rastreabilidade de execução.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">Padrão visual</p>
              <p className="mt-2 text-lg font-semibold text-white">Corporativo e clean</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">Foco</p>
              <p className="mt-2 text-lg font-semibold text-white">Clareza operacional</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-tecer-darkCard">
          <div className="p-8">
            <div className="mb-10 flex flex-col items-center">
              <div className="mb-5 flex min-h-[88px] w-full items-center justify-center rounded-[24px] border border-slate-200 bg-white px-6 py-4 shadow-sm">
                <img src={tecerLogo} alt="Logo da TECER" className="max-h-16 w-auto object-contain" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-tecer-grayMed">Acesso institucional</p>
              <h2 className="mt-3 font-display text-3xl font-extrabold dark:text-white">{title}</h2>
              <p className="mt-2 text-center text-tecer-grayMed">Planejamento e Controle de Manutenção</p>
            </div>

            {(error || message) ? (
              <div
                className={`mb-6 flex items-center gap-2 rounded-lg p-4 text-sm font-medium ${
                  error
                    ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                    : 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                }`}
              >
                <AlertCircle size={18} />
                <span>{error || message}</span>
              </div>
            ) : null}

            {view === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-tecer-grayDark dark:text-gray-300">Usuário ou e-mail</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-tecer-grayMed" size={18} />
                    <Input value={identifier} onChange={event => setIdentifier(event.target.value)} placeholder="Seu login institucional ou e-mail" className="pl-10" />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-tecer-grayDark dark:text-gray-300">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-tecer-grayMed" size={18} />
                    <Input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Sua senha" className="pl-10" />
                  </div>
                </div>

                <button type="button" onClick={() => navigate('/forgot-password')} className="text-sm font-medium text-tecer-primary hover:underline">
                  Esqueci minha senha
                </button>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>
            ) : null}

            {view === 'forgot' ? (
              <form onSubmit={handleForgotSubmit} className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-tecer-grayDark dark:text-gray-300">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-tecer-grayMed" size={18} />
                    <Input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="usuario@empresa.com" className="pl-10" />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Enviando...' : 'Enviar link de redefinição'}
                </Button>

                <button type="button" onClick={() => navigate('/login')} className="flex w-full items-center justify-center gap-2 text-sm font-medium text-tecer-grayMed hover:text-tecer-primary">
                  <ArrowLeft size={16} />
                  Voltar ao login
                </button>
              </form>
            ) : null}

            {view === 'reset' ? (
              <div className="space-y-6">
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm leading-6 text-tecer-primary">
                  A redefinição de senha é feita diretamente pelo link seguro enviado pelo Supabase para o seu e-mail.
                </div>
                <button type="button" onClick={() => navigate('/login')} className="flex w-full items-center justify-center gap-2 text-sm font-medium text-tecer-grayMed hover:text-tecer-primary">
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
};

export default Login;
