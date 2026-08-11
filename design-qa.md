# Design QA — modais de Metas, Categorias e Subcategorias

Data: 10 de agosto de 2026  
Escopo: `Configurações > Metas > Salvar`, `Configurações > Categorias > Excluir categoria` e `Configurações > Categorias > Excluir subcategoria`  
Referência visual: modal `Alterar despesa fixa`  
Resultado final: **passed**

## Resumo executivo

Os modais de salvamento de metas, exclusão de categoria e exclusão de subcategoria foram comparados com o modal de despesa fixa usado como referência. A correção removeu o tratamento visual cinza/translúcido que prejudicava contraste, substituiu estilos locais divergentes pelos tokens semânticos compartilhados, empilhou os botões em largura total e adicionou margem lateral segura em viewports estreitos.

As verificações cobriram os cinco eixos de superfície abaixo, nos temas claro e escuro, em desktop e mobile. Não foram encontrados problemas P0, P1 ou P2. As diferenças P3 registradas são intencionais e aceitáveis para os fluxos de confirmação.

## Evidências

### Referências e estado anterior

| Evidência | Dimensão | Arquivo |
| --- | ---: | --- |
| Referência — alterar despesa fixa | 635 × 340 | `C:\Users\kevin\AppData\Local\Temp\codex-clipboard-780f62e0-4464-4fcf-83bf-d3100ace3fce.png` |
| Estado anterior — excluir categoria | 529 × 267 | `C:\Users\kevin\AppData\Local\Temp\codex-clipboard-39664872-860d-4051-b64f-01e3a02e7884.png` |
| Estado anterior — excluir subcategoria | 496 × 238 | `C:\Users\kevin\AppData\Local\Temp\codex-clipboard-472b668f-647b-4c12-94cf-c794e1470145.png` |

![Referência do modal de despesa fixa](C:/Users/kevin/AppData/Local/Temp/codex-clipboard-780f62e0-4464-4fcf-83bf-d3100ace3fce.png)

![Estado anterior do modal de exclusão de categoria](C:/Users/kevin/AppData/Local/Temp/codex-clipboard-39664872-860d-4051-b64f-01e3a02e7884.png)

![Estado anterior do modal de exclusão de subcategoria](C:/Users/kevin/AppData/Local/Temp/codex-clipboard-472b668f-647b-4c12-94cf-c794e1470145.png)

### Implementação após a correção

| Estado validado | Viewport | Arquivo |
| --- | ---: | --- |
| Metas — tema claro | 1280 × 800 | `C:\Users\kevin\AppData\Local\Temp\fin-planner-goals-light-full.png` |
| Metas — tema escuro | 1280 × 800 | `C:\Users\kevin\AppData\Local\Temp\fin-planner-goals-dark-full.png` |
| Categoria — tema claro | 1280 × 800 | `C:\Users\kevin\AppData\Local\Temp\fin-planner-category-light-full.png` |
| Categoria — tema escuro | 1280 × 800 | `C:\Users\kevin\AppData\Local\Temp\fin-planner-category-dark-full.png` |
| Metas — mobile claro | 375 × 812 | `C:\Users\kevin\AppData\Local\Temp\fin-planner-goals-light-375.png` |
| Categoria — mobile claro | 320 × 568 | `C:\Users\kevin\AppData\Local\Temp\fin-planner-category-light-320.png` |
| Subcategoria — tema claro | 1294 × 912 | `C:\Users\kevin\AppData\Local\Temp\fin-planner-subcategory-light-fixed.png` |
| Subcategoria — mobile claro | 320 × 568 | `C:\Users\kevin\AppData\Local\Temp\fin-planner-subcategory-light-fixed-320.png` |

![Metas em tema claro](C:/Users/kevin/AppData/Local/Temp/fin-planner-goals-light-full.png)

![Metas em tema escuro](C:/Users/kevin/AppData/Local/Temp/fin-planner-goals-dark-full.png)

![Categoria em tema claro](C:/Users/kevin/AppData/Local/Temp/fin-planner-category-light-full.png)

![Categoria em tema escuro](C:/Users/kevin/AppData/Local/Temp/fin-planner-category-dark-full.png)

![Metas em viewport 375 × 812](C:/Users/kevin/AppData/Local/Temp/fin-planner-goals-light-375.png)

