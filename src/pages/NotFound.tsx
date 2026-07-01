import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { DashedGuides } from "@/components/layout/DashedGuides";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 p-4 overflow-hidden">
      <DashedGuides />
      
      {/* Abstract background blobs */}
      <div className="absolute top-1/4 left-1/4 h-80 w-80 bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-80 w-80 bg-rose-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-sm relative z-10 text-center">
        <div className="liquid-glass liquid-glass-bevel border-0 shadow-2xl rounded-3xl backdrop-blur-xl bg-slate-900/40 p-8">
          <h1 className="text-6xl font-extrabold font-manrope tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-emerald-500">404</h1>
          <p className="mt-2 text-sm font-semibold text-slate-300">Página Não Encontrada</p>
          <p className="mt-1 text-xs text-slate-450 dark:text-slate-500 font-medium leading-relaxed">O caminho solicitado não existe ou foi movido temporariamente.</p>
          
          <div className="mt-6">
            <Link 
              to="/" 
              className="inline-flex items-center justify-center rounded-xl h-10 px-6 text-xs font-semibold uppercase tracking-wider bg-brand-500 hover:bg-brand-600 text-white transition-all shadow-md shadow-brand-500/10 hover:shadow-brand-500/20"
            >
              Voltar para o Início
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
