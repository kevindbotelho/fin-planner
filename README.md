# Fin Planner 💰

O **Fin Planner** nasceu de um teste técnico e de uma dor real: a necessidade de organizar minhas próprias finanças enquanto explorava o potencial da colaboração Humano-IA. Desenvolvido por mim com o apoio do **Google Antigravity**, este projeto é um laboratório vivo de engenharia de software e produtividade assistida.

Embora tenha sido desenhado para o meu uso pessoal, o código está disponível para quem quiser clonar a ideia, modificar para suas próprias necessidades ou simplesmente subir uma instância pessoal para gerir seus gastos.

> [!TIP]
> O Fin Planner é **100% gratuito** para quem desejar hospedar sua própria versão!

---

## 📸 Showcase

### 📊 Dashboard Inteligente
Tenha uma visão 360º de suas finanças com gráficos interativos de Receita vs Despesas e distribuição por categoria.

![Dashboard](https://link-da-sua-imagem-aqui.png)

### 💸 Gestão de Despesas
Controle detalhado de gastos com suporte a despesas fixas e variáveis.

![Lista de Despesas](https://link-da-sua-imagem-aqui.png)

---

## ✨ Funcionalidades Principais

*   **🛡️ Uso Gratuito:** Sem assinaturas ou taxas. Controle total dos seus dados ao hospedar sua instância.
*   **🏦 Importação Inteligente (Nubank CSV):** Importe suas faturas diretamente do Nubank de forma simples.
    *   **Como funciona:** Basta exportar o arquivo `.csv` do app do Nubank e fazer o upload no Fin Planner.
    *   **🤖 Inteligência Anti-Duplicata:** O sistema processa cada linha do arquivo e verifica se aquela transação já existe no banco de dados, garantindo que você não tenha gastos repetidos ao importar a mesma fatura mais de uma vez.
*   **🔄 Sincronização Híbrida:** Combine gastos que você inseriu manualmente no dia a dia com as transações automáticas importadas via banco. O sistema permite um controle unificado.
*   **📅 Planejamento por Período:** Defina orçamentos e metas por categoria para manter a disciplina financeira.
*   **🎨 Customização Total:** Crie suas próprias categorias e subcategorias.

---

## 🛠️ Stack Tecnológica

*   **Frontend:** [React](https://reactjs.org/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
*   **UI/UX:** [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
*   **Backend & Autenticação:** [Supabase](https://supabase.com/) (PostgreSQL)
*   **AI Partner:** [Google Antigravity](https://github.com/google-deepmind/antigravity)

---

## 🚀 Como Executar Localmente

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/kevindbotelho/fin-planner.git
   cd fin-planner
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   Crie um arquivo `.env` baseado no `.env.example` com suas credenciais do Supabase.

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

---

## 🤝 Créditos

Desenvolvido por [Kevin Botelho](https://github.com/kevindbotelho) 🚀 em parceria com as capacidades agentic do Antigravity.