![Categoria em viewport 320 × 568](C:/Users/kevin/AppData/Local/Temp/fin-planner-category-light-320.png)

![Subcategoria em tema claro](C:/Users/kevin/AppData/Local/Temp/fin-planner-subcategory-light-fixed.png)

![Subcategoria em viewport 320 × 568](C:/Users/kevin/AppData/Local/Temp/fin-planner-subcategory-light-fixed-320.png)

### Comparações combinadas

![Comparação do modal de metas](C:/Users/kevin/AppData/Local/Temp/fin-planner-compare-goals.png)

![Comparação do modal de categoria](C:/Users/kevin/AppData/Local/Temp/fin-planner-compare-category.png)

![Comparação do modal de subcategoria](C:/Users/kevin/AppData/Local/Temp/fin-planner-compare-subcategory.png)

### Dimensões, viewport e densidade das evidências

- Source `Alterar despesa fixa`: imagem de 635 × 340 px; viewport CSS de origem e densidade da captura desconhecidos.
- Source `Excluir categoria` antes da correção: imagem de 529 × 267 px; viewport CSS de origem e densidade da captura desconhecidos.
- Source `Excluir subcategoria` antes da correção: imagem de 496 × 238 px; viewport CSS de origem e densidade da captura desconhecidos.
- Implementações desktop de metas e categoria, nos temas claro e escuro: imagens de 1280 × 800 px, viewport CSS de 1280 × 800 e `deviceScaleFactor=1`.
- Implementação mobile de metas: imagem de 375 × 812 px, viewport CSS de 375 × 812 e `deviceScaleFactor=1`.
- Implementação mobile de categoria: imagem de 320 × 568 px, viewport CSS de 320 × 568 e `deviceScaleFactor=1`.
- Implementação desktop de subcategoria: imagem de 1294 × 912 px, viewport CSS de 1294 × 912 e `deviceScaleFactor=1`; dialog de 448 × 210 px, botões de 398 px e `scrollWidth=clientWidth=446`.
- Implementação mobile de subcategoria: imagem e viewport CSS de 320 × 568 px, `deviceScaleFactor=1`; dialog de 288 × 230 px, gutter lateral de 16 px e botões de 238 px, sem overflow.
- Como a densidade das sources é desconhecida, as comparações foram normalizadas por recorte focado no modal e por geometria observável — largura do conteúdo, padding, alinhamento, hierarquia, quebra de texto e dimensões relativas dos botões — sem presumir equivalência física de pixels entre source e implementação.

## QA das cinco superfícies obrigatórias

### Fonts and typography — passed

- Títulos, descrições e rótulos de botão voltaram à tipografia compartilhada pelos primitives, sem overrides locais que reduzissem tamanho ou peso.
- A hierarquia tipográfica coincide com o padrão do modal de despesa fixa: título em primeiro nível, descrição em muted foreground e ações com peso médio.
- `Excluir subcategoria?` preserva a mesma escala, peso e hierarquia tipográfica dos dois modais previamente aprovados.
- Texto permaneceu legível e com quebra natural em desktop e mobile, nos temas claro e escuro.

### Spacing and layout rhythm — passed

- O ritmo vertical entre título, descrição e footer acompanha o `gap` e o padding dos primitives compartilhados.
- Os rodapés usam botões empilhados, full-width e com gap uniforme, sem colisão ou extrapolação.
- Desktop mantém conteúdo de 448 px e botões de 398 px; mobile mantém gutter de 16 px e dimensões proporcionais verificadas.
- A subcategoria repete o conteúdo desktop de 448 px e botões de 398 px; no mobile, mantém dialog de 288 px, gutter de 16 px e botões de 238 px.

### Colors and visual tokens — passed

- Background, foreground, muted foreground, primary, outline e destructive usam os tokens semânticos do design system.
- O tema claro não apresenta mais a superfície cinza/translúcida nem texto de baixo contraste do estado inicial.
- Tema escuro, aviso âmbar, CTA verde e ação destrutiva vermelha mantêm contraste e intenção visual apropriados.
- No modal de subcategoria em tema claro, o fundo opaco é `rgb(249, 250, 251)`, o texto é `rgb(20, 24, 31)` e a ação usa o token destructive, em paridade com os outros modais aprovados.

