# Planejamento de Repaginação Estética: GlassFinance 💎

Este documento registra a estratégia, o progresso e as decisões de design para a transição estética do **FinPlanner** para o **GlassFinance Design System (v1.0)**. O objetivo é unificar a clareza do Swipeely, o dinamismo do Finex e o efeito Liquid Glass do Streamflow, mantendo intacta toda a parte funcional.

---

## 🎨 Pilares do GlassFinance Design System

### 1. Tipografia & Fontes
*   **Títulos e Destaques:** `Plus Jakarta Sans` ou `Manrope` (para dar peso moderno e técnico).
*   **Texto Geral:** `Inter` (foco em máxima legibilidade).
*   **Códigos/Valores Compactos:** `Oswald` ou mono-espaçado para manter alinhamento em tabelas densas.

### 2. Paleta de Cores
*   **Brand (Emerald do Swipeely):** `#10b981` (500) a `#047857` (700). Utilizada para ações primárias, ganhos e elementos de destaque positivo.
*   **Finex Blue (Azul Técnico):** `#3b82f6` (500) a `#2563eb` (600). Utilizada para metas e elementos informativos secundários.
*   **Apoio Escuro (Dark Mode):** `hsl(225, 20%, 10%)` e `hsl(225, 15%, 15%)` para contraste sofisticado.
*   **Despesas (Vermelho Coral):** Manter a distinção forte para saídas (`--expense`), mas suavizado dentro do design system.

### 3. Efeitos de Vidro Líquido (Liquid Glass & Glassmorphism)
*   **`liquid-glass`:** Fundo semi-transparente (`rgba(255, 255, 255, 0.4)` no light, `rgba(10, 10, 15, 0.6)` no dark) com desfoque de fundo denso (`blur(20px)`) e alta saturação (`190%`).
*   **`liquid-glass-bevel`:** Bordas com efeito bisel metálico/vidro usando gradientes lineares transparentes e coloridos em máscaras de sobreposição.
*   **`dashed-guide-line`:** Guias verticais tracejadas de fundo (estilo arquitetônico Swipeely) com opacidade suave de `0.15`.

### 4. Animações e Movimento
*   **Entrada de Widgets:** Transições com delay e efeitos de desfoque (`scroll-blur-in` / `fade-in-up`).
*   **Micro-interações:** Elevação sutil (`translate-y-[-1.5px]`) e sombras suaves em hover nos botões e cards.

---

## 🔄 Proposta de Redesenho de Navegação e Layout Principal

O layout lateral clássico herdado será repensado para maximizar a área horizontal útil dos dashboards de alta densidade e trazer a estética do design system:

*   **Menu Superior Sticky:** Substituir a barra lateral tradicional por um cabeçalho horizontal moderno com visual de vidro flutuante (`liquid-glass`), semelhante ao `design-system.html`.
*   **Navegação Compacta:**
    *   **Desktop:** Links inline limpos e elegantes no menu superior (`Dashboard`, `Despesas`, `Configurações`).
    *   **Mobile:** Um menu inferior flutuante (Bottom Nav Bar) ou um menu lateral compacto estilo gaveta em vidro com backdrop-blur denso.

---

## 📊 Proposta de Melhorias Visuais & Funcionais na Aba Dashboard

Além da estética dos widgets existentes, sugerimos novas formas de visualizar as finanças:

1.  **Visão Diária de Despesas (Burn Rate):**
    *   *Ideia:* No gráfico principal (hoje apenas mensal), adicionar um botão seletor para alternar para "Visão Diária".
    *   *Exibição:* Um gráfico de linha suave (com área gradiente sob ela) que mostra o acúmulo das despesas no dia a dia do mês atual. Isso ajuda o usuário a ver se o ritmo de gastos está muito acelerado.
2.  **Card de Projeção de Gastos (Forecast):**
    *   *Ideia:* Um indicador inteligente que estima quanto o usuário gastará até o final do mês baseado no ritmo atual (média diária × dias restantes do mês).
3.  **Gráficos Estilizados com Recharts:**
    *   Substituição das linhas e barras brutas por curvas suaves com gradientes (`chart-gradient-stop-0` e `100`).
    *   Tooltips 100% customizados em vidro líquido com desfoque de fundo e bordas metálicas.

