# Dashboard 2.0 — visão, decisões e roadmap

## Status de execução — 11 de agosto de 2026

Direção visual escolhida: **opção 2**, adaptada com elementos da opção 1. A referência oficial está em `docs/design/dashboard-2.0-selected.png`.

### Entregue nesta iteração

- Rota paralela `/dashboard-2`, com o dashboard atual preservado em `/`.
- CTA discreto no dashboard atual e fallback de erro que retorna à versão clássica.
- Faixa semântica com receita cadastrada, consumo conhecido, reservas do período e saldo livre após o plano conhecido.
- Camada financeira pura em centavos inteiros, independente de React e Supabase.
- Exclusão consistente de lançamentos ignorados e separação de reservas do consumo.
- Análise principal “Para onde está indo o seu dinheiro?” com valor/percentual, fixo/variável, comparação selecionável entre faturas e detalhamento por subcategoria e lançamento.
- Modal amplo de categorias e deep link para a página de Despesas com período/categoria/tipo válidos.
- Evolução de 3, 6 e 12 períodos e visão diária com linguagem “lançado até hoje” e “previsto após hoje”.
- Painel determinístico “O que merece atenção”, com prioridade, evidência e ação rastreável.
- Metas financeiras, reservas do período (planejado/separado/pendente) e gasto por banco/emissor, sem inventar saldo bancário.
- Classificação assistida no CSV por histórico exato, histórico semelhante e taxonomia bancária, sempre com confiança visível e revisão humana.
- Migration local idempotente para reconciliar as colunas consumidas pelo app e ausentes no histórico versionado.
- 31 testes automatizados, build de produção, TypeScript, lint direcionado, desktop/mobile/dark mode e QA visual aprovado.

### Decisões que substituem termos antigos deste documento

- “Receita” significa **receita cadastrada para a fatura**, pois hoje não existe estado de recebimento.
- A aplicação não afirma “pago”, “realizado” ou “saldo bancário”. Usa **lançado até hoje**, **previsto após hoje** e **saldo livre após o plano conhecido**.
- “Reserva” é uma alocação do período que o usuário pode marcar como separada; não é análise de carteira nem investimento conectado.
- O gráfico de categorias mostra consumo por padrão. Reservas ficam em um bloco próprio e fora do denominador.
- Insights funcionam sem LLM. Uma futura IA poderá explicar sinais, mas não calcular números nem alterar lançamentos.

### Pendências deliberadas antes de tornar o 2.0 principal

- Aplicar e validar a migration em um ambiente Supabase autorizado; nenhuma alteração remota foi feita nesta iteração.
- Adicionar estado explícito `planned | confirmed | unknown` aos lançamentos antes de prometer realizado/comprometido com precisão bancária.
- Distinguir `spending_limit` de `allocation_target` nas metas antes de tratar metas de investimento como sucesso acima de 100%.
- Adicionar estado/data de recebimento da renda somente se o produto decidir oferecer fluxo de caixa verdadeiro.
- Integrar um provedor de IA apenas em função server-side autenticada, com segredo fora do Vite/browser, limites e fallback determinístico.
- Usar o 2.0 em ciclos reais, registrar lacunas e só então inverter `/` e remover o dashboard clássico.

### Evidências

- Relatório: `design-qa.md`.
- Desktop final: `docs/design/dashboard-2.0-implementation-final.png`.
- Categorias expandidas: `docs/design/dashboard-2.0-category-dialog.png`.
- Mobile: `docs/design/dashboard-2.0-mobile.png`.

## Objetivo

Criar um Dashboard 2.0 em paralelo ao atual, voltado a decisões financeiras e não apenas à consulta de números. O dashboard atual permanece disponível durante toda a construção. Quando a versão 2.0 estiver validada, ela passa a ser a principal e a antiga é removida.

O princípio central é simples: em poucos segundos, a pessoa deve entender **onde está**, **o que mudou**, **o que merece atenção** e **qual ação faz sentido agora**.

## Diagnóstico do dashboard atual

### O que já funciona bem

- A interface tem identidade visual consistente e boa sensação de produto.
- Receita, despesa e saldo oferecem uma leitura inicial rápida.
- Metas financeiras, reservas do período e despesas por banco têm valor claro e devem permanecer.
- O gráfico de categorias já contém uma navegação por categoria, subcategoria e lançamentos. Essa base pode ser reaproveitada.
- A página de Despesas já é o melhor lugar para consulta e operação sobre lançamentos.

### Principais problemas