### Image quality and asset fidelity — N/A

- Os modais avaliados não contêm imagens, ícones ilustrativos ou outros assets visuais sujeitos a resolução, recorte, compressão ou fidelidade de reprodução.
- As imagens listadas neste relatório são apenas evidências de QA e não fazem parte da interface dos modais.

### Copy and content — passed

- Títulos, descrições, aviso e rótulos das ações permanecem completos e legíveis, sem truncamento.
- A distinção entre `Apenas este mês`, `Este mês e seguintes`, `Cancelar` e `Excluir` comunica corretamente escopo e consequência.
- O modal de categoria mantém o alerta de que subcategorias e despesas relacionadas serão excluídas.
- O título `Excluir subcategoria?` e sua ação destructive comunicam de forma direta o objeto e a consequência da confirmação.

## Validações complementares

### 1. Fidelidade visual e composição — passed

- O conteúdo desktop mede 448 px de largura, igualando a largura máxima do padrão de referência.
- Os botões medem 398 px e permanecem inteiramente dentro do conteúdo.
- Título, descrição, espaçamento interno, borda, sombra e hierarquia dos botões seguem os primitives compartilhados de `Dialog`/`AlertDialog`.
- Os rodapés permanecem verticais em todos os breakpoints, preservando a ordem visual:
  - Metas: `Cancelar` → `Apenas este mês` → `Este mês e seguintes`.
  - Categoria: `Cancelar` → `Excluir`.
  - Subcategoria: `Cancelar` → `Excluir`.
- `scrollWidth` é igual a `clientWidth`; não há overflow horizontal.

### 2. Legibilidade, contraste e temas — passed

- No tema claro, superfície, título e descrição usam os tokens semânticos de background, foreground e muted foreground, eliminando o baixo contraste do estado anterior.
- No tema escuro, os mesmos tokens assumem valores apropriados sem estilos locais conflitantes.
- O CTA de metas mantém o verde primário com texto claro nos dois temas.
- O aviso de alteração futura permanece distinguível em âmbar no claro e no escuro.
- A ação destrutiva de categoria usa vermelho semântico e texto de alto contraste.
- A ação destrutiva de subcategoria usa os mesmos tokens destructive e layout dos dois modais aprovados; no claro, fundo e texto foram medidos como `rgb(249, 250, 251)` e `rgb(20, 24, 31)`.
- O tema foi alternado com os modais de metas e categoria fechados e cada um foi reaberto; ambos adotaram corretamente o tema ativo. A nova iteração de subcategoria foi validada no tema claro.

### 3. Responsividade e contenção — passed

- Em 375 × 812, o modal de metas mantém gutter lateral de 16 px, conteúdo de 343 px e botões de 293 px.
- Em 320 × 568, o modal de categoria mantém gutter lateral de 16 px, conteúdo de 288 px e botões de 238 px.
- Em 320 × 568, o modal de subcategoria mantém gutter lateral de 16 px, dialog de 288 × 230 px e botões de 238 px.
- Textos quebram dentro do conteúdo e os botões permanecem em coluna, sem corte ou escape do pop-up.
- O arredondamento é preservado abaixo do breakpoint `sm`.
- Não houve overflow horizontal nas superfícies desktop ou mobile verificadas.

### 4. Interação, foco e segurança do fluxo — passed

- `Cancelar` fecha os dois modais sem mutação.
- `Esc` fecha os dois modais sem mutação.
- Ao fechar o modal de metas com `Esc`, o foco retorna ao botão `Salvar`.
- Os handlers existentes foram preservados:
  - metas do período continuam direcionadas a `handleSaveAllGoals('period')`;
  - metas futuras continuam direcionadas a `handleSaveAllGoals('all')`;
  - exclusão continua direcionada a `deleteCategory(category.id)`.
- A validação não executou exclusão nem alteração persistente de dados.
- No fluxo de subcategoria, o handler destructive não foi acionado e nenhuma mutação ocorreu.

### 5. Integridade técnica e execução — passed

- O build de produção foi concluído com sucesso.
- O console não apresentou erros durante os fluxos verificados.
- Foram observados três warnings preexistentes e não relacionados à correção, provenientes de React Router/Select.
- As correções ficaram restritas à apresentação dos três modais; a lógica funcional e os dados associados não foram alterados.

