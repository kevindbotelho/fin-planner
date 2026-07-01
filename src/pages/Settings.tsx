import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'react-router-dom';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Trash2, ChevronDown, ChevronRight, Pencil, Check, X, Save, DollarSign, Target, ArrowRight, TrendingUp, Copy } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ColorPicker } from '@/components/ui/color-picker';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const MONTHS = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];


export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'periods';
  const tabsListRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });

  // Efeito para atualizar a posição do indicador ativo deslizante
  useEffect(() => {
    const updateIndicator = () => {
      if (!tabsListRef.current) return;
      // Encontra o trigger ativo pelo atributo data-state="active"
      const activeTrigger = tabsListRef.current.querySelector('[data-state="active"]') as HTMLElement;
      
      if (activeTrigger) {
        setIndicatorStyle({
          left: activeTrigger.offsetLeft,
          width: activeTrigger.offsetWidth,
          opacity: 1
        });
      } else {
        setIndicatorStyle(prev => ({ ...prev, opacity: 0 }));
      }
    };

    // Pequeno delay para garantir que o DOM atualizou
    const timer = setTimeout(updateIndicator, 50);
    
    // Atualizar no redimensionamento da janela
    window.addEventListener('resize', updateIndicator);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateIndicator);
    };
  }, [currentTab]);

  const {
    data,
    selectedPeriodId,
    setSelectedPeriodId,
    addBillingPeriod,
    updateBillingPeriod,
    deleteBillingPeriod,
    setMonthlyIncome,
    getIncomeForPeriod,
    addCategory,
    updateCategory,
    deleteCategory,
    addSubcategory,
    updateSubcategory,
    deleteSubcategory,
    setCategoryGoals,
    setCategoryGoalOverrides,
    getGoalForCategory,
  } = useFinance();

  const onTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString());
  const [customYears, setCustomYears] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('custom-billing-years');
      if (saved) {
        return JSON.parse(saved);
      } else {
        const currentYear = new Date().getFullYear();
        const initialYears = [
          (currentYear - 1).toString(),
          currentYear.toString(),
          (currentYear + 1).toString()
        ];
        localStorage.setItem('custom-billing-years', JSON.stringify(initialYears));
        return initialYears;
      }
    }
    return [];
  });

  // Computa a lista de anos de faturamento disponíveis
  const yearsOptions = useMemo(() => {
    // Extrai anos a partir dos períodos existentes em data.billingPeriods (ex: "Julho 2026" -> "2026")
    const registeredYears = data.billingPeriods.map(period => {
      const parts = period.name.split(' ');
      return parts[parts.length - 1];
    }).filter(year => /^\d{4}$/.test(year));

    // Junta cadastrados + criados pelo usuário
    const allYears = Array.from(new Set([
      ...registeredYears,
      ...customYears
    ])).sort();

    return allYears;
  }, [data.billingPeriods, customYears]);

  // Estados e lógicas de gerenciamento de anos (Dialogs customizados)
  const [isAddYearOpen, setIsAddYearOpen] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');
  const [isDeleteYearOpen, setIsDeleteYearOpen] = useState(false);

  // Computa se o ano selecionado atualmente possui algum período cadastrado
  const hasPeriodsInSelectedYear = useMemo(() => {
    return data.billingPeriods.some(period => {
      const parts = period.name.split(' ');
      const year = parts[parts.length - 1];
      return year === selectedYear;
    });
  }, [data.billingPeriods, selectedYear]);

  // Handler para adicionar ano através do Dialog customizado
  const handleConfirmAddYear = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanYear = newYearInput.trim();
    if (cleanYear && /^\d{4}$/.test(cleanYear)) {
      if (!customYears.includes(cleanYear)) {
        const updated = [...customYears, cleanYear].sort();
        setCustomYears(updated);
        localStorage.setItem('custom-billing-years', JSON.stringify(updated));
      }
      setSelectedYear(cleanYear);
      setIsAddYearOpen(false);
      setNewYearInput('');
    }
  };

  // Handler para confirmar a exclusão do ano e remover faturas associadas se necessário (assíncrono e ordenado)
  const handleConfirmDeleteYear = async () => {
    // Exclui períodos associados
    const periodsToDelete = data.billingPeriods.filter(period => {
      const parts = period.name.split(' ');
      const year = parts[parts.length - 1];
      return year === selectedYear;
    });

    // Exclui de forma síncrona/sequencial aguardando cada chamada terminar
    for (const period of periodsToDelete) {
      await deleteBillingPeriod(period.id);
    }

    // Remove da lista de customizados
    const updatedCustom = customYears.filter(y => y !== selectedYear);
    setCustomYears(updatedCustom);
    localStorage.setItem('custom-billing-years', JSON.stringify(updatedCustom));

    // Retorna para o ano atual do sistema
    const currentSystemYear = new Date().getFullYear().toString();
    setSelectedYear(currentSystemYear);
    setIsDeleteYearOpen(false);
  };

  // Estado para controle do modal de períodos (criação/edição)
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState({
    id: null as string | null, // se preenchido, é edição
    referenceMonth: '',
    referenceYear: '2026',
    startDate: '',
    endDate: '',
  });

  // Indexa os períodos cadastrados por nome para acesso rápido na grade anual
  const periodsMap = useMemo(() => {
    const map: { [key: string]: typeof data.billingPeriods[0] } = {};
    data.billingPeriods.forEach(period => {
      map[period.name.toLowerCase()] = period;
    });
    return map;
  }, [data.billingPeriods]);

  // Efeito para preencher o Mês e o Ano de referência automaticamente com base na Data de Início no modal (para novos cadastros)
  useEffect(() => {
    if (modalForm.startDate && modalForm.id === null) {
      const date = parseISO(modalForm.startDate);
      if (isValid(date)) {
        const monthValue = (date.getMonth() + 1).toString().padStart(2, '0');
        const yearValue = date.getFullYear().toString();
        setModalForm(prev => ({
          ...prev,
          referenceMonth: monthValue,
          referenceYear: yearsOptions.includes(yearValue) ? yearValue : prev.referenceYear,
        }));
      }
    }
  }, [modalForm.startDate, modalForm.id, yearsOptions]);

  // Income Form
  const [incomeForm, setIncomeForm] = useState<{ [key: string]: { salary: string; extraDetails: { id: string; name: string; amount: string }[] } }>({});

  // Category Form
  const [categoryForm, setCategoryForm] = useState({ name: '', color: '#10b981' });
  const [subcategoryForms, setSubcategoryForms] = useState<{ [key: string]: string }>({});
  const [openCategories, setOpenCategories] = useState<string[]>([]);

  // Goals State
  const [goalForms, setGoalForms] = useState<{ [key: string]: string }>({});
  const [showSaveGoalsDialog, setShowSaveGoalsDialog] = useState(false);
  const [isImportGoalsOpen, setIsImportGoalsOpen] = useState(false);

  // Edit Category State
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryForm, setEditCategoryForm] = useState({ name: '', color: '' });

  // Edit Subcategory State
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<string | null>(null);
  const [editSubcategoryName, setEditSubcategoryName] = useState('');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Initialize goal forms
  useEffect(() => {
    const goals: { [key: string]: string } = {};
    data.categories.forEach(cat => {
      const goalAmount = getGoalForCategory(cat.id, selectedPeriodId);
      // Treat 0 as empty string to show placeholder
      goals[cat.id] = (goalAmount > 0) ? goalAmount.toString() : '';
    });
    setGoalForms(goals);
  }, [data.categories, selectedPeriodId, data.goals, data.goalOverrides, getGoalForCategory]);

  const handleSaveAllGoals = async (mode: 'period' | 'all') => {
    const goalsToSave = data.categories.map(category => {
      const amountStr = goalForms[category.id];
      // Treat empty string or NaN as 0
      const amount = amountStr === '' || isNaN(parseFloat(amountStr)) ? 0 : parseFloat(amountStr);
      return {
        categoryId: category.id,
        amount,
      };
    });

    if (mode === 'period') {
      await setCategoryGoalOverrides(selectedPeriodId, goalsToSave);
    } else {
      await setCategoryGoals(goalsToSave, selectedPeriodId);
    }
    setShowSaveGoalsDialog(false);
  };

  const handleImportGoals = async (sourcePeriodId: string) => {
    if (!selectedPeriodId) return;
    const goalsToCopy = data.categories.map(category => {
      const amount = getGoalForCategory(category.id, sourcePeriodId);
      return {
        categoryId: category.id,
        amount,
      };
    });

    await setCategoryGoalOverrides(selectedPeriodId, goalsToCopy);

    // Update goalForms state immediately
    const updatedGoals: { [key: string]: string } = {};
    data.categories.forEach(cat => {
      const amount = getGoalForCategory(cat.id, sourcePeriodId);
      updatedGoals[cat.id] = amount > 0 ? amount.toString() : '';
    });
    setGoalForms(updatedGoals);
    setIsImportGoalsOpen(false);
    toast.success('Metas importadas com sucesso!');
  };

  // Ações para o modal de períodos
  const handleOpenCreatePeriod = (monthValue: string, yearValue: string) => {
    setModalForm({
      id: null,
      referenceMonth: monthValue,
      referenceYear: yearValue,
      startDate: '',
      endDate: '',
    });
    setIsPeriodModalOpen(true);
  };

  const handleOpenEditPeriod = (period: typeof data.billingPeriods[0]) => {
    const [monthName, year] = period.name.split(' ');
    const monthValue = MONTHS.find(m => m.label === monthName)?.value || '';

    setModalForm({
      id: period.id,
      referenceMonth: monthValue,
      referenceYear: year || '2026',
      startDate: period.startDate,
      endDate: period.endDate,
    });
    setIsPeriodModalOpen(true);
  };

  const handleSavePeriod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalForm.referenceMonth || !modalForm.referenceYear || !modalForm.startDate || !modalForm.endDate) return;

    const monthName = MONTHS.find(m => m.value === modalForm.referenceMonth)?.label || '';
    const name = `${monthName} ${modalForm.referenceYear}`;

    if (modalForm.id === null) {
      // Cadastro
      addBillingPeriod({
        name,
        startDate: modalForm.startDate,
        endDate: modalForm.endDate,
      });
    } else {
      // Edição
      updateBillingPeriod(modalForm.id, {
        name,
        startDate: modalForm.startDate,
        endDate: modalForm.endDate,
      });
    }

    setIsPeriodModalOpen(false);
  };

  // Navegação conectada: fecha modal e vai para aba específica com período pré-selecionado
  const handleNavigateToTab = useCallback((tab: string, periodId: string) => {
    setSelectedPeriodId(periodId);
    setIsPeriodModalOpen(false);
    setSearchParams({ tab });
  }, [setSelectedPeriodId, setSearchParams]);
  const handleSaveIncome = (periodId: string) => {
    const form = incomeForm[periodId];
    if (!form) return;

    const totalExtra = form.extraDetails.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

    setMonthlyIncome(
      periodId,
      parseFloat(form.salary) || 0,
      totalExtra,
      form.extraDetails.map(d => ({ ...d, amount: parseFloat(d.amount) || 0 }))
    );
  };

  const getIncomeFormValues = (periodId: string) => {
    if (incomeForm[periodId]) return incomeForm[periodId];
    const existing = getIncomeForPeriod(periodId);
    return {
      salary: existing?.salary?.toString() || '',
      extraDetails: existing?.extraDetails?.map(d => ({ ...d, amount: d.amount.toString() })) || [],
    };
  };

  const handleAddExtraDetail = (periodId: string) => {
    setIncomeForm(prev => {
      const current = prev[periodId] || getIncomeFormValues(periodId);
      return {
        ...prev,
        [periodId]: {
          ...current,
          extraDetails: [
            ...current.extraDetails,
            { id: Math.random().toString(36).substr(2, 9), name: '', amount: '' }
          ]
        }
      };
    });
  };

  const handleRemoveExtraDetail = (periodId: string, idToRemove: string) => {
    setIncomeForm(prev => {
      const current = prev[periodId] || getIncomeFormValues(periodId);
      return {
        ...prev,
        [periodId]: {
          ...current,
          extraDetails: current.extraDetails.filter(d => d.id !== idToRemove)
        }
      };
    });
  };

  const handleUpdateExtraDetail = (periodId: string, idToUpdate: string, field: 'name' | 'amount', value: string) => {
    setIncomeForm(prev => {
      const current = prev[periodId] || getIncomeFormValues(periodId);
      return {
        ...prev,
        [periodId]: {
          ...current,
          extraDetails: current.extraDetails.map(d => 
            d.id === idToUpdate ? { ...d, [field]: value } : d
          )
        }
      };
    });
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name) return;
    addCategory({ name: categoryForm.name, color: categoryForm.color });
    setCategoryForm({ name: '', color: '#10b981' });
  };

  const handleStartEditCategory = (category: typeof data.categories[0]) => {
    setEditingCategoryId(category.id);
    setEditCategoryForm({ name: category.name, color: category.color });
  };

  const handleSaveEditCategory = (categoryId: string) => {
    updateCategory(categoryId, { name: editCategoryForm.name, color: editCategoryForm.color });
    setEditingCategoryId(null);
  };

  const handleStartEditSubcategory = (subcategory: { id: string; name: string }) => {
    setEditingSubcategoryId(subcategory.id);
    setEditSubcategoryName(subcategory.name);
  };

  const handleSaveEditSubcategory = (subcategoryId: string) => {
    updateSubcategory(subcategoryId, editSubcategoryName);
    setEditingSubcategoryId(null);
  };

  const handleAddSubcategory = (categoryId: string) => {
    const name = subcategoryForms[categoryId];
    if (!name) return;
    addSubcategory(categoryId, name);
    setSubcategoryForms(prev => ({ ...prev, [categoryId]: '' }));
  };

  const toggleCategory = (categoryId: string) => {
    setOpenCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const sortedPeriods = [...data.billingPeriods].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold font-manrope tracking-tight text-slate-800 dark:text-slate-100">Configurações</h1>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Gerencie períodos de fatura, receitas e categorias</p>
      </div>

      <Tabs value={currentTab} onValueChange={onTabChange} className="space-y-6">
        <TabsList
          ref={tabsListRef}
          className="relative grid w-full grid-cols-4 lg:w-[460px] p-1 bg-slate-200/50 dark:bg-slate-900/40 border border-slate-200/20 dark:border-white/5 rounded-full text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400"
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

          <TabsTrigger 
            value="periods" 
            className="relative z-10 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all duration-300 data-[state=active]:bg-transparent dark:data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-brand-700 dark:data-[state=active]:text-brand-400 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            Períodos
          </TabsTrigger>
          <TabsTrigger 
            value="income" 
            className="relative z-10 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all duration-300 data-[state=active]:bg-transparent dark:data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-brand-700 dark:data-[state=active]:text-brand-400 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            Receitas
          </TabsTrigger>
          <TabsTrigger 
            value="goals" 
            className="relative z-10 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all duration-300 data-[state=active]:bg-transparent dark:data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-brand-700 dark:data-[state=active]:text-brand-400 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            Metas
          </TabsTrigger>
          <TabsTrigger 
            value="categories" 
            className="relative z-10 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all duration-300 data-[state=active]:bg-transparent dark:data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-brand-700 dark:data-[state=active]:text-brand-400 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            Categorias
          </TabsTrigger>
        </TabsList>

        {/* Períodos de Fatura */}
        <TabsContent value="periods" className="space-y-6">
          <Card className="bg-white dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 shadow-sm rounded-2xl">
            <CardHeader className="pb-3 border-b border-slate-200/50 dark:border-slate-800/50">
              <CardTitle className="text-base font-bold font-manrope tracking-tight text-slate-800 dark:text-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span>Visualização de Períodos</span>
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setIsAddYearOpen(true)}
                    className="h-8 w-8 rounded-xl text-slate-400 dark:text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-500/10 border border-slate-200/50 dark:border-slate-800/50 transition-colors"
                    title="Adicionar Novo Ano"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold font-inter">Clique em um mês para configurar</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 pb-6 space-y-8">
              {[...yearsOptions].sort((a, b) => b.localeCompare(a)).map(year => {
                return (
                  <div key={year} className="space-y-3.5 pb-6 border-b border-slate-100 dark:border-slate-900/60 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold font-manrope text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <span className="bg-slate-150/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 px-3.5 py-1.5 rounded-2xl text-sm font-extrabold tracking-wider border border-slate-200/60 dark:border-slate-700/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                          {year}
                        </span>
                      </h3>
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          setSelectedYear(year);
                          setIsDeleteYearOpen(true);
                        }}
                        className="h-7 w-7 rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-slate-200/50 dark:hover:border-slate-800/50 transition-colors"
                        title={`Excluir Ano ${year}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12">
                      {MONTHS.map(month => {
                        const key = `${month.label} ${year}`.toLowerCase();
                        const period = periodsMap[key];
                        const isActive = !!period;
                        
                        // Indicadores de status
                        const hasIncome = isActive && !!getIncomeForPeriod(period.id);
                        const incomeData = isActive ? getIncomeForPeriod(period.id) : undefined;
                        const totalIncome = incomeData ? incomeData.salary + incomeData.extra : 0;
                        const hasGoals = isActive && data.categories.some(cat => getGoalForCategory(cat.id, period.id) > 0);

                        return (
                          <TooltipProvider key={month.value} delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => {
                                    if (isActive) {
                                      handleOpenEditPeriod(period);
                                    } else {
                                      handleOpenCreatePeriod(month.value, year);
                                    }
                                  }}
                                  className={cn(
                                    "relative h-10 w-full flex flex-col items-center justify-center rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 border backdrop-blur-sm",
                                    isActive
                                      ? "bg-brand-500/15 dark:bg-brand-500/20 text-brand-700 dark:text-brand-400 border-brand-500/35 dark:border-brand-500/30 shadow-[0_2px_10px_-3px_rgba(16,185,129,0.15)] hover:scale-[1.02]"
                                      : "bg-slate-100/40 dark:bg-black/10 text-slate-400 dark:text-slate-500 border-slate-200/50 dark:border-slate-800/80 hover:bg-slate-200/50 dark:hover:bg-black/30 hover:text-slate-700 dark:hover:text-slate-350 hover:scale-[1.01]"
                                  )}
                                >
                                  <span>{month.label.substring(0, 3)}</span>
                                  {/* Indicadores de status */}
                                  {isActive && (
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                                      <div className={cn(
                                        "h-1.5 w-1.5 rounded-full transition-all duration-300 shadow-sm",
                                        hasIncome
                                          ? "bg-emerald-500 dark:bg-emerald-400 shadow-emerald-500/30"
                                          : "bg-amber-400 dark:bg-amber-500 shadow-amber-400/30"
                                      )} title={hasIncome ? 'Receita configurada' : 'Sem receita'} />
                                      <div className={cn(
                                        "h-1.5 w-1.5 rounded-full transition-all duration-300 shadow-sm",
                                        hasGoals
                                          ? "bg-blue-500 dark:bg-blue-400 shadow-blue-500/30"
                                          : "bg-slate-300 dark:bg-slate-600"
                                      )} title={hasGoals ? 'Metas configuradas' : 'Sem metas'} />
                                    </div>
                                  )}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" sideOffset={8} className="liquid-glass border-slate-200 dark:border-slate-800/80 rounded-xl px-3.5 py-2 text-[10px] font-bold tracking-wider uppercase font-mono shadow-md">
                                {isActive ? (
                                  <div className="space-y-1">
                                    <span className="text-brand-600 dark:text-brand-400 block">
                                      {format(parseISO(period.startDate), 'dd/MM/yyyy')} - {format(parseISO(period.endDate), 'dd/MM/yyyy')}
                                    </span>
                                    <div className="flex items-center gap-1.5 pt-0.5">
                                      <div className={cn("h-1.5 w-1.5 rounded-full", hasIncome ? "bg-emerald-500" : "bg-amber-400")} />
                                      <span className={hasIncome ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"}>
                                        {hasIncome ? `Receita: ${formatCurrency(totalIncome)}` : 'Sem receita'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <div className={cn("h-1.5 w-1.5 rounded-full", hasGoals ? "bg-blue-500" : "bg-slate-400")} />
                                      <span className={hasGoals ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}>
                                        {hasGoals ? 'Metas definidas' : 'Sem metas'}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">Não configurado</span>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Legenda dos Indicadores */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 pt-0.5">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/30" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Receita OK</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400/30" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Sem receita</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/30" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Metas OK</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Sem metas</span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="income" className="space-y-6">
          <Card className="bg-white dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 shadow-sm rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold font-manrope tracking-tight text-slate-800 dark:text-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <span>Receita por Período</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 whitespace-nowrap">Período:</span>
                  <Select value={selectedPeriodId || undefined} onValueChange={setSelectedPeriodId}>
                    <SelectTrigger className="w-[180px] h-8.5 liquid-glass text-xs font-semibold rounded-lg hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition-colors">
                      <SelectValue placeholder="Selecione um período" />
                    </SelectTrigger>
                    <SelectContent className="liquid-glass border-slate-200 dark:border-slate-800/80 rounded-xl backdrop-blur-md shadow-lg max-h-[200px] overflow-y-auto">
                      {data.billingPeriods.map(period => (
                        <SelectItem key={period.id} value={period.id}>
                          {period.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sortedPeriods.length === 0 ? (
                <p className="text-center text-slate-400 dark:text-slate-500 text-xs font-medium py-8">
                  Cadastre um período de fatura primeiro
                </p>
              ) : !selectedPeriodId ? (
                <p className="text-center text-slate-400 dark:text-slate-500 text-xs font-medium py-8">
                  Selecione um período acima para configurar a receita
                </p>
              ) : (() => {
                const period = data.billingPeriods.find(p => p.id === selectedPeriodId) || sortedPeriods[0];
                const formValues = getIncomeFormValues(period.id);
                const savedIncome = getIncomeForPeriod(period.id);

                return (
                  <div className="space-y-6 max-w-xl mx-auto pt-2">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-200/50 dark:border-slate-800/50 gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-slate-700 dark:text-slate-200">Fatura: {period.name}</h4>
                        <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                          {format(parseISO(period.startDate), 'dd/MM/yyyy')} - {format(parseISO(period.endDate), 'dd/MM/yyyy')}
                        </p>
                      </div>
                      {savedIncome && (
                        <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-xl border border-emerald-500/20 text-xs font-bold font-manrope">
                          Total: {formatCurrency(savedIncome.salary + savedIncome.extra)}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Salário Principal</Label>
                        <CurrencyInput
                          value={formValues.salary}
                          className="h-10 liquid-glass border-slate-200 dark:border-slate-800 focus-visible:ring-brand-500 rounded-xl text-xs font-semibold"
                          onChange={(value) =>
                            setIncomeForm(prev => ({
                              ...prev,
                              [period.id]: { ...(prev[period.id] || formValues), salary: value },
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Rendas Extras</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => handleAddExtraDetail(period.id)}
                            className="h-8 px-3 text-xs font-semibold rounded-lg text-brand-600 dark:text-brand-400 border-slate-250 dark:border-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-900/50"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1 text-brand-500" />
                            Adicionar
                          </Button>
                        </div>
                        
                        {formValues.extraDetails.length === 0 ? (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold text-center py-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                            Nenhuma renda extra adicionada.
                          </p>
                        ) : (
                          <div className="space-y-2.5">
                            {formValues.extraDetails.map(detail => (
                              <div key={detail.id} className="flex gap-2 items-center">
                                <Input 
                                  placeholder="Ex: Bônus, Dividendos..." 
                                  value={detail.name}
                                  onChange={(e) => handleUpdateExtraDetail(period.id, detail.id, 'name', e.target.value)}
                                  className="flex-1 h-9 liquid-glass border-slate-200 dark:border-slate-800 focus-visible:ring-brand-500 rounded-lg text-xs font-semibold"
                                />
                                <div className="w-[120px] sm:w-[150px]">
                                  <CurrencyInput
                                    value={detail.amount}
                                    onChange={(value) => handleUpdateExtraDetail(period.id, detail.id, 'amount', value)}
                                    className="h-9 liquid-glass border-slate-200 dark:border-slate-805 focus-visible:ring-brand-500 rounded-lg text-xs font-semibold"
                                  />
                                </div>
                                <Button size="icon" variant="ghost" className="h-9 w-9 hover:bg-rose-500/10 rounded-lg" type="button" onClick={() => handleRemoveExtraDetail(period.id, detail.id)}>
                                  <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-rose-500 transition-colors" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200/50 dark:border-slate-800/50">
                      <Button
                        onClick={() => handleSaveIncome(period.id)}
                        className="w-full rounded-xl h-10 text-xs font-semibold uppercase tracking-wider bg-brand-500 hover:bg-brand-600 text-white dark:bg-brand-500 dark:hover:bg-brand-600 dark:text-white transition-colors shadow-md shadow-brand-500/10"
                      >
                        Salvar Receitas
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Histórico Recente de Receitas */}
          {sortedPeriods.length > 0 && (
            <Card className="bg-white dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 shadow-sm rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold font-manrope tracking-tight text-slate-800 dark:text-slate-100">
                  Histórico Recente de Receitas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-slate-200/50 dark:border-slate-800/50">
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 h-9">Fatura</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 h-9">Salário</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 h-9">Extras</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 h-9">Total</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 h-9 text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedPeriods.slice(0, 6).map(period => {
                        const savedIncome = getIncomeForPeriod(period.id);
                        const salary = savedIncome?.salary || 0;
                        const extra = savedIncome?.extra || 0;
                        const total = salary + extra;
                        const isCurrentSelection = period.id === selectedPeriodId;

                        return (
                          <TableRow 
                            key={period.id} 
                            className={cn(
                              "border-slate-150 dark:border-slate-900/60 hover:bg-slate-50/50 dark:hover:bg-slate-950/20 cursor-pointer",
                              isCurrentSelection && "bg-brand-500/5 dark:bg-brand-500/5"
                            )}
                            onClick={() => setSelectedPeriodId(period.id)}
                          >
                            <td className="py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                              {period.name}
                            </td>
                            <td className="py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">
                              {salary > 0 ? formatCurrency(salary) : '-'}
                            </td>
                            <td className="py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">
                              {extra > 0 ? formatCurrency(extra) : '-'}
                            </td>
                            <td className="py-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                              {total > 0 ? formatCurrency(total) : formatCurrency(0)}
                            </td>
                            <td className="py-2.5 text-right">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                type="button"
                                className={cn(
                                  "h-7 px-2.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors",
                                  isCurrentSelection 
                                    ? "text-brand-600 dark:text-brand-400 bg-brand-500/10" 
                                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-250"
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPeriodId(period.id);
                                }}
                              >
                                {isCurrentSelection ? 'Selecionado' : 'Selecionar'}
                              </Button>
                            </td>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Metas */}
        <TabsContent value="goals" className="space-y-6">
          <Card className="bg-white dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 shadow-sm rounded-2xl">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
              <div className="space-y-1">
                <CardTitle className="text-base font-bold font-manrope tracking-tight text-slate-800 dark:text-slate-100">Metas por Categoria</CardTitle>
                <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                  Defina o valor limite (R$ ou %) para cada categoria.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Importar Metas */}
                {selectedPeriodId && data.billingPeriods.length > 1 && (
                  <Dialog open={isImportGoalsOpen} onOpenChange={setIsImportGoalsOpen}>
                    <Button 
                      type="button" 
                      variant="outline"
                      className="rounded-xl h-9 text-xs font-semibold uppercase tracking-wider border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors bg-white/50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-350 gap-1.5"
                      onClick={() => setIsImportGoalsOpen(true)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Importar
                    </Button>
                    <DialogContent className="max-w-xs bg-white/95 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-xl backdrop-blur-md">
                      <DialogHeader>
                        <DialogTitle className="text-slate-800 dark:text-slate-100 font-manrope font-bold text-base">
                          Importar Metas
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-550 dark:text-slate-400 font-medium font-inter">
                          Selecione o período de origem para copiar as metas para a fatura ativa.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 pt-2 custom-scrollbar">
                        {data.billingPeriods
                          .filter(p => p.id !== selectedPeriodId)
                          .map(period => (
                            <button
                              key={period.id}
                              type="button"
                              onClick={() => handleImportGoals(period.id)}
                              className="w-full text-left rounded-xl border border-slate-150 dark:border-slate-800/80 p-2.5 bg-white/40 dark:bg-black/15 hover:bg-brand-500/5 hover:border-brand-500/30 transition-all duration-200"
                            >
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{period.name}</p>
                              <p className="text-[10px] text-slate-450 font-mono mt-0.5">
                                {format(parseISO(period.startDate), 'dd/MM/yyyy')} - {format(parseISO(period.endDate), 'dd/MM/yyyy')}
                              </p>
                            </button>
                          ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

                <AlertDialog open={showSaveGoalsDialog} onOpenChange={setShowSaveGoalsDialog}>
                  <AlertDialogTrigger asChild>
                    <Button className="rounded-xl h-9 text-xs font-semibold uppercase tracking-wider bg-brand-500 hover:bg-brand-600 text-white dark:bg-brand-500 dark:hover:bg-brand-600 dark:text-white transition-colors shadow-md shadow-brand-500/10">
                      <Save className="h-4 w-4 mr-1.5" />
                      Salvar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="liquid-glass border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-xl backdrop-blur-md max-w-md">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-slate-800 dark:text-slate-100 font-manrope font-bold text-sm">Salvar Metas</AlertDialogTitle>
                      <AlertDialogDescription className="text-xs text-slate-405 font-medium">
                        Você deseja aplicar estas metas apenas para o mês selecionado ou para este mês e todos os seguintes?
                        <span className="text-[11px] text-amber-500 font-semibold mt-2 block">
                          * Alterar todos os seguintes não afetará meses passados.
                        </span>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-2">
                      <Button variant="outline" className="rounded-xl h-[38px] text-xs font-semibold uppercase tracking-wider border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors" onClick={() => setShowSaveGoalsDialog(false)}>
                        Cancelar
                      </Button>
                      <Button variant="secondary" className="rounded-xl h-[38px] text-xs font-semibold uppercase tracking-wider bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors" onClick={() => handleSaveAllGoals('period')}>
                        Apenas este mês
                      </Button>
                      <Button className="rounded-xl h-[38px] text-xs font-semibold uppercase tracking-wider bg-brand-500 hover:bg-brand-600 text-white dark:bg-brand-500 dark:hover:bg-brand-600 dark:text-white transition-colors shadow-md shadow-brand-500/10 border-0" onClick={() => handleSaveAllGoals('all')}>
                        Este mês e seguintes
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-6 pt-2 border-b border-slate-200/50 dark:border-slate-800/50 pb-5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 whitespace-nowrap">Período:</Label>
                <Select value={selectedPeriodId || undefined} onValueChange={setSelectedPeriodId}>
                  <SelectTrigger className="w-[180px] h-8.5 liquid-glass text-xs font-semibold rounded-lg hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition-colors">
                    <SelectValue placeholder="Selecione um período" />
                  </SelectTrigger>
                  <SelectContent className="liquid-glass border-slate-200 dark:border-slate-800/80 rounded-xl backdrop-blur-md shadow-lg max-h-[200px] overflow-y-auto">
                    {data.billingPeriods.map(period => (
                      <SelectItem key={period.id} value={period.id}>
                        {period.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(() => {
                const currentIncomeData = getIncomeForPeriod(selectedPeriodId);
                const periodIncome = currentIncomeData ? currentIncomeData.salary + currentIncomeData.extra : 0;
                const totalAmount = data.categories.reduce((acc, cat) => acc + (parseFloat(goalForms[cat.id]) || 0), 0);
                const totalPercentage = periodIncome > 0 ? (totalAmount / periodIncome) * 100 : 0;
                const isOverLimit = totalPercentage > 100;
                const isLimitReached = totalPercentage === 100;

                return (
                  <div className="space-y-6">
                    <div className="bg-slate-100/30 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 p-4.5 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4">
                      <div className="w-full sm:w-auto text-center sm:text-left">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider font-manrope">Receita do Período</p>
                        <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100 font-manrope mt-0.5">{formatCurrency(periodIncome)}</p>
                      </div>
                      <div className="flex-1 sm:max-w-xs w-full">
                        <div className="flex justify-between text-xs font-semibold mb-1.5">
                          <span className="text-slate-400 dark:text-slate-550 uppercase tracking-wide">Total Comprometido</span>
                          <span className={`font-bold font-mono ${isOverLimit ? 'text-rose-500' : isLimitReached ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-355'}`}>
                            {formatCurrency(totalAmount)} ({totalPercentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${isOverLimit ? 'bg-rose-500' : 'bg-brand-500'}`}
                            style={{ width: `${Math.min(totalPercentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {periodIncome === 0 ? (
                      <p className="text-center text-slate-400 dark:text-slate-500 text-xs font-medium py-8">
                        Cadastre uma receita para este período na aba "Receitas" para definir metas em R$.
                      </p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {data.categories.map(category => {
                          const amountStr = goalForms[category.id] || '0';
                          const amount = parseFloat(amountStr) || 0;
                          const percentage = periodIncome > 0 ? (amount / periodIncome) * 100 : 0;
                          const isOverride = data.goalOverrides.some(
                            o => o.categoryId === category.id && o.billingPeriodId === selectedPeriodId
                          );

                          return (
                            <div key={category.id} className="rounded-xl border border-slate-200/50 dark:border-slate-800/50 p-4 bg-white/20 dark:bg-black/10 backdrop-blur-sm transition-all duration-200 hover:bg-white/40 dark:hover:bg-black/20 flex flex-col justify-between gap-3">
                              <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-2.5">
                                    <div className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: category.color }} />
                                    <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{category.name}</span>
                                  </div>
                                  <span className={cn(
                                    "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                                    isOverride 
                                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25"
                                      : "bg-slate-100 text-slate-500 dark:bg-slate-900/60 dark:text-slate-400 border-slate-200/50 dark:border-slate-800/50"
                                  )}>
                                    {isOverride ? 'Personalizada' : 'Padrão'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 min-w-0">
                                    <Label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 block">Meta (R$)</Label>
                                    <CurrencyInput
                                      value={amountStr}
                                      onChange={(val) => setGoalForms(prev => ({ ...prev, [category.id]: val }))}
                                      className="h-9 liquid-glass border-slate-200 dark:border-slate-800 focus-visible:ring-brand-500 rounded-lg text-xs font-bold"
                                    />
                                  </div>
                                  <span className="text-slate-400 font-bold self-end mb-2.5">=</span>
                                  <div className="w-[100px] relative">
                                    <Label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 block">Meta (%)</Label>
                                    <CurrencyInput
                                      value={percentage > 0 ? percentage.toFixed(2) : ''}
                                      onChange={(val) => {
                                        let p = parseFloat(val) || 0;
                                        const newAmount = (p / 100) * periodIncome;
                                        setGoalForms(prev => ({ ...prev, [category.id]: newAmount.toString() }));
                                      }}
                                      className="pr-6 h-9 liquid-glass border-slate-200 dark:border-slate-800 focus-visible:ring-brand-500 rounded-lg text-xs font-bold"
                                    />
                                    <span className="absolute right-2.5 top-7 text-xs font-bold text-slate-400">%</span>
                                  </div>
                                </div>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden mt-1">
                                <div
                                  className="h-full transition-all duration-500"
                                  style={{ 
                                    width: `${Math.min(percentage, 100)}%`, 
                                    backgroundColor: category.color 
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                        {data.categories.length === 0 && (
                          <p className="text-center text-slate-400 dark:text-slate-500 text-xs font-medium sm:col-span-2 py-8">Nenhuma categoria cadastrada</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Histórico Recente de Planejamento */}
          {sortedPeriods.length > 0 && (
            <Card className="bg-white dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 shadow-sm rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold font-manrope tracking-tight text-slate-800 dark:text-slate-100">
                  Histórico Recente de Planejamento (Metas)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-slate-200/50 dark:border-slate-800/50">
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 h-9">Fatura</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 h-9">Receita</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 h-9">Comprometido</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 h-9">% Comprometido</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 h-9">Status</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 h-9 text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedPeriods.slice(0, 6).map(period => {
                        const periodIncomeData = getIncomeForPeriod(period.id);
                        const periodIncome = periodIncomeData ? periodIncomeData.salary + periodIncomeData.extra : 0;
                        const periodTotalGoals = data.categories.reduce((acc, cat) => acc + getGoalForCategory(cat.id, period.id), 0);
                        const isCurrentSelection = period.id === selectedPeriodId;

                        let statusColor = "bg-slate-350 dark:bg-slate-600";
                        let statusText = "Sem Metas";

                        if (periodIncome > 0 && periodTotalGoals > 0) {
                          const pct = (periodTotalGoals / periodIncome) * 100;
                          if (pct > 100) {
                            statusColor = "bg-rose-500 shadow-sm shadow-rose-500/30";
                            statusText = "Estourado";
                          } else if (pct === 100) {
                            statusColor = "bg-emerald-500 shadow-sm shadow-emerald-500/30";
                            statusText = "No Limite";
                          } else {
                            statusColor = "bg-brand-500 shadow-sm shadow-brand-500/30";
                            statusText = "Dentro do Limite";
                          }
                        }

                        return (
                          <TableRow 
                            key={period.id} 
                            className={cn(
                              "border-slate-150 dark:border-slate-900/60 hover:bg-slate-50/50 dark:hover:bg-slate-950/20 cursor-pointer",
                              isCurrentSelection && "bg-brand-500/5 dark:bg-brand-500/5"
                            )}
                            onClick={() => setSelectedPeriodId(period.id)}
                          >
                            <td className="py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                              {period.name}
                            </td>
                            <td className="py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">
                              {periodIncome > 0 ? formatCurrency(periodIncome) : '-'}
                            </td>
                            <td className="py-2.5 text-xs font-semibold text-slate-550 dark:text-slate-400 font-mono">
                              {periodTotalGoals > 0 ? formatCurrency(periodTotalGoals) : '-'}
                            </td>
                            <td className="py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 font-mono">
                              {periodIncome > 0 && periodTotalGoals > 0 
                                ? `${((periodTotalGoals / periodIncome) * 100).toFixed(0)}%` 
                                : '-'}
                            </td>
                            <td className="py-2.5">
                              <div className="flex items-center gap-1.5">
                                <div className={cn("h-1.5 w-1.5 rounded-full", statusColor)} />
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">{statusText}</span>
                              </div>
                            </td>
                            <td className="py-2.5 text-right">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                type="button"
                                className={cn(
                                  "h-7 px-2.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors",
                                  isCurrentSelection 
                                    ? "text-brand-600 dark:text-brand-400 bg-brand-500/10" 
                                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-250"
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPeriodId(period.id);
                                }}
                              >
                                {isCurrentSelection ? 'Selecionado' : 'Selecionar'}
                              </Button>
                            </td>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Categorias */}
        <TabsContent value="categories" className="space-y-6">
          <Card className="bg-white dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 shadow-sm rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold font-manrope tracking-tight text-slate-800 dark:text-slate-100">Nova Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddCategory} className="flex gap-3 items-end">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="categoryName" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Nome</Label>
                  <Input
                    id="categoryName"
                    placeholder="Ex: Educação"
                    value={categoryForm.name}
                    onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    className="h-9 liquid-glass border-slate-200 dark:border-slate-800 focus-visible:ring-brand-500 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div className="flex items-end">
                  <ColorPicker
                    value={categoryForm.color}
                    onChange={(color) => setCategoryForm({ ...categoryForm, color })}
                  />
                </div>
                <Button type="submit" className="rounded-xl h-9 text-xs font-semibold uppercase tracking-wider bg-brand-500 hover:bg-brand-600 text-white dark:bg-brand-500 dark:hover:bg-brand-600 dark:text-white transition-colors shadow-md shadow-brand-500/10">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Adicionar
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 shadow-sm rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold font-manrope tracking-tight text-slate-800 dark:text-slate-100">Categorias e Subcategorias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.categories.map(category => (
                  <Collapsible
                    key={category.id}
                    open={openCategories.includes(category.id)}
                    onOpenChange={() => toggleCategory(category.id)}
                  >
                    <div className="rounded-xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden bg-white/20 dark:bg-black/10 backdrop-blur-sm transition-all duration-250">
                      <CollapsibleTrigger asChild>
                        <div className="flex cursor-pointer items-center justify-between p-4 hover:bg-slate-100/30 dark:hover:bg-slate-900/30 transition-colors">
                          <div className="flex items-center gap-3">
                            {openCategories.includes(category.id) ? (
                              <ChevronDown className="h-4 w-4 text-slate-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-slate-400" />
                            )}
                            {editingCategoryId === category.id ? (
                              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                <ColorPicker
                                  value={editCategoryForm.color}
                                  onChange={(color) => setEditCategoryForm({ ...editCategoryForm, color })}
                                />
                                <Input
                                  value={editCategoryForm.name}
                                  onChange={e => setEditCategoryForm({ ...editCategoryForm, name: e.target.value })}
                                  className="h-8.5 w-40 liquid-glass text-xs font-semibold rounded-lg focus-visible:ring-brand-500"
                                  onClick={e => e.stopPropagation()}
                                />
                                <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-emerald-500/10 rounded-lg" onClick={(e) => { e.stopPropagation(); handleSaveEditCategory(category.id); }}>
                                  <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-rose-500/10 rounded-lg" onClick={(e) => { e.stopPropagation(); setEditingCategoryId(null); }}>
                                  <X className="h-4 w-4 text-rose-500" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <div
                                  className="h-3.5 w-3.5 rounded-full shadow-sm"
                                  style={{ backgroundColor: category.color }}
                                />
                                <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{category.name}</span>
                                {(() => {
                                  const catExpenses = data.expenses.filter(e => e.categoryId === category.id).length;
                                  return (
                                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                                      ({category.subcategories.length} {category.subcategories.length === 1 ? 'subcategoria' : 'subcategorias'} • {catExpenses} {catExpenses === 1 ? 'lançamento' : 'lançamentos'})
                                    </span>
                                  );
                                })()}
                              </>
                            )}
                          </div>
                          {editingCategoryId !== category.id && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 rounded-lg"
                                onClick={e => { e.stopPropagation(); handleStartEditCategory(category); }}
                              >
                                <Pencil className="h-3.5 w-3.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-rose-500/10 rounded-lg"
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-rose-500 transition-colors" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="liquid-glass border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-xl backdrop-blur-md max-w-sm">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-slate-800 dark:text-slate-100 font-manrope font-bold text-sm">Excluir categoria?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-xs text-slate-400 font-medium">
                                      Isso excluirá todas as subcategorias e despesas relacionadas.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="mt-2">
                                    <AlertDialogCancel className="rounded-xl h-[38px] text-xs font-semibold uppercase tracking-wider border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">Cancelar</AlertDialogCancel>
                                    <AlertDialogAction className="rounded-xl h-[38px] text-xs font-semibold uppercase tracking-wider bg-rose-500 hover:bg-rose-600 text-white dark:bg-rose-500 dark:hover:bg-rose-600 dark:text-white transition-colors shadow-md shadow-rose-500/10 border-0" onClick={() => deleteCategory(category.id)}>
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t border-slate-200/50 dark:border-slate-800/50 p-4 space-y-3 bg-slate-50/50 dark:bg-black/5">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Nova subcategoria..."
                              value={subcategoryForms[category.id] || ''}
                              onChange={e =>
                                setSubcategoryForms(prev => ({
                                  ...prev,
                                  [category.id]: e.target.value,
                                }))
                              }
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddSubcategory(category.id);
                                }
                              }}
                              className="h-8.5 liquid-glass border-slate-200 dark:border-slate-800 focus-visible:ring-brand-500 rounded-lg text-xs font-semibold"
                            />
                            <Button
                              size="icon"
                              onClick={() => handleAddSubcategory(category.id)}
                              className="h-8.5 w-8.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 transition-colors"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          {category.subcategories.length === 0 ? (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold py-1">
                              Nenhuma subcategoria
                            </p>
                          ) : (
                            <div className="grid gap-2 sm:grid-cols-2">
                              {category.subcategories.map(sub => (
                                <div
                                  key={sub.id}
                                  className="flex items-center justify-between rounded-lg border border-slate-150 dark:border-slate-800/80 px-3 py-2 bg-white/40 dark:bg-black/15 transition-all duration-200"
                                >
                                  {editingSubcategoryId === sub.id ? (
                                    <div className="flex items-center gap-2 flex-1">
                                      <Input
                                        value={editSubcategoryName}
                                        onChange={e => setEditSubcategoryName(e.target.value)}
                                        className="h-7.5 text-xs font-semibold rounded-md liquid-glass focus-visible:ring-brand-500"
                                      />
                                      <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-emerald-500/10 rounded-md" onClick={() => handleSaveEditSubcategory(sub.id)}>
                                        <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500" />
                                      </Button>
                                      <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-rose-500/10 rounded-md" onClick={() => setEditingSubcategoryId(null)}>
                                        <X className="h-3.5 w-3.5 text-rose-505" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <>
                                      {(() => {
                                        const subExpenses = data.expenses.filter(e => e.subcategoryId === sub.id).length;
                                        return (
                                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                            {sub.name}
                                            {subExpenses > 0 && (
                                              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 ml-1.5 font-mono bg-slate-100 dark:bg-slate-900/50 px-1.5 py-0.5 rounded">
                                                {subExpenses}
                                              </span>
                                            )}
                                          </span>
                                        );
                                      })()}
                                      <div className="flex gap-0.5">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 rounded-md"
                                          onClick={() => handleStartEditSubcategory(sub)}
                                        >
                                          <Pencil className="h-3 w-3 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors" />
                                        </Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-rose-500/10 rounded-md">
                                              <Trash2 className="h-3 w-3 text-slate-400 hover:text-rose-500 transition-colors" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent className="liquid-glass border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-xl backdrop-blur-md max-w-sm">
                                            <AlertDialogHeader>
                                              <AlertDialogTitle className="text-slate-800 dark:text-slate-100 font-manrope font-bold text-sm">Excluir subcategoria?</AlertDialogTitle>
                                              <AlertDialogDescription className="text-xs text-slate-400 font-medium">
                                                As despesas desta subcategoria também serão excluídas.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter className="mt-2">
                                              <AlertDialogCancel className="rounded-xl h-[38px] text-xs font-semibold uppercase tracking-wider border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">Cancelar</AlertDialogCancel>
                                              <AlertDialogAction
                                                className="rounded-xl h-[38px] text-xs font-semibold uppercase tracking-wider bg-rose-500 hover:bg-rose-600 text-white dark:bg-rose-500 dark:hover:bg-rose-600 dark:text-white transition-colors shadow-md shadow-rose-500/10 border-0"
                                                onClick={() => deleteSubcategory(category.id, sub.id)}
                                              >
                                                Excluir
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Unificado para Criar/Editar Período */}
      <Dialog open={isPeriodModalOpen} onOpenChange={setIsPeriodModalOpen}>
        <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto custom-scrollbar bg-white/95 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-xl backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-slate-800 dark:text-slate-100 font-manrope font-bold text-base">
              {modalForm.id === null ? "Novo Período de Fatura" : "Editar Período"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-550 dark:text-slate-400 font-medium">
              {modalForm.id === null 
                ? "Configure o intervalo de datas do novo período." 
                : "Altere as datas do período selecionado."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSavePeriod} className="space-y-4 pt-2">
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/40 dark:border-slate-800/80 rounded-xl px-3.5 py-2.5 flex items-center justify-between shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Período de Referência</span>
              <span className="text-xs font-extrabold text-brand-600 dark:text-brand-400 font-manrope bg-brand-500/10 dark:bg-brand-500/15 px-2.5 py-1 rounded-lg border border-brand-500/15 dark:border-brand-500/10">
                {MONTHS.find(m => m.value === modalForm.referenceMonth)?.label} de {modalForm.referenceYear}
              </span>
            </div>
            
            <div className="grid gap-3 grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Início</Label>
                <DatePickerInput
                  value={modalForm.startDate}
                  onChange={(value) => setModalForm({ ...modalForm, startDate: value })}
                  placeholder="Data Início"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Fim</Label>
                <DatePickerInput
                  value={modalForm.endDate}
                  onChange={(value) => setModalForm({ ...modalForm, endDate: value })}
                  placeholder="Data Fim"
                />
              </div>
            </div>

            {/* Resumo do Período (só para edição) */}
            {modalForm.id !== null && (() => {
              const periodIncomeData = getIncomeForPeriod(modalForm.id);
              const periodTotalIncome = periodIncomeData ? periodIncomeData.salary + periodIncomeData.extra : 0;
              const periodHasIncome = !!periodIncomeData;
              const periodTotalGoals = data.categories.reduce((acc, cat) => acc + getGoalForCategory(cat.id, modalForm.id!), 0);
              const periodHasGoals = data.categories.some(cat => getGoalForCategory(cat.id, modalForm.id!) > 0);
              const goalsPercentage = periodTotalIncome > 0 ? (periodTotalGoals / periodTotalIncome) * 100 : 0;

              return (
                <div className="space-y-2 pt-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Resumo do Período</p>
                  
                  {/* Receita */}
                  <div className="flex items-center justify-between rounded-xl border border-slate-200/50 dark:border-slate-800/50 bg-white/30 dark:bg-black/10 px-3.5 py-2.5 transition-all duration-200 hover:bg-white/50 dark:hover:bg-black/20">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "flex items-center justify-center h-7 w-7 rounded-lg",
                        periodHasIncome
                          ? "bg-emerald-500/15 dark:bg-emerald-500/20"
                          : "bg-amber-400/15 dark:bg-amber-500/20"
                      )}>
                        <DollarSign className={cn(
                          "h-3.5 w-3.5",
                          periodHasIncome
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-amber-500 dark:text-amber-400"
                        )} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Receita</p>
                        <p className={cn(
                          "text-xs font-extrabold font-manrope",
                          periodHasIncome
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-amber-500"
                        )}>
                          {periodHasIncome ? formatCurrency(periodTotalIncome) : 'Não configurada'}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleNavigateToTab('income', modalForm.id!)}
                      className="h-7 px-2.5 text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 hover:bg-brand-500/10 rounded-lg gap-1"
                    >
                      {periodHasIncome ? 'Editar' : 'Configurar'}
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Metas */}
                  <div className="flex items-center justify-between rounded-xl border border-slate-200/50 dark:border-slate-800/50 bg-white/30 dark:bg-black/10 px-3.5 py-2.5 transition-all duration-200 hover:bg-white/50 dark:hover:bg-black/20">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "flex items-center justify-center h-7 w-7 rounded-lg",
                        periodHasGoals
                          ? "bg-blue-500/15 dark:bg-blue-500/20"
                          : "bg-slate-200/50 dark:bg-slate-800/50"
                      )}>
                        <Target className={cn(
                          "h-3.5 w-3.5",
                          periodHasGoals
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-slate-400 dark:text-slate-500"
                        )} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Metas</p>
                        {periodHasGoals ? (
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-extrabold font-manrope text-blue-600 dark:text-blue-400">
                              {formatCurrency(periodTotalGoals)}
                            </p>
                            {periodTotalIncome > 0 && (
                              <span className={cn(
                                "text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md",
                                goalsPercentage > 100
                                  ? "bg-rose-500/10 text-rose-500"
                                  : goalsPercentage === 100
                                    ? "bg-emerald-500/10 text-emerald-500"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                              )}>
                                {goalsPercentage.toFixed(0)}%
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs font-extrabold font-manrope text-slate-400">
                            Não configuradas
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleNavigateToTab('goals', modalForm.id!)}
                      className="h-7 px-2.5 text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 hover:bg-brand-500/10 rounded-lg gap-1"
                    >
                      {periodHasGoals ? 'Editar' : 'Configurar'}
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })()}

            <DialogFooter className="mt-4 flex sm:flex-row justify-between gap-2 pt-2 border-t border-slate-150 dark:border-slate-800/60">
              {modalForm.id !== null ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="ghost" className="h-9 text-xs font-semibold uppercase tracking-wider text-rose-500 hover:bg-rose-500/10 rounded-xl hover:text-rose-500">
                      <Trash2 className="h-4 w-4 mr-1" />
                      Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-sm bg-white/95 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-xl backdrop-blur-md">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-slate-800 dark:text-slate-100 font-manrope font-bold text-sm">Excluir período?</AlertDialogTitle>
                      <AlertDialogDescription className="text-xs text-slate-550 dark:text-slate-400 font-medium font-inter">
                        Isso removerá a receita associada para este período. As despesas cadastradas serão preservadas.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-2">
                      <AlertDialogCancel className="rounded-xl h-[38px] text-xs font-semibold uppercase tracking-wider border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors bg-white/50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-350">Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        className="rounded-xl h-[38px] text-xs font-semibold uppercase tracking-wider bg-rose-500 hover:bg-rose-600 text-white dark:bg-rose-500 dark:hover:bg-rose-600 dark:text-white transition-colors shadow-md shadow-rose-500/10 border-0" 
                        onClick={() => {
                          if (modalForm.id) {
                            deleteBillingPeriod(modalForm.id);
                            setIsPeriodModalOpen(false);
                          }
                        }}
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsPeriodModalOpen(false)}
                  className="rounded-xl h-9 text-xs font-semibold uppercase tracking-wider border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors bg-white/50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-350"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="rounded-xl h-9 text-xs font-semibold uppercase tracking-wider bg-brand-500 hover:bg-brand-600 text-white dark:bg-brand-500 dark:hover:bg-brand-600 dark:text-white transition-colors shadow-md shadow-brand-500/10"
                >
                  Salvar
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Customizado para Adicionar Ano */}
      <Dialog open={isAddYearOpen} onOpenChange={setIsAddYearOpen}>
        <DialogContent className="max-w-xs bg-white/95 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-xl backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-slate-800 dark:text-slate-100 font-manrope font-bold text-base">
              Adicionar Ano
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-550 dark:text-slate-400 font-medium font-inter">
              Insira o ano que deseja visualizar no planejador.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmAddYear} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Ano</Label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={newYearInput}
                onChange={(e) => setNewYearInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="Ex: 2027"
                className="h-9 liquid-glass border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 rounded-xl"
                required
                autoFocus
              />
            </div>
            <DialogFooter className="flex gap-2 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsAddYearOpen(false);
                  setNewYearInput('');
                }}
                className="flex-1 rounded-xl h-9 text-xs font-semibold uppercase tracking-wider border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors bg-white/50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-350"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="flex-1 rounded-xl h-9 text-xs font-semibold uppercase tracking-wider bg-brand-500 hover:bg-brand-600 text-white dark:bg-brand-500 dark:hover:bg-brand-600 dark:text-white transition-colors shadow-md"
              >
                Adicionar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Customizado para Confirmar Exclusão de Ano */}
      <Dialog open={isDeleteYearOpen} onOpenChange={setIsDeleteYearOpen}>
        <DialogContent className="max-w-sm bg-white/95 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-xl backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-slate-800 dark:text-slate-100 font-manrope font-bold text-base text-rose-500">
              {hasPeriodsInSelectedYear ? "Atenção: Excluir Ano Ativo?" : "Remover Ano?"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-550 dark:text-slate-400 font-medium font-inter leading-relaxed mt-1">
              {hasPeriodsInSelectedYear ? (
                <>
                  O ano de <strong className="text-slate-700 dark:text-slate-200">{selectedYear}</strong> possui períodos de faturamento ativos.
                  <br /><br />
                  Excluí-lo removerá permanentemente <strong className="text-red-500 dark:text-red-400">TODAS</strong> as faturas e receitas vinculadas a {selectedYear}. As despesas individuais serão preservadas.
                  <br /><br />
                  Tem certeza de que deseja prosseguir com a exclusão?
                </>
              ) : (
                <>
                  Deseja mesmo remover o ano de <strong className="text-slate-700 dark:text-slate-200">{selectedYear}</strong> da lista de visualização?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-900">
            <DialogClose asChild>
              <Button 
                variant="outline"
                onClick={() => setIsDeleteYearOpen(false)}
                className="flex-1 rounded-xl h-9 text-xs font-semibold uppercase tracking-wider border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors bg-white/50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-350"
              >
                Cancelar
              </Button>
            </DialogClose>
            <DialogClose asChild>
              <Button 
                onClick={handleConfirmDeleteYear}
                className="flex-1 rounded-xl h-9 text-xs font-semibold uppercase tracking-wider bg-rose-500 hover:bg-rose-600 text-white dark:bg-rose-500 dark:hover:bg-rose-600 dark:text-white transition-colors shadow-md shadow-rose-500/10 border-0"
              >
                Excluir
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
