import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet } from 'lucide-react';
import { z } from 'zod';
import { DashedGuides } from '@/components/layout/DashedGuides';

const authSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ email: '', password: '', confirmPassword: '' });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <DashedGuides />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-48 w-48 bg-brand-500/10 rounded-full blur-[80px]" />
        <div className="animate-pulse text-brand-500 font-bold uppercase tracking-widest text-xs font-manrope relative z-10">
          Carregando Planner...
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const validation = authSchema.safeParse(loginForm);
      if (!validation.success) {
        setError(validation.error.errors[0].message);
        setIsLoading(false);
        return;
      }

      const { error } = await signIn(loginForm.email, loginForm.password);
      if (error) {
        if (error.message === 'Invalid login credentials') {
          setError('E-mail ou senha incorretos');
        } else {
          setError(error.message);
        }
      }
    } catch (err) {
      setError('Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const validation = authSchema.safeParse(signupForm);
      if (!validation.success) {
        setError(validation.error.errors[0].message);
        setIsLoading(false);
        return;
      }

      if (signupForm.password !== signupForm.confirmPassword) {
        setError('As senhas não coincidem');
        setIsLoading(false);
        return;
      }

      const { error } = await signUp(signupForm.email, signupForm.password);
      if (error) {
        if (error.message.includes('already registered')) {
          setError('Este e-mail já está cadastrado');
        } else {
          setError(error.message);
        }
      }
    } catch (err) {
      setError('Erro ao criar conta');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 p-4 overflow-hidden">
      <DashedGuides />
      
      {/* Abstract background blobs */}
      <div className="absolute top-1/4 left-1/4 h-80 w-80 bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-80 w-80 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[420px] relative z-10">
        <Card className="liquid-glass liquid-glass-bevel border-0 shadow-2xl rounded-3xl backdrop-blur-xl bg-slate-900/40 p-2">
          <CardHeader className="text-center pt-8 pb-4">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white shadow-lg shadow-brand-500/20 border border-brand-400/30 animate-pulse">
              <Wallet className="h-5.5 w-5.5" />
            </div>
            <CardTitle className="text-xl font-bold font-manrope tracking-tight text-white mt-1">Planner Financeiro</CardTitle>
            <CardDescription className="text-xs text-slate-400 font-medium mt-1">Gerencie suas finanças com GlassFinance</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-6">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 p-1 bg-slate-900/60 border border-slate-800/50 rounded-xl mb-5">
                <TabsTrigger value="login" className="rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 data-[state=active]:bg-slate-950 data-[state=active]:text-brand-400 data-[state=active]:shadow-sm text-slate-400 hover:text-white">Entrar</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 data-[state=active]:bg-slate-950 data-[state=active]:text-brand-400 data-[state=active]:shadow-sm text-slate-400 hover:text-white">Criar Conta</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="login-email" className="text-xs font-semibold uppercase tracking-wider text-slate-400">E-mail</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginForm.email}
                      onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
                      required
                      className="h-9.5 liquid-glass bg-slate-900/60 border-slate-800 focus-visible:ring-brand-500 rounded-xl text-xs font-semibold text-white placeholder:text-slate-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="login-password" className="text-xs font-semibold uppercase tracking-wider text-slate-400">Senha</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                      className="h-9.5 liquid-glass bg-slate-900/60 border-slate-800 focus-visible:ring-brand-500 rounded-xl text-xs font-semibold text-white placeholder:text-slate-500"
                    />
                  </div>
                  {error && (
                    <p className="text-xs text-rose-500 font-semibold text-center mt-1">{error}</p>
                  )}
                  <Button type="submit" className="w-full rounded-xl h-10 text-xs font-semibold uppercase tracking-wider bg-brand-500 hover:bg-brand-600 text-white transition-all shadow-md shadow-brand-500/10 hover:shadow-brand-500/20 mt-4" disabled={isLoading}>
                    {isLoading ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="mt-0">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="signup-email" className="text-xs font-semibold uppercase tracking-wider text-slate-400">E-mail</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={signupForm.email}
                      onChange={e => setSignupForm({ ...signupForm, email: e.target.value })}
                      required
                      className="h-9.5 liquid-glass bg-slate-900/60 border-slate-800 focus-visible:ring-brand-500 rounded-xl text-xs font-semibold text-white placeholder:text-slate-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="signup-password" className="text-xs font-semibold uppercase tracking-wider text-slate-400">Senha</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupForm.password}
                      onChange={e => setSignupForm({ ...signupForm, password: e.target.value })}
                      required
                      className="h-9.5 liquid-glass bg-slate-900/60 border-slate-800 focus-visible:ring-brand-500 rounded-xl text-xs font-semibold text-white placeholder:text-slate-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="signup-confirm" className="text-xs font-semibold uppercase tracking-wider text-slate-400">Confirmar Senha</Label>
                    <Input
                      id="signup-confirm"
                      type="password"
                      placeholder="••••••••"
                      value={signupForm.confirmPassword}
                      onChange={e => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                      required
                      className="h-9.5 liquid-glass bg-slate-900/60 border-slate-800 focus-visible:ring-brand-500 rounded-xl text-xs font-semibold text-white placeholder:text-slate-500"
                    />
                  </div>
                  {error && (
                    <p className="text-xs text-rose-500 font-semibold text-center mt-1">{error}</p>
                  )}
                  <Button type="submit" className="w-full rounded-xl h-10 text-xs font-semibold uppercase tracking-wider bg-brand-500 hover:bg-brand-600 text-white transition-all shadow-md shadow-brand-500/10 hover:shadow-brand-500/20 mt-4" disabled={isLoading}>
                    {isLoading ? 'Criando conta...' : 'Criar Conta'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