## Histórico da correção

### Estado inicial

- O fundo `liquid-glass` produzia uma superfície cinza/translúcida no tema claro.
- Texto secundário e descrição apresentavam contraste insuficiente.
- O rodapé de metas distribuía três botões horizontalmente em largura limitada, causando aperto e extrapolação visual.
- O modal de exclusão também divergia do padrão de despesa fixa em cor, tipografia e tratamento dos botões.
- O modal `Excluir subcategoria?` repetia a divergência visual: superfície translúcida/cinza, baixo contraste e ações sem o mesmo ritmo dos modais aprovados.
- Em viewport estreito, o primitive podia ocupar toda a largura e perder a margem visual esperada de um pop-up.

### Pós-fix

- Os modais usam a superfície semântica compartilhada e acompanham corretamente os temas claro e escuro.
- Título e descrição voltaram à tipografia e às cores padrão do componente de referência.
- Botões ficaram empilhados, em largura total e com hierarquia visual clara.
- A largura desktop foi normalizada em 448 px.
- Mobile passou a manter gutter lateral de 16 px e cantos arredondados.
- A ação de exclusão passou a usar o token destrutivo do design system.

### Nova iteração — `Excluir subcategoria?` before → fix

- Before: source de 496 × 238 px com tratamento visual divergente do padrão aprovado.
- Fix desktop: superfície opaca `rgb(249, 250, 251)`, texto `rgb(20, 24, 31)`, dialog de 448 × 210 px, botões de 398 px e `scrollWidth=clientWidth=446`.
- Fix mobile: viewport de 320 × 568, dialog de 288 × 230 px, gutter de 16 px, botões de 238 px e ausência de overflow.
- A ação `Excluir` usa o token destructive e o conjunto tipográfico/layout é o mesmo dos modais de metas e categoria aprovados.
- A verificação foi não destrutiva: o handler não foi acionado e nenhum dado foi alterado.

## Severidade e diferenças aceitas

| Severidade | Quantidade | Resultado |
| --- | ---: | --- |
| P0 — bloqueador | 0 | Nenhum |
| P1 — alta | 0 | Nenhum |
| P2 — média | 0 | Nenhum |
| P3 — baixa/aceitável | 3 | Aceitas |

Diferenças P3 aceitas:

1. `AlertDialog` não exibe o botão `X` presente no `Dialog` de despesa fixa; o fechamento permanece disponível por `Cancelar` e `Esc`.
2. O modal de metas inclui um botão `Cancelar` adicional, apropriado para a confirmação com três escolhas.
3. A exclusão usa o vermelho destrutivo semântico, em vez do verde do CTA de edição, comunicando corretamente o risco da ação.

## Nova iteração — distribuição dinâmica do dashboard

### Fonte visual e evidências

- Source visual truth: anexos `Browser Comment 1` e `Browser Comment 2`, dashboard claro em viewport de 1294 × 912 CSS px. Os comentários destacam o excesso de espaço vazio em `Despesas por Banco` e a rolagem desnecessária em `Despesas por Categoria`.
- Implementação desktop completa: `C:\Users\kevin\AppData\Local\Temp\fin-planner-dashboard-dynamic-layout.png`, 1294 × 912 px, `deviceScaleFactor=1`.
- Implementação desktop focada: `C:\Users\kevin\AppData\Local\Temp\fin-planner-dashboard-dynamic-final.png`, 1294 × 912 px, `deviceScaleFactor=1`.
- Implementação mobile: `C:\Users\kevin\AppData\Local\Temp\fin-planner-dashboard-dynamic-mobile.png`, viewport de 375 × 812 CSS px, `deviceScaleFactor=1`.
- A densidade dos anexos de source é 1× conforme o viewport informado pelo Browser Comment. A comparação foi normalizada pela mesma largura de 1294 px e pelo mesmo estado do dashboard de agosto de 2026.

### Resultado de layout

