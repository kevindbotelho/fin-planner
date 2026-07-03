import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  User, 
  Mail, 
  Sparkles, 
  Check, 
  CreditCard, 
  ShieldCheck, 
  Cpu, 
  ArrowRight,
  TrendingUp,
  BrainCircuit,
  MessageSquare
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';

export default function Profile() {
  const { user, profile, updateProfile, upgradeToPremium } = useAuth();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // Sync state with profile data once loaded
  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
    }
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    
    try {
      const { error } = await updateProfile(firstName, lastName);
      if (error) {
        toast.error('Erro ao atualizar perfil. Tente novamente.');
      } else {
        toast.success('Perfil atualizado com sucesso! ✨');
      }
    } catch (err) {
      toast.error('Ocorreu um erro inesperado.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleConfirmUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const { error } = await upgradeToPremium();
      if (error) {
        toast.error('Erro ao processar upgrade. Tente novamente.');
      } else {
        toast.success('Parabéns! Plano Premium com IA ativado com sucesso! 🚀💎');
        setIsUpgradeModalOpen(false);
      }
    } catch (err) {
      toast.error('Ocorreu um erro ao processar o upgrade.');
    } finally {
      setIsUpgrading(false);
    }
  };

  const isPremium = profile?.subscription_tier === 'Premium';

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Cabeçalho da página */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-manrope bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
          Meu Perfil
        </h1>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium">
          Gerencie seus dados pessoais e seu plano de assinatura
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Seção 1: Dados Pessoais */}
        <div className="lg:col-span-1 liquid-glass liquid-glass-bevel rounded-2xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-brand-500/5 dark:bg-brand-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-brand-500/15 transition-all duration-500" />
          
          <h2 className="text-lg font-bold font-manrope text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
            <User className="h-5 w-5 text-brand-500" />
            Dados Pessoais
          </h2>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                E-mail (Leitura)
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400 pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="pl-10 bg-slate-100/50 dark:bg-slate-950/40 border-slate-200/50 dark:border-white/5 text-slate-500 dark:text-slate-400 cursor-not-allowed select-none rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                Nome
              </Label>
              <Input
                id="firstName"
                type="text"
                placeholder="Ex: João"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="bg-white/50 dark:bg-slate-900/30 border-slate-200/50 dark:border-white/10 rounded-xl focus:border-brand-500 focus:ring-brand-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                Sobrenome
              </Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Ex: Silva"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="bg-white/50 dark:bg-slate-900/30 border-slate-200/50 dark:border-white/10 rounded-xl focus:border-brand-500 focus:ring-brand-500"
              />
            </div>

            <Button
              type="submit"
              disabled={isSavingProfile}
              className="w-full mt-4 bg-brand-500 hover:bg-brand-600 text-white rounded-xl shadow-md shadow-brand-500/20 active:translate-y-[0.5px] transition-all"
            >
              {isSavingProfile ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </form>
        </div>

        {/* Seção 2: Plano de Assinatura */}
        <div className="lg:col-span-2 space-y-6">
          <div className="liquid-glass liquid-glass-bevel rounded-2xl p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-brand-500/5 dark:bg-brand-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-brand-500/20 transition-all duration-500" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-lg font-bold font-manrope text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-brand-500" />
                Plano de Assinatura
              </h2>
              
              <div className={`px-4 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 backdrop-blur-md shadow-sm ${
                isPremium 
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400' 
                  : 'bg-brand-500/10 border-brand-500/30 text-brand-600 dark:text-brand-400'
              }`}>
                {isPremium ? (
                  <>
                    <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                    Plano Premium (Com IA)
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Plano Prime (Básico)
                  </>
                )}
              </div>
            </div>

            {isPremium ? (
              // Painel Premium Habilitado
              <div className="space-y-6">
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-start gap-4">
                  <div className="p-3 bg-amber-500/10 rounded-lg text-amber-500 dark:text-amber-400">
                    <BrainCircuit className="h-6 w-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                      Inteligência Artificial Ativa
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Sua conta Premium está totalmente ativada. Agora você tem acesso a insights automatizados da IA no seu dashboard, projeções inteligentes e relatórios completos.
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-200/50 dark:border-white/5 pt-6 space-y-4">
                  <h4 className="text-xs font-bold tracking-wider uppercase text-slate-400">
                    Recursos Ativados no seu Plano:
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <Check className="h-3 w-3" />
                      </div>
                      <span>Insights da IA (Comportamento de gastos)</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <Check className="h-3 w-3" />
                      </div>
                      <span>Projeção Inteligente (Forecast do mês)</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <Check className="h-3 w-3" />
                      </div>
                      <span>Relatórios avançados com Recharts</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <Check className="h-3 w-3" />
                      </div>
                      <span>Metas financeiras ilimitadas</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Painel de Marketing (Upgrade)
              <div className="space-y-6">
                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Você está atualmente no plano <strong>Prime (R$ 7/mês)</strong>. Quer levar seu controle financeiro a outro patamar? Adicione inteligência e facilidade ao seu orçamento.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card Prime */}
                  <div className="bg-slate-100/40 dark:bg-slate-900/10 border border-slate-200/40 dark:border-white/5 rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Plano Atual</div>
                      <div className="text-2xl font-black font-manrope text-slate-800 dark:text-slate-200 mt-2">Prime</div>
                      <div className="text-xs text-slate-400 mt-1">R$ 7/mês (incluso)</div>
                      
                      <div className="space-y-2 mt-4">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Check className="h-3.5 w-3.5 text-slate-400" />
                          <span>Controle de despesas básico</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Check className="h-3.5 w-3.5 text-slate-400" />
                          <span>Filtro por períodos de faturamento</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Premium (Glow Effect) */}
                  <div className="bg-gradient-to-br from-brand-500/10 to-amber-500/5 dark:from-brand-500/15 dark:to-amber-500/5 border border-brand-500/30 rounded-xl p-4 flex flex-col justify-between shadow-[0_4px_20px_-5px_rgba(16,185,129,0.2)]">
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> Recomendo
                        </div>
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-600 dark:text-brand-400">IA Habilitada</span>
                      </div>
                      <div className="text-2xl font-black font-manrope text-slate-800 dark:text-white mt-2">Premium</div>
                      <div className="text-xs text-brand-600 dark:text-brand-400 font-medium mt-1">R$ 15/mês (Adicional)</div>
                      
                      <div className="space-y-2 mt-4">
                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                          <Cpu className="h-3.5 w-3.5 text-brand-500" />
                          <span><strong>Inteligência Artificial (Insights)</strong></span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                          <TrendingUp className="h-3.5 w-3.5 text-brand-500" />
                          <span>Projeções inteligentes automáticas</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                          <MessageSquare className="h-3.5 w-3.5 text-brand-500" />
                          <span>Assistente virtual de finanças</span>
                        </div>
                      </div>
                    </div>

                    <Button 
                      onClick={() => setIsUpgradeModalOpen(true)}
                      className="w-full mt-5 bg-gradient-to-r from-brand-500 to-emerald-600 text-white rounded-xl shadow-md shadow-brand-500/30 font-bold text-xs uppercase tracking-wide hover:shadow-brand-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all"
                    >
                      Upgrade para Premium
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Confirmação do Upgrade */}
      <Dialog open={isUpgradeModalOpen} onOpenChange={setIsUpgradeModalOpen}>
        <DialogContent className="sm:max-w-[425px] liquid-glass liquid-glass-bevel border border-slate-200/50 dark:border-white/10 rounded-2xl shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-manrope flex items-center gap-2 text-slate-900 dark:text-white">
              <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
              Confirmar Assinatura Premium
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Você está prestes a ativar o plano <strong>Premium (R$ 15/mês)</strong>. Isso habilitará instantaneamente a IA e todas as projeções no seu FinPlanner.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-3">
            <div className="bg-slate-100/50 dark:bg-slate-950/40 rounded-xl p-3.5 border border-slate-200/20 dark:border-white/5 space-y-2">
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Plano Prime Base</span>
                <span>R$ 7.00/mês</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Módulo Inteligência Artificial</span>
                <span className="text-brand-500 dark:text-brand-400 font-semibold">+ R$ 8.00/mês</span>
              </div>
              <div className="border-t border-slate-200/50 dark:border-white/5 pt-2 flex justify-between text-sm font-bold text-slate-800 dark:text-slate-200">
                <span>Total Estimado</span>
                <span>R$ 15.00/mês</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 text-center italic">
              Esta é uma simulação de upgrade. Nenhuma cobrança real será efetuada no seu cartão.
            </p>
          </div>

          <DialogFooter className="flex flex-row justify-end gap-2 mt-4">
            <DialogClose asChild>
              <Button 
                variant="ghost" 
                className="text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100/40 dark:hover:bg-slate-950/20 rounded-xl"
              >
                Voltar
              </Button>
            </DialogClose>
            <Button
              onClick={handleConfirmUpgrade}
              disabled={isUpgrading}
              className="bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20"
            >
              {isUpgrading ? 'Processando...' : 'Confirmar & Ativar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
