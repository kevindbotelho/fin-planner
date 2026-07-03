import { ReactNode, useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Receipt, Settings, LogOut, Sun, Moon, Zap, ZapOff, PiggyBank, User } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { DashedGuides } from './DashedGuides';
import { useLocation } from 'react-router-dom';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });
  
  // Lógica de alternância de tema nativa
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'light';
    }
    return 'light';
  });

  // Lógica de ativação/desativação de animações nas bordas (persiste no localStorage)
  const [animationsEnabled, setAnimationsEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('border-animations') !== 'disabled';
    }
    return true;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Efeito para ativar/desativar animações de borda na raiz
  useEffect(() => {
    const root = window.document.documentElement;
    if (!animationsEnabled) {
      root.classList.add('disable-border-animations');
    } else {
      root.classList.remove('disable-border-animations');
    }
    localStorage.setItem('border-animations', animationsEnabled ? 'enabled' : 'disabled');
  }, [animationsEnabled]);

  // Efeito para rolar para o topo da página sempre que mudar de rota
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Efeito para atualizar a posição do indicador ativo deslizante
  useEffect(() => {
    const updateIndicator = () => {
      if (!navRef.current) return;
      // Encontra o link ativo pelo atributo aria-current="page"
      const activeLink = navRef.current.querySelector('[aria-current="page"]') as HTMLElement;
      
      if (activeLink) {
        setIndicatorStyle({
          left: activeLink.offsetLeft,
          width: activeLink.offsetWidth,
          opacity: 1
        });
      } else {
        setIndicatorStyle(prev => ({ ...prev, opacity: 0 }));
      }
    };

    // Pequeno delay para garantir que o react-router atualizou o DOM com o atributo ativo
    const timer = setTimeout(updateIndicator, 50);
    
    // Atualizar a posição do indicador no redimensionamento da janela
    window.addEventListener('resize', updateIndicator);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateIndicator);
    };
  }, [location.pathname]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="relative min-h-screen w-full bg-slate-50 dark:bg-black text-slate-800 dark:text-slate-100 transition-colors duration-300 font-inter pb-24 md:pb-6">
      {/* Guias arquitetônicas de fundo */}
      <DashedGuides />

      {/* 1. Header Superior Sticky (Cápsula Flutuante Liquid Glass) */}
      <div className="sticky top-0 z-50 w-full px-4 md:px-6 py-4 flex justify-center">
        <header className="w-full max-w-7xl liquid-glass liquid-glass-bevel rounded-2xl md:rounded-full px-6 py-3 md:py-3.5 flex items-center justify-between shadow-lg backdrop-blur-md">
          {/* Branding e Logo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
                <PiggyBank className="h-4.5 w-4.5" />
              </div>
              <span className="text-lg font-extrabold tracking-tight font-manrope bg-gradient-to-r from-brand-600 to-brand-500 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">Meu Fin Planner</span>
            </div>
          </div>

          {/* Navegação Desktop com Indicador Deslizante */}
          <nav 
            ref={navRef}
            className="hidden md:flex relative items-center gap-1 bg-slate-200/50 dark:bg-slate-900/40 p-1 rounded-full text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 border border-slate-200/20 dark:border-white/5"
          >
            {/* Retângulo Interno deslizante (Vidro Líquido / Glassmorphism Esmeralda) */}
            <div 
              className="absolute top-1 bottom-1 rounded-full bg-brand-500/15 dark:bg-brand-500/20 backdrop-blur-sm border border-brand-500/35 dark:border-brand-500/30 transition-all duration-300 shadow-[0_2px_10px_-3px_rgba(16,185,129,0.2)]"
              style={{
                left: `${indicatorStyle.left}px`,
                width: `${indicatorStyle.width}px`,
                opacity: indicatorStyle.opacity,
                transitionTimingFunction: 'cubic-bezier(0.25, 1, 0.5, 1)'
              }}
            />

            <NavLink
              to="/"
              end
              className="relative z-10 px-5 py-2 rounded-full transition-all duration-300 hover:text-slate-800 dark:hover:text-slate-200"
              activeClassName="text-brand-700 dark:text-brand-400 font-bold"
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/despesas"
              className="relative z-10 px-5 py-2 rounded-full transition-all duration-300 hover:text-slate-800 dark:hover:text-slate-200"
              activeClassName="text-brand-700 dark:text-brand-400 font-bold"
            >
              Despesas
            </NavLink>
            <NavLink
              to="/configuracoes"
              className="relative z-10 px-5 py-2 rounded-full transition-all duration-300 hover:text-slate-800 dark:hover:text-slate-200"
              activeClassName="text-brand-700 dark:text-brand-400 font-bold"
            >
              Configurações
            </NavLink>
            <NavLink
              to="/perfil"
              className="relative z-10 px-5 py-2 rounded-full transition-all duration-300 hover:text-slate-800 dark:hover:text-slate-200"
              activeClassName="text-brand-700 dark:text-brand-400 font-bold"
            >
              Perfil
            </NavLink>
          </nav>

          {/* Controles do Usuário & Tema */}
          <div className="flex items-center gap-3">
            {/* Botão de Alternar Animações de Borda (Acessibilidade) */}
            <button 
              onClick={() => setAnimationsEnabled(prev => !prev)}
              className="w-9 h-9 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors text-slate-600 dark:text-slate-300"
              title={animationsEnabled ? "Desativar animações de borda" : "Ativar animações de borda"}
              aria-label="Alternar animações de borda"
            >
              {animationsEnabled ? (
                <Zap className="h-4.5 w-4.5 text-brand-500 animate-pulse" />
              ) : (
                <ZapOff className="h-4.5 w-4.5 text-slate-400 opacity-60" />
              )}
            </button>

            {/* Botão de Alternar Tema */}
            <button 
              onClick={toggleTheme}
              className="w-9 h-9 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              aria-label="Alternar Tema"
            >
              {theme === 'light' ? (
                <Moon className="h-4.5 w-4.5 text-slate-600" />
              ) : (
                <Sun className="h-4.5 w-4.5 text-slate-300" />
              )}
            </button>

            {/* Info do Usuário & Logout (Desktop) */}
            <div className="hidden md:flex items-center gap-3 border-l border-slate-200 dark:border-slate-800 pl-3">
              <NavLink 
                to="/perfil"
                className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-brand-500 dark:hover:text-brand-400 max-w-[150px] truncate transition-colors duration-200"
                title={user?.email || ''}
              >
                Olá, {profile?.first_name ? profile.first_name : 'Usuário'}!
              </NavLink>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="h-8 px-2 text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 gap-1.5"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-xs font-medium">Sair</span>
              </Button>
            </div>

            {/* Logout Simplificado (Mobile) */}
            <button
              onClick={() => signOut()}
              className="md:hidden w-9 h-9 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-800 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
      </div>

      {/* 2. Conteúdo Principal */}
      <main className="mx-auto max-w-7xl relative z-10 px-4 md:px-6 lg:px-8 py-6 md:py-8">
        {children}
      </main>

      {/* 3. Barra de Navegação Inferior (Mobile - Pílula Flutuante) */}
      <div className="fixed bottom-6 left-4 right-4 md:hidden z-50">
        <div className="liquid-glass liquid-glass-bevel rounded-full py-2.5 px-6 shadow-xl flex items-center justify-around max-w-md mx-auto">
          <NavLink
            to="/"
            end
            className="flex flex-col items-center gap-1 text-slate-500 dark:text-slate-400 transition-all hover:text-brand-500"
            activeClassName="text-brand-500 dark:text-brand-400 font-semibold"
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-[9px] uppercase tracking-wider">Dashboard</span>
          </NavLink>

          <NavLink
            to="/despesas"
            className="flex flex-col items-center gap-1 text-slate-500 dark:text-slate-400 transition-all hover:text-brand-500"
            activeClassName="text-brand-500 dark:text-brand-400 font-semibold"
          >
            <Receipt className="h-5 w-5" />
            <span className="text-[9px] uppercase tracking-wider">Despesas</span>
          </NavLink>

          <NavLink
            to="/configuracoes"
            className="flex flex-col items-center gap-1 text-slate-500 dark:text-slate-400 transition-all hover:text-brand-500"
            activeClassName="text-brand-500 dark:text-brand-400 font-semibold"
          >
            <Settings className="h-5 w-5" />
            <span className="text-[9px] uppercase tracking-wider">Ajustes</span>
          </NavLink>

          <NavLink
            to="/perfil"
            className="flex flex-col items-center gap-1 text-slate-500 dark:text-slate-400 transition-all hover:text-brand-500"
            activeClassName="text-brand-500 dark:text-brand-400 font-semibold"
          >
            <User className="h-5 w-5" />
            <span className="text-[9px] uppercase tracking-wider">Perfil</span>
          </NavLink>
        </div>
      </div>
    </div>
  );
}