- As colunas esquerda e direita medem 1217 px de altura e terminam no mesmo limite vertical (`bottom=1560`).
- Com dois bancos visíveis, `Despesas por Banco` usa apenas sua altura natural de 225 px, incluindo título, duas linhas e a barra de proporções.
- `Despesas por Categoria` absorve o restante e cresce para 968 px.
- A lista de categorias dispõe de 602 px; `clientHeight=scrollHeight=602`, portanto as dez categorias atuais aparecem sem rolagem interna.
- O card de bancos recebeu limite computado de `calc(50% - 12px)`, equivalente a no máximo metade da coluna descontando metade do gap. Quando o conteúdo ultrapassar esse teto, somente a lista de bancos rola; o título e a barra de proporções permanecem visíveis.
- Em 375 × 812, o limite percentual é removido, ambos os cards voltam ao fluxo natural e não há overflow horizontal (`bodyScrollWidth=360`).

### Cinco superfícies obrigatórias

#### Fonts and typography — passed

- Nenhuma tipografia, hierarquia, peso, quebra ou conteúdo textual foi alterado. Títulos e valores preservam os componentes existentes.

#### Spacing and layout rhythm — passed

- O gap de 24 px entre os cards foi preservado.
- O espaço antes vazio migrou para a lista de categorias, mantendo alinhamento com a coluna de fluxo de caixa, metas e reservas.
- O card de bancos cresce por conteúdo até o teto de 50%; o card de categorias recebe todo o espaço restante sem teto próprio.

#### Colors and visual tokens — passed

- Cores, bordas, sombras, estados claro/escuro e a barra segmentada foram preservados sem criação de novos tokens.

#### Image quality and asset fidelity — passed

- Logos de banco e ícones existentes não foram substituídos, recortados ou rasterizados. A mudança é exclusivamente estrutural.

#### Copy and content — passed

- Rótulos, valores, percentuais, categorias, bancos e textos auxiliares permanecem idênticos ao source.

### Interações, responsividade e integridade

- Drill-down de categorias, hover, barra de bancos e demais interações não tiveram handlers alterados.
- O build de produção passou com 3439 módulos.
- O console não apresentou erros; permanecem apenas warnings preexistentes de React Router e do Select controlado/não controlado.
- O cenário visual corrente valida dois bancos. O teto para uma quantidade maior foi verificado pela regra CSS computada e pela contenção rolável da lista; não houve mutação de dados do usuário para fabricar bancos adicionais.

### Histórico before → fix

- Before: os cards da direita dividiam a altura de modo quase fixo; bancos com pouco conteúdo deixavam uma grande área vazia enquanto categorias exigiam rolagem.
- Fix: banco passa a ter altura natural e teto de 50%; categoria passa a ser flexível, sem teto, e ocupa o restante.
- Evidência pós-fix: card de bancos com 225 px, card de categorias com 968 px, dez categorias visíveis e limites inferiores das duas colunas alinhados.
- Achados P0/P1/P2: nenhum.

## Iteração corretiva — `Reservas do Período` como limite vertical

### Fonte visual e evidências

- Source visual truth: `C:\Users\kevin\AppData\Local\Temp\fin-planner-dashboard-dynamic-final.png`, 1294 × 912 px, estado anterior em que `Reservas do Período` era esticado e deixava uma grande área vazia.
- Implementação corrigida: `C:\Users\kevin\AppData\Local\Temp\fin-planner-dashboard-reserves-limit.png`, 1294 × 912 px, viewport CSS de 1294 × 912 e `deviceScaleFactor=1`.
- Comparação completa combinada: `C:\Users\kevin\AppData\Local\Temp\fin-planner-dashboard-reserves-comparison.png`, 2588 × 912 px.
- Comparação focada e alinhada pelo início do card de reservas: `C:\Users\kevin\AppData\Local\Temp\fin-planner-dashboard-reserves-comparison-focused.png`, 2000 × 390 px. O lado esquerdo mostra o estado anterior e o lado direito mostra a correção.
- A comparação usa o mesmo usuário, período, tema, conteúdo e viewport. O recorte focado normaliza somente o deslocamento vertical da página para alinhar as superfícies comparadas.

### Resultado de layout medido

