import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28-0.96,2.37-2.04,3.1v2.57h3.3c1.93-1.78 3.04-4.4 3.04-7.47c0-0.61-0.06-1.2-0.16-1.75Z" fill="#4285F4" />
      <path d="M12,20.62c2.43,0 4.47-0.8 5.96-2.19l-3.3-2.57c-0.9,0.6-2.06,0.97-3.37,0.97c-2.35,0-4.33-1.59-5.04-3.72H2.83v2.66c1.48,2.94 4.52,4.85 8.04,4.85Z" fill="#34A853" />
      <path d="M6.96,13.12c-0.18-0.54-0.28-1.11-0.28-1.7s0.1-1.16 0.28-1.7V7.06H2.83c-0.6,1.2-0.95,2.56-0.95,3.94c0,1.38 0.35,2.74 0.95,3.94l4.13-2.66Z" fill="#FBBC05" />
      <path d="M12,5.38c1.32,0 2.51,0.45 3.44,1.35l2.58-2.58C16.46,2.69 14.42,1.88 12,1.88C8.48,1.88 5.44,3.79 3.96,6.73l4.13,2.66c0.71-2.13 2.69-3.72 5.04-3.72Z" fill="#EA4335" />
    </svg>
  );
}

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ email: '', password: '', confirmPassword: '' });

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center"
        style={{ background: 'linear-gradient(180deg, #c8dff0 0%, #dfeaf5 35%, #eef3f8 65%, #f8fafc 100%)' }}>
        <p style={{ color: '#10b981', fontWeight: 700, fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Carregando...
        </p>
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const validation = authSchema.safeParse(loginForm);
      if (!validation.success) { setError(validation.error.errors[0].message); setIsLoading(false); return; }
      const { error } = await signIn(loginForm.email, loginForm.password);
      if (error) setError(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos' : error.message);
    } catch { setError('Erro ao fazer login'); } finally { setIsLoading(false); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const validation = authSchema.safeParse(signupForm);
      if (!validation.success) { setError(validation.error.errors[0].message); setIsLoading(false); return; }
      if (signupForm.password !== signupForm.confirmPassword) { setError('As senhas não coincidem'); setIsLoading(false); return; }
      const { error } = await signUp(signupForm.email, signupForm.password);
      if (error) setError(error.message.includes('already registered') ? 'Este e-mail já está cadastrado' : error.message);
    } catch { setError('Erro ao criar conta'); } finally { setIsLoading(false); }
  };

  const switchMode = () => { setError(null); setMode(mode === 'login' ? 'signup' : 'login'); };

  /* ── Focus handlers para inputs ── */
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'rgba(16, 185, 129, 0.5)';
    e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.08)';
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'rgba(0, 0, 0, 0.1)';
    e.target.style.boxShadow = 'none';
  };

  /* ── Estilos reutilizáveis ── */
  const inputStyle: React.CSSProperties = {
    width: '100%', height: '48px', paddingLeft: '44px', paddingRight: '44px',
    background: 'rgba(255, 255, 255, 0.85)', border: '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: '14px', fontSize: '15px', fontWeight: 400, color: '#111827',
    outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
    fontFamily: 'Inter, system-ui, sans-serif',
  };

  const iconLeft: React.CSSProperties = {
    position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
    color: '#9ca3af', pointerEvents: 'none', width: '18px', height: '18px',
  };

  const eyeBtn: React.CSSProperties = {
    position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
    color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer',
    padding: '2px', display: 'flex', alignItems: 'center', transition: 'color 0.2s',
  };

  /* ── Helper: renderizar input ── */
  const renderInput = (
    type: string, placeholder: string, value: string,
    onChange: (v: string) => void, icon: 'mail' | 'lock',
    showPw?: boolean, togglePw?: () => void,
  ) => (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {icon === 'mail' ? <Mail style={iconLeft} /> : <Lock style={iconLeft} />}
      <input
        type={showPw !== undefined ? (showPw ? 'text' : 'password') : type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        required
        style={inputStyle}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      {togglePw && (
        <button type="button" style={eyeBtn} onClick={togglePw}
          onMouseEnter={e => (e.currentTarget.style.color = '#374151')}
          onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
        >
          {showPw ? <EyeOff style={{ width: '18px', height: '18px' }} /> : <Eye style={{ width: '18px', height: '18px' }} />}
        </button>
      )}
    </div>
  );

  return (
    <div
      className="relative flex items-center justify-center overflow-hidden px-4"
      style={{
        background: 'linear-gradient(180deg, #c8dff0 0%, #dfeaf5 35%, #eef3f8 65%, #f8fafc 100%)',
        minHeight: '100vh',
      }}
    >
      {/* Animação de transição entre modos (injetada inline) */}
      <style>{`
        @keyframes authSlideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* Card central – formato generoso e quadrado */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.55)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(148, 163, 184, 0.3)',
          boxShadow: '0 8px 40px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.65)',
          borderRadius: '28px',
          padding: '36px 40px 28px',
          width: '100%',
          maxWidth: '480px',
          minHeight: '580px',
          display: 'flex',
          flexDirection: 'column' as const,
        }}
      >
        {/* ── Logo do sistema (escurecida via CSS filter) ── */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
          <img
            src="/logo-cropped.png"
            alt="MeuFin Planner"
            style={{
              width: '200px',
              height: 'auto',
              objectFit: 'contain',
              filter: 'brightness(0) opacity(0.8)',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Subtítulo */}
        <p style={{
          textAlign: 'center', fontSize: '13px', color: '#6b7280',
          lineHeight: '1.5', fontFamily: 'Inter, system-ui, sans-serif',
          marginBottom: '28px',
        }}>
          Gerencie suas finanças com simplicidade e precisão
        </p>

        {/* ── Formulário ── */}
        <form
          onSubmit={mode === 'login' ? handleLogin : handleSignup}
          style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
        >
          {/* Área de campos com altura fixa (botões nunca se movem) */}
          <div style={{ height: '190px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Wrapper animado – re-renderiza com animação ao trocar de modo */}
            <div
              key={mode}
              style={{ animation: 'authSlideIn 0.3s ease-out', display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* E-mail */}
                {renderInput(
                  'email', 'Email',
                  mode === 'login' ? loginForm.email : signupForm.email,
                  v => mode === 'login'
                    ? setLoginForm({ ...loginForm, email: v })
                    : setSignupForm({ ...signupForm, email: v }),
                  'mail',
                )}

                {/* Senha */}
                {renderInput(
                  'password', 'Senha',
                  mode === 'login' ? loginForm.password : signupForm.password,
                  v => mode === 'login'
                    ? setLoginForm({ ...loginForm, password: v })
                    : setSignupForm({ ...signupForm, password: v }),
                  'lock',
                  mode === 'login' ? showLoginPassword : showSignupPassword,
                  () => mode === 'login'
                    ? setShowLoginPassword(!showLoginPassword)
                    : setShowSignupPassword(!showSignupPassword),
                )}

                {/* Confirmar Senha (signup) */}
                {mode === 'signup' && renderInput(
                  'password', 'Confirmar senha',
                  signupForm.confirmPassword,
                  v => setSignupForm({ ...signupForm, confirmPassword: v }),
                  'lock',
                  showConfirmPassword,
                  () => setShowConfirmPassword(!showConfirmPassword),
                )}
              </div>

              {/* "Esqueceu a senha?" (login only – colado abaixo da senha) */}
              {mode === 'login' && (
                <div style={{ textAlign: 'right', marginTop: '10px' }}>
                  <button
                    type="button"
                    style={{
                      background: 'none', border: 'none', fontSize: '13px', fontWeight: 500,
                      color: '#6b7280', cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif',
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#111827')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
                  >
                    Esqueceu a senha?
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Erro */}
          {error && (
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#ef4444', textAlign: 'center', marginBottom: '4px' }}>
              {error}
            </p>
          )}

          {/* ── Ações (sempre fixas no rodapé do card) ── */}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Botão CTA preto */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%', height: '48px',
                background: '#111827', color: '#ffffff', border: 'none',
                borderRadius: '14px', fontSize: '15px', fontWeight: 600,
                cursor: isLoading ? 'default' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                transition: 'background 0.2s',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
              onMouseEnter={e => { if (!isLoading) e.currentTarget.style.background = '#1f2937'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#111827'; }}
            >
              {mode === 'login'
                ? isLoading ? 'Entrando...' : 'Entrar'
                : isLoading ? 'Criando conta...' : 'Criar Conta'
              }
            </button>

            {/* Divisor pontilhado */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '2px 0' }}>
              <div style={{ flex: 1, borderTop: '1px dashed #d1d5db' }} />
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#9ca3af', whiteSpace: 'nowrap', fontFamily: 'Inter, system-ui, sans-serif' }}>
                ou entre com
              </span>
              <div style={{ flex: 1, borderTop: '1px dashed #d1d5db' }} />
            </div>

            {/* Botão Google */}
            <button
              type="button"
              style={{
                width: '100%', height: '48px',
                background: 'rgba(255, 255, 255, 0.7)',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '14px', fontSize: '14px', fontWeight: 500,
                color: '#374151', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                transition: 'background 0.2s, border-color 0.2s',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.95)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.18)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.7)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; }}
            >
              <GoogleIcon />
              Entrar com o Google
            </button>

            {/* Alternância login / cadastro */}
            <p style={{ textAlign: 'center', fontSize: '13px', color: '#6b7280', marginTop: '2px', fontFamily: 'Inter, system-ui, sans-serif' }}>
              {mode === 'login' ? 'Não tem conta? ' : 'Já tem conta? '}
              <button
                type="button"
                onClick={switchMode}
                style={{
                  background: 'none', border: 'none', fontSize: '13px', fontWeight: 600,
                  color: '#111827', cursor: 'pointer', textDecoration: 'underline',
                  textUnderlineOffset: '2px', fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                {mode === 'login' ? 'Criar conta' : 'Entrar'}
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