1. **Reserva e investimento aparecem como despesa.** No período analisado, R$ 1.850,00 de reservas/investimentos entram no total de R$ 3.418,39 de “despesas”. Isso faz consumo e construção de patrimônio parecerem a mesma coisa.
2. **O fluxo mensal mostra tendência, mas explica pouco.** A pessoa enxerga linhas de receita e despesa, porém não entende rapidamente o que causou a mudança ou quanto foi consumo versus reserva.
3. **A visão diária mistura realizado, compromissos futuros e reservas.** O gráfico contém lançamentos futuros do período e um pico de R$ 1.850,00 como “gasto”, sem deixar claro o que já aconteceu, o que está previsto e o que foi reservado.
4. **Categorias são importantes demais para o espaço atual.** A rosca oferece uma boa visão geral, mas fica apertada, depende de clique pouco descobrível e não permite uma investigação confortável.
5. **“Últimas Despesas” duplica a página de Despesas.** No dashboard, a tabela tem menos contexto e menos ações: não destaca subcategoria, tipo fixo/variável nem os controles completos da página própria.
6. **O dashboard informa, mas ainda orienta pouco.** Falta uma camada explícita de prioridades, comparações, desvios e próximos passos.

## Decisão semântica mais importante

O Dashboard 2.0 deve separar quatro conceitos:

- **Receita:** dinheiro que entrou no período.
- **Consumo:** dinheiro gasto em categorias de vida e operação.
- **Reservado / investido:** dinheiro destinado a caixa, investimento ou outra reserva. Não deve ser chamado de consumo.
- **Saldo livre:** receita menos consumo e valores efetivamente reservados no período.

No recorte analisado:

- Receita: R$ 4.150,79.
- Consumo sem reservas: R$ 1.568,39.
- Reservado / investido: R$ 1.850,00.
- Saldo livre: R$ 732,40.
- Distribuição aproximada da receita: 37,8% consumo, 44,6% reservas/investimentos e 17,6% livre.

Essa separação deve existir na camada de métricas antes da IA. A IA explica números confiáveis; ela não deve decidir sozinha o que cada lançamento significa.

## Arquitetura de informação proposta

### 1. Cabeçalho e período

- Manter o seletor de fatura/período.
- Adicionar comparação com o período anterior.
- Tornar explícito se a leitura é por competência, fatura ou caixa.

### 2. Resumo financeiro

Quatro cards principais:

- Receita.
- Consumo.
- Reservado / investido.
- Saldo livre.

Cada card pode trazer uma comparação curta com o período anterior, desde que a base comparável esteja completa.

### 3. “O que merece atenção”

Uma seção curta, com no máximo três insights priorizados. Exemplos:

- categoria que mais cresceu;
- gasto fora do padrão;
- meta em risco;
- compromisso futuro que reduz o saldo projetado;
- progresso de reserva acima ou abaixo do planejado.

Cada insight deve mostrar evidência, impacto e uma ação possível. A pessoa precisa conseguir abrir o detalhe que originou o insight.

### 4. Evolução financeira

Substituir o gráfico mensal genérico por uma leitura configurável:

- períodos de 3, 6 e 12 meses;
- séries separadas para consumo, reservado/investido e saldo;
- receita como referência;
- comparação com período anterior;
- destaques de maior mudança;
- tooltip com composição e variação, não apenas valores isolados.

A visualização final pode ser barras para composição mensal combinadas com uma linha de saldo, desde que permaneça legível. A decisão deve ser validada com os dados reais.

### 5. Visão diária

Manter a visão diária, mas com significado explícito:

- **Realizado até hoje.**
- **Comprometido / agendado.**
- **Projeção até o fim do período.**
- reservas separadas do consumo diário;
- linha ou marcador de “hoje”;
- possibilidade de exibir apenas consumo, apenas compromissos ou ambos.

### 6. Categorias: resumo + análise expandida

No dashboard:

- manter uma versão compacta da rosca;
- mostrar as principais categorias e agrupar cauda longa como “Outras”, quando necessário;
- incluir um botão real de expandir no canto superior direito, com ícone diagonal apontando para nordeste;
- manter clique em fatia/linha, mas não depender apenas dele.

Na análise expandida:

- abrir modal grande, painel lateral amplo ou tela dedicada;
- usar barras horizontais ordenadas como visual principal;
- alternar valor e percentual;
- filtrar período, fixo/variável e incluir/excluir reservas;
- navegar categoria → subcategoria → lançamentos com breadcrumb;
- comparar com período anterior;
- mostrar variação absoluta e percentual;
- listar os lançamentos que explicam a categoria selecionada;
- oferecer link para abrir a página de Despesas já filtrada;
- preservar e adaptar a hierarquia já existente no produto.

### 7. Metas, reservas e bancos

- Manter as três áreas.
- Metas: destacar risco e ritmo necessário, não apenas percentual consumido.
- Reservas: diferenciar planejado, separado e pendente.
- Bancos: mostrar participação e, quando útil, valores comprometidos por fatura.