- `Reservas do Período` voltou à altura natural de 327 px e define o limite inferior da grade em `bottom=1425`.
- A última reserva termina em `bottom=1354`; o resumo `Separado / Pendente / Total` começa em `top=1370`. O intervalo é de 16 px, sem área vazia artificial.
- `Despesas por Banco` mantém a altura natural de 225 px e termina exatamente no mesmo limite de reservas (`bottom=1425`).
- `Despesas por Categoria` ocupa os 833 px restantes acima do card de bancos.
- A lista de categorias tem `clientHeight=467` e `scrollHeight=602`, portanto usa rolagem interna quando o conteúdo excede o espaço disponível, conforme solicitado.
- A página não apresenta overflow horizontal: `scrollWidth=clientWidth=1279` no documento, desconsiderando a largura ocupada pela barra de rolagem vertical do viewport de 1294 px.

### Cinco superfícies obrigatórias

#### Fonts and typography — passed

- Nenhuma família, tamanho, peso, line-height, quebra ou hierarquia tipográfica foi alterada.

#### Spacing and layout rhythm — passed

- A coluna esquerda agora é dimensionada pelo conteúdo real; o rodapé de reservas sucede a terceira linha com apenas o espaçamento interno previsto.
- O gap de 24 px entre categoria e banco permanece preservado, e os dois cards da direita respeitam o limite inferior definido por reservas.

#### Colors and visual tokens — passed

- Cores, transparências, bordas e sombras existentes foram preservadas nos temas do produto.

#### Image quality and asset fidelity — passed

- Logos e ícones permanecem nos componentes originais, sem substituição, redimensionamento ou perda de qualidade.

#### Copy and content — passed

- Reservas, bancos, categorias, valores, percentuais e resumos mantêm o mesmo conteúdo do estado de referência.

### Responsividade, interação e integridade

- A contenção absoluta é aplicada somente a partir de `lg`; abaixo desse breakpoint, os widgets permanecem no fluxo natural já validado em 375 × 812 na iteração anterior.
- A retirada de `h-full` de metas e reservas elimina o esticamento sem alterar handlers, dados ou estados interativos.
- O build de produção passou com 3439 módulos e `git diff --check` passou.
- O console não apresentou erros; permanecem warnings preexistentes de React Router e do Select controlado/não controlado.
- O lint direcionado encontrou apenas débitos preexistentes de `any`, `prefer-const` e uma dependência de hook; as linhas funcionais não foram modificadas nesta iteração.

### Histórico before → fix

- Before (P1): a altura intrínseca da lista de categorias dimensionava toda a linha da grade; metas/reservas com `h-full` absorviam o excedente, criando uma grande faixa vazia no card de reservas.
- Fix: a coluna esquerda passou a determinar naturalmente a altura da grade; a coluna direita é contida nesse espaço em desktop, banco preserva altura natural/teto de 50% e categoria absorve o restante com scroll interno.
- Evidência pós-fix: reservas e banco terminam em `bottom=1425`, o resumo aparece 16 px após a última linha e a comparação focada não mostra vazio residual.
- Achados P0/P1/P2 remanescentes: nenhum.

## Iteração corretiva — modal `Definir Meta`

### Fonte visual e evidências

- Source do bug: `C:\Users\kevin\AppData\Local\Temp\codex-clipboard-57f989d7-4b07-483b-80b4-e1c589298051.png`, 547 × 522 px. A densidade e o viewport CSS da source são desconhecidos.
- Implementação light completa: `C:\Users\kevin\AppData\Local\Temp\fin-planner-goal-dialog-light-fixed.png`, 1294 × 912 px, viewport CSS de 1294 × 912 e `deviceScaleFactor=1`.
- Evidência de foco light: `C:\Users\kevin\AppData\Local\Temp\fin-planner-goal-dialog-light-fixed-focus.png`, recorte de 547 × 522 px derivado da captura light no mesmo `deviceScaleFactor=1`.
- Implementação dark completa: `C:\Users\kevin\AppData\Local\Temp\fin-planner-goal-dialog-dark-fixed.png`, 1294 × 912 px, viewport CSS de 1294 × 912 e `deviceScaleFactor=1`.
- Comparação combinada before → fix: `C:\Users\kevin\AppData\Local\Temp\fin-planner-goal-dialog-comparison.png`, 1094 × 522 px. Como a densidade da source é desconhecida, a comparação foi normalizada por recorte focado e geometria do dialog, não por equivalência física absoluta de pixels.