---

## 🗓️ Cronograma e Progresso (Passo a Passo)

A refatoração estética será dividida em **6 Passos**, priorizando a energia em pequenas partes para garantir alta fidelidade em cada detalhe.

### [x] Passo 1: Fundações & Integração do Design System
*   [x] Cadastrar fontes Google Fonts (`Plus Jakarta Sans`, `Manrope`, `Oswald`, `Inter`) no `index.html`.
*   [x] Estender o `tailwind.config.ts` com as novas cores (`brand`, `finexBlue`, `darkGray`), famílias de fontes e classes utilitárias de transição.
*   [x] Integrar as definições de `glassfinance.css` (efeito vidro, bordas metálicas, guias arquitetônicas, animações e delays) no `src/index.css`.
*   [x] Criar componente global de fundo `DashedGuides` (guias tracejadas verticais de fundo) para renderizar nas páginas.

### [x] Passo 2: Layout Principal e Navegação
*   [x] Redesenhar `src/components/layout/AppLayout.tsx` para usar o cabeçalho superior horizontal `liquid-glass`.
*   [x] Criar novo menu superior com branding refinado ("GlassFinance").
*   [x] Implementar o menu mobile adaptado (Bottom Bar ou Drawer minimalista).

### [x] Passo 3: Aba Dashboard (Concluído 🏆)
*   **Sub-passo 3.1: Filtro e Cards de Resumo**
    *   [x] Redesenhar o `BillingPeriodSelector` com visual de botões de vidro ou dropdown integrado.
    *   [x] Refatorar os `SummaryCards` (Receita, Despesas, Saldo) usando `liquid-glass-bevel`, tipografia dinâmica e ícones com gradiente.
*   **Sub-passo 3.2: Gráfico Principal (Receita vs Despesas)**
    *   [x] Redesenhar o `IncomeExpenseChart` aplicando curvas de interpolação suaves, áreas sombreadas com gradientes e tooltip de vidro líquido.
    *   [x] Adicionar a funcionalidade visual de alternar entre visão "Mensal" (últimos 6 meses) e "Diária" (acumulado do mês selecionado).
*   **Sub-passo 3.3: Donut Chart e Widgets Auxiliares**
    *   [x] Redesenhar o `CategoryDonutChart` preservando o drill-down funcional, mas adicionando efeito de profundidade, anel vidro-líquido centralizado e tags de porcentagem estilizadas.
    *   [x] Refatorar os widgets `FinancialGoalsWidget`, `ReservesWidget` e `BankSummaryWidget` com barras de progresso animadas e estilo Liquid Glass.
*   **Sub-passo 3.4: Tabela de Despesas Rápidas**
    *   [x] Refatorar `DashboardExpenseTable` com cabeçalho limpo, linhas com hover translúcido e badges de categorias em cores semitransparentes.

### [x] Passo 4: Aba Despesas (Expenses) - Concluído 🏆
*   [x] Redesenhar a tabela de hierarquia de despesas (`ExpenseHierarchyTable` / `Expenses.tsx`).
*   [x] Estilizar os formulários de entrada de dados, calendário e modais de importação do CSV do Nubank no padrão vidro líquido.

### [x] Passo 5: Aba Configurações (Settings) - Concluído 🏆
*   [x] Redesenhar o painel de configurações para usar guias horizontais/verticais elegantes em vidro líquido.
*   [x] Refatorar as listas de cadastro de períodos, categorias e receitas para parecerem listas de cards minimalistas.

### [x] Passo 6: Autenticação (Auth) e Erro (NotFound) - Concluído 🏆
*   [x] Redesenhar a tela `Auth.tsx` usando o visual do "Hero Section" do design system, com fundo abstrato de gradiente escuro e formulário central flutuante em vidro líquido duplo com bordas biseladas.
*   [x] Estilizar a página `NotFound.tsx`.

---

## 📈 Status Atual
*   **Fase:** Concluído 🏆
*   **Progresso Geral:** 100% concluído.
*   **Próxima Ação:** Pronto para homologação e testes de usabilidade com o usuário.