### 8. Movimentações recentes

Remover a tabela completa de “Últimas Despesas” do dashboard. Opções aceitáveis:

- remover por completo e criar um link claro para Despesas; ou
- manter apenas cinco movimentações relevantes, com justificativa de relevância, e um CTA “Ver todas”.

O dashboard não deve virar uma segunda página de gerenciamento de despesas.

## IA no produto

### Primeira entrega recomendada

Começar por insights proativos, não por um chat vazio. O sistema calcula métricas determinísticas e a IA transforma esses resultados em uma explicação curta e acionável.

Cada insight deve conter:

- afirmação;
- números que sustentam a afirmação;
- período e base considerados;
- nível de confiança quando houver inferência;
- ação ou aprofundamento possível.

### Evoluções futuras

- perguntas livres sobre os próprios dados;
- resumo mensal narrativo;
- detecção de anomalias;
- previsão de fechamento do período;
- classificação automática de despesas;
- sugestão de categoria e subcategoria com confiança;
- fila de revisão para classificações incertas;
- aprendizado a partir das correções do usuário.

### Guardrails

- A IA não altera lançamentos sem confirmação.
- Toda análise deve ser rastreável até os dados usados.
- Números são calculados pelo sistema; o modelo apenas interpreta e comunica.
- Evitar linguagem de aconselhamento financeiro categórico quando não houver contexto suficiente.

## Acessibilidade e interação

- Transformar áreas clicáveis em botões ou links semânticos.
- Garantir foco visível e navegação por teclado no gráfico de categorias.
- Não depender apenas de hover para revelar informação essencial.
- Evitar textos de 9–10 px nos gráficos.
- Garantir área de toque adequada para voltar, expandir e selecionar categorias.
- Preservar significado sem depender exclusivamente de cor.

## Roadmap sugerido

### Fase 0 — contrato de métricas

- Definir consumo, reserva/investimento, saldo livre, realizado, comprometido e projetado.
- Mapear como lançamentos atuais entram em cada métrica.
- Criar casos de teste com períodos reais.

**Saída:** números coerentes em todo o produto.

### Fase 1 — casca paralela do Dashboard 2.0

- Criar rota/alternância 2.0 sem remover a versão atual.
- Implementar cabeçalho, período e quatro cards semânticos.
- Adicionar estado vazio, carregamento e erro.

**Saída:** primeira leitura financeira correta.

### Fase 2 — análise expandida de categorias

- Botão de expandir na visão compacta.
- Barras ordenadas, filtros, comparação e drill-down.
- Link para Despesas com filtros aplicados.
- Acessibilidade por teclado.

**Saída:** resposta clara para “onde estou gastando e por quê?”.

### Fase 3 — evolução mensal e diária

- Períodos 3/6/12 meses.
- Separação entre consumo, reserva e saldo.
- Diário realizado versus comprometido versus projetado.
- Marcador de hoje e comparações.

**Saída:** resposta clara para “como estou evoluindo e como devo fechar o período?”.

### Fase 4 — insights e IA

- Motor determinístico de sinais.
- Cards de insights priorizados.
- Explicação por IA com evidências.
- Classificação assistida e fila de revisão.
- Chat opcional apenas depois que os insights estiverem confiáveis.

**Saída:** resposta clara para “o que merece minha atenção agora?”.

### Fase 5 — validação e migração

- Usar os dois dashboards em paralelo por ciclos reais.
- Registrar dúvidas, cliques e decisões que cada versão suporta.
- Corrigir lacunas e inconsistências.
- Tornar o 2.0 principal.
- Remover a versão antiga somente após paridade das funções que ainda têm valor.

**Saída:** migração segura sem manter duas experiências indefinidamente.

## Critérios de aceite do Dashboard 2.0

Em até dez segundos, a pessoa consegue responder:

1. Quanto entrou?
2. Quanto foi consumo?
3. Quanto foi reservado ou investido?
4. Quanto está realmente livre?
5. O que mais mudou em relação ao período anterior?
6. Qual categoria explica a maior parte do consumo?
7. O que já aconteceu e o que ainda está comprometido?
8. Qual é a principal ação recomendada agora?

Além disso:

- nenhum valor de reserva é rotulado como consumo sem contexto;
- toda análise por IA apresenta evidência verificável;
- categorias podem ser investigadas por teclado e mouse;
- a lista completa de despesas existe em um único lugar canônico;
- a versão antiga continua disponível até a decisão explícita de migração.

## Fora de escopo neste momento

- Reescrever o design system inteiro.
- Espalhar IA por todas as telas.
- Criar dezenas de filtros no dashboard principal.
- Transformar o dashboard em uma página operacional de edição de despesas.
- Remover o dashboard atual antes da validação da versão 2.0.