![Bug original do modal Definir Meta](C:/Users/kevin/AppData/Local/Temp/codex-clipboard-57f989d7-4b07-483b-80b4-e1c589298051.png)

![Modal Definir Meta corrigido no tema claro](C:/Users/kevin/AppData/Local/Temp/fin-planner-goal-dialog-light-fixed.png)

![Foco do modal Definir Meta no tema claro](C:/Users/kevin/AppData/Local/Temp/fin-planner-goal-dialog-light-fixed-focus.png)

![Modal Definir Meta corrigido no tema escuro](C:/Users/kevin/AppData/Local/Temp/fin-planner-goal-dialog-dark-fixed.png)

![Comparação before e fix do modal Definir Meta](C:/Users/kevin/AppData/Local/Temp/fin-planner-goal-dialog-comparison.png)

### Resultado visual medido

- O dialog mede 448 × 434 px no viewport desktop de 1294 × 912.
- No tema claro, a superfície opaca mede `rgb(249, 250, 251)`, o foreground `rgb(20, 24, 31)` e a borda `rgb(229, 231, 235)`.
- No tema escuro, a superfície mede `rgb(20, 24, 31)`, o foreground `rgb(249, 250, 251)` e a borda `rgb(48, 53, 65)`.
- `scrollWidth=clientWidth=446`; não há overflow horizontal interno.
- A comparação focada confirma a remoção da superfície cinza/translúcida e do contraste insuficiente presentes na source.

### Cinco superfícies obrigatórias

#### Fonts and typography — passed

- Título, descrição, label `META FINANCEIRA`, valores, opções e botões têm hierarquia nítida e permanecem legíveis nos temas claro e escuro.
- Pesos, tamanhos e alinhamentos seguem o padrão compartilhado dos dialogs já aprovados, sem truncamento ou quebra indevida.

#### Spacing and layout rhythm — passed

- O dialog mantém padding consistente, separação regular entre título, campo financeiro, opções e footer.
- Campo monetário, sinal de igualdade e percentual permanecem alinhados; os cards de escopo têm altura e gaps uniformes.
- `Cancelar` e `Salvar Meta` cabem integralmente no footer, e a largura interna de 446 px não apresenta overflow.

#### Colors and visual tokens — passed

- Background, foreground e border correspondem aos tokens medidos em light e dark.
- O CTA verde, radios e focus ring preservam o token primário; campos, opções e botão secundário mantêm contraste adequado em ambos os temas.
- A seleção azul do valor e o contorno verde de foco são distinguíveis sem comprometer a leitura.

#### Image quality and asset fidelity — N/A

- O modal não contém imagens ou assets rasterizados sujeitos a resolução, recorte ou compressão. As imagens acima são somente evidências de QA.

#### Copy and content — passed

- `Definir Meta - Alimentação`, a descrição do limite, as opções de período, o mês de referência e as ações permanecem completos e semanticamente coerentes.
- O texto diferencia claramente a meta apenas para o período atual da meta padrão para este período e os próximos.

### Foco, temas e integridade

- A captura de foco confirma contorno visível no campo financeiro e seleção de texto legível.
- Os estados light e dark preservam a mesma geometria, hierarquia e conteúdo; somente os tokens temáticos mudam.
- O botão `X`, `Cancelar`, as opções de período e `Salvar Meta` permanecem visualmente disponíveis e contidos.
- A inspeção visual da source, implementações e comparação combinada não encontrou P0, P1 ou P2.

### Histórico before → fix

- Before: superfície acinzentada/translúcida, descrição e textos auxiliares com contraste fraco e separação insuficiente do conteúdo ao fundo.
- Fix: dialog opaco baseado em tokens semânticos, foreground e borda específicos por tema, foco primário visível e layout preservado em 448 × 434 px.
- Evidência pós-fix: light e dark consistentes, `scrollWidth=clientWidth=446` e comparação focada sem corte ou overflow.
- Achados P0/P1/P2 remanescentes nesta iteração: nenhum.

## Conclusão

As cinco superfícies de QA foram aprovadas, as regressões visuais relatadas foram corrigidas e as diferenças remanescentes são P3 aceitáveis. Não há bloqueios para validação do usuário, commit ou deploy.

final result: passed
