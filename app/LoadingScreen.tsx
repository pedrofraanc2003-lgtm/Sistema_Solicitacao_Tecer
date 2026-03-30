export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-tecer-bgLight px-6 text-tecer-grayDark dark:bg-tecer-darkBg dark:text-white">
      <div className="w-full max-w-sm rounded-[28px] border border-[color:var(--color-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(246,250,255,0.98))] p-8 text-center shadow-[var(--shadow-card)] dark:border-[color:var(--color-border)] dark:bg-[linear-gradient(180deg,rgba(16,34,56,0.96),rgba(13,34,57,0.94))]">
        <div className="mx-auto h-12 w-12 animate-pulse rounded-2xl bg-[linear-gradient(135deg,var(--color-primary),var(--color-secondary))]" />
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.24em] text-tecer-grayMed">Inicializando</p>
        <h2 className="mt-3 font-display text-2xl font-extrabold">Validando sessao</h2>
        <p className="mt-2 text-sm leading-6 text-tecer-grayMed">Estamos preparando o ambiente com seus dados, acessos e sincronizacao.</p>
      </div>
    </div>
  );
}

export default LoadingScreen;
