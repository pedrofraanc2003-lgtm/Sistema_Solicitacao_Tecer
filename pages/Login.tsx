import React, { useEffect, useMemo, useState } from 'react';
import { User, UserStatus } from '../types';
import { Lock, User as UserIcon, AlertCircle, Mail, ArrowLeft } from 'lucide-react';
import tecerLogo from '../assets/logo_tecer.png';
import { sendPasswordResetEmail, signInWithIdentifier } from '../services/supabase';

interface LoginProps {
  onLogin: (user: User) => void;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

type AuthView = 'login' | 'forgot' | 'reset';

const parseHash = (): { view: AuthView } => {
  const hash = window.location.hash || '#/login';
  if (hash.startsWith('#/forgot-password')) return { view: 'forgot' };
  if (hash.startsWith('#/reset-password')) return { view: 'reset' };
  return { view: 'login' };
};

const Login: React.FC<LoginProps> = ({ onLogin, users }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [view, setView] = useState<AuthView>(() => parseHash().view);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = (next: AuthView) => {
    if (next === 'forgot') window.location.hash = '#/forgot-password';
    else if (next === 'reset') window.location.hash = '#/reset-password';
    else window.location.hash = '#/login';
  };

  useEffect(() => {
    const syncFromHash = () => {
      const parsed = parseHash();
      setView(parsed.view);
      setError('');
      setMessage('');
      setPassword('');
    };

    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  const resetTitle = useMemo(() => {
    if (view === 'forgot') return 'Recuperar Senha';
    if (view === 'reset') return 'Redefinição Externa';
    return 'Acesso ao Sistema';
  }, [view]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!identifier || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setIsSubmitting(true);
    try {
      const authenticatedUser = await signInWithIdentifier(identifier, password);
      onLogin(authenticatedUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Credenciais inválidas ou usuário inativo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email.trim()) {
      setError('Informe o e-mail cadastrado.');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const activeUser = users.find((u) => u.status === UserStatus.ATIVO && (u.email || '').toLowerCase() === normalizedEmail);

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
    <div className="min-h-screen bg-tecer-bgLight dark:bg-tecer-darkBg flex items-center justify-center p-4">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-tecer-primary/10 to-transparent" />
        <div className="absolute -top-10 left-0 h-72 w-72 rounded-full bg-tecer-secondary/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-tecer-primary/10 blur-3xl" />
      </div>
      <div className="relative max-w-[1080px] w-full grid lg:grid-cols-[1.05fr_0.95fr] rounded-[32px] overflow-hidden border border-white/50 dark:border-white/10 shadow-2xl shadow-slate-900/10">
        <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-[#083b74] via-[#005cb9] to-[#0c74d4] p-12 text-white">
          <div>
            <p className="text-[11px] uppercase tracking-[0.34em] text-white/60 font-bold">TECER PCM</p>
            <h1 className="mt-5 font-display text-5xl font-extrabold leading-[0.95] !text-white">Operação mais clara, madura e confiável.</h1>
            <p className="mt-6 max-w-md text-sm leading-7 !text-white/76">
              Plataforma central para gestão de solicitações, materiais, ativos operacionais e rastreabilidade de execução.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/55 font-bold">Padrão visual</p>
              <p className="mt-2 text-lg font-semibold !text-white">Corporativo e clean</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/55 font-bold">Foco</p>
              <p className="mt-2 text-lg font-semibold !text-white">Clareza operacional</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-tecer-darkCard">
          <div className="p-8">
            <div className="flex flex-col items-center mb-10">
              <div className="mb-5 flex min-h-[88px] w-full items-center justify-center rounded-[24px] border border-slate-200 bg-white px-6 py-4 shadow-sm">
                <img src={tecerLogo} alt="Logo da TECER" className="max-h-16 w-auto object-contain" />
              </div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-tecer-grayMed font-bold">Acesso institucional</p>
              <h2 className="mt-3 font-display text-3xl font-extrabold dark:text-white">{resetTitle}</h2>
              <p className="text-tecer-grayMed text-center mt-2">Planejamento e Controle de Manutenção</p>
            </div>

            {(error || message) && (
              <div
                className={`flex items-center gap-2 p-4 rounded-lg text-sm font-medium mb-6 ${
                  error
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                    : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                }`}
              >
                <AlertCircle size={18} />
                <span>{error || message}</span>
              </div>
            )}

            {view === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-tecer-grayDark dark:text-gray-300">Usuário ou e-mail</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-tecer-grayMed" size={18} />
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Seu login institucional ou e-mail"
                      className="w-full bg-gray-50 dark:bg-tecer-darkBg border border-gray-200 dark:border-gray-700 pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-tecer-primary transition-all text-tecer-grayDark dark:text-white placeholder-gray-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-tecer-grayDark dark:text-gray-300">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-tecer-grayMed" size={18} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Sua senha do Supabase Auth"
                      className="w-full bg-gray-50 dark:bg-tecer-darkBg border border-gray-200 dark:border-gray-700 pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-tecer-primary transition-all text-tecer-grayDark dark:text-white placeholder-gray-400"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('forgot')}
                  className="text-sm font-medium text-tecer-primary hover:underline"
                >
                  Esqueci minha senha
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-tecer-primary hover:bg-[#1a2e5e] disabled:opacity-60 text-white py-3 rounded-lg font-bold shadow-lg shadow-tecer-primary/20 transition-all"
                >
                  {isSubmitting ? 'Entrando...' : 'Entrar'}
                </button>
              </form>
            )}

            {view === 'forgot' && (
              <form onSubmit={handleForgotSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-tecer-grayDark dark:text-gray-300">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-tecer-grayMed" size={18} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="usuario@empresa.com"
                      className="w-full bg-gray-50 dark:bg-tecer-darkBg border border-gray-200 dark:border-gray-700 pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-tecer-primary transition-all text-tecer-grayDark dark:text-white placeholder-gray-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-tecer-primary hover:bg-[#1a2e5e] disabled:opacity-60 text-white py-3 rounded-lg font-bold shadow-lg shadow-tecer-primary/20 transition-all"
                >
                  {isSubmitting ? 'Enviando...' : 'Enviar link de redefinição'}
                </button>

                <button
                  type="button"
                  onClick={() => navigate('login')}
                  className="w-full flex items-center justify-center gap-2 text-sm font-medium text-tecer-grayMed hover:text-tecer-primary"
                >
                  <ArrowLeft size={16} />
                  Voltar ao login
                </button>
              </form>
            )}

            {view === 'reset' && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm leading-6 text-tecer-primary">
                  A redefinição de senha agora é feita diretamente pelo link seguro enviado pelo Supabase para o seu e-mail.
                </div>
                <button
                  type="button"
                  onClick={() => navigate('login')}
                  className="w-full flex items-center justify-center gap-2 text-sm font-medium text-tecer-grayMed hover:text-tecer-primary"
                >
                  <ArrowLeft size={16} />
                  Voltar ao login
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
