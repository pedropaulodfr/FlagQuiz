---
name: novo-obstaculo
description: Use quando o usuário pedir para criar, adicionar ou alterar um OBSTÁCULO do Flag Arena (ex.: "crie um obstáculo de...", "adicione três cruzes giratórias", "mude a distância entre as cruzes"). Explica o que é um obstáculo neste projeto, quais arquivos e funções precisam mudar, as regras que não podem ser quebradas, como testar e como entregar.
---

# Criar um novo obstáculo no Flag Arena

Leia este arquivo inteiro antes de mexer em qualquer código. Um obstáculo toca em
**cinco lugares** (motor, esquema dos ajustes, HTML, README, testes). Esquecer um
deles deixa o obstáculo "meio funcionando": aparece na lista mas não tem teste, não
aparece na aba de ajustes ou quebra a passagem da arena.

> Regra da casa: sempre que o pedido for criar/adicionar/alterar um obstáculo, leia
> esta skill antes de qualquer alteração e siga o checklist da seção 4.

## 1. O que é um obstáculo aqui

Um **obstáculo** é uma peça parada ou giratória dentro do círculo contra a qual as
bandeiras batem e rebatem. Ele é descrito, sem pixels, no objeto `OBSTACULOS` do
motor (`js/game.js`), como uma **lista de formas**. Cada forma é uma de duas coisas:

| `t` | Forma | Campos |
| --- | --- | --- |
| `circulo` | disco | `r` (raio) |
| `barra` | cápsula (segmento de meia-extensão `meia` e raio `r`) | `meia`, `r` |

Campos comuns a toda forma:

| Campo | Significado |
| --- | --- |
| `x`, `y` | deslocamento do centro da arena, **em fração do lado da arena** (não em px) |
| `ang` | ângulo inicial em radianos (só faz sentido na `barra`) |
| `gira` | `true` gira a barra a `CFG.obstaculoGiro` rad/s; ausente = parada |
| `material` | opcional; acabamento visual: vira a classe `obstaculo--<material>` (ex.: `'madeira'`). Sem ele, fica o visual do `t` |

Materiais de hoje: as **cruzes** (`cruz`, `tres-cruzes`) são `material: 'madeira'`; os
**pinos** (`circulo`) e a **barra** ficam com o acabamento do próprio `t` (metal/haste).

Uma **cruz** é só uma `barra` com `ang: 0` mais outra no mesmo `(x, y)` com
`ang: Math.PI / 2`. Um **pino** é um `circulo`. Vários pinos/barras = vários itens na
lista (ex.: `tres-pinos` são 3 círculos; `tres-cruzes` são 6 barras = 3 cruzes).

Os tipos que existem hoje (`CFG.obstaculo` em `js/game.js`):

| Valor | Rótulo no ajuste | Formas |
| --- | --- | --- |
| `nenhum` (padrão) | Nenhum | nenhuma |
| `pino` | Pino central | 1 círculo no centro |
| `tres-pinos` | Três pinos | 3 círculos em triângulo (raio ~0,17) |
| `hexagono` | Pinos em hexágono | 1 círculo no centro + 6 em volta (raio ~0,21) |
| `barra` | Barra giratória | 1 barra no centro (meia 0,17) |
| `cruz` | Cruz giratória | 2 barras no centro (meia 0,17) |
| `tres-cruzes` | Três cruzes giratórias | 6 barras: 3 cruzes em triângulo (raio ~0,17, meia 0,06) |

Use-as como modelo: posicione com `Math.cos/sin` (como `tres-pinos`/`hexagono`) e
gire com `gira: true` (como `barra`/`cruz`).

## 2. Perguntas ao usuário (só se faltar resposta)

Para o **formato**: é pino (disco), barra, cruz (duas barras) ou outra combinação?
Quantos e onde (centro, triângulo, anel/hexágono, canto)? Gira ou fica parado?

Para **medidas**, se o usuário não disser, escolha você e **explique a escolha**.
Referências que funcionam bem: pino `r 0.075`; barra `meia 0.17, r 0.028`; pinos de
enfeite `r 0.035–0.045`. Mantenha o **extremo** (distância do centro até a ponta mais
distante, `x/y + meia + r`) em torno de **0,22–0,25** para sobrar passagem até o anel
(que fica a ~0,455). Formas afastadas do centro precisam ser mais estreitas para as
vizinhas não se tocarem: a distância entre dois centros em triângulo de raio `R` é
`R·√3`.

Se já existe obstáculo parecido (veja a tabela), diga isso ao usuário e confirme o que
muda em vez de duplicar.

## 3. Como o motor usa o obstáculo (não mexa sem entender)

Tudo em `js/game.js`:

- **`OBSTACULOS`** — o desenho abstrato (fração do lado). É o único lugar onde o
  obstáculo é *definido*.
- **`montarObstaculos()`** — chamado a cada `definirTamanho` (mudança de ajuste e
  redimensionamento). Converte fração → px (`* estado.lado`), cria o `<div>` com a
  classe `obstaculo obstaculo--<t>` (mais `obstaculo--<material>`, se houver `material`),
  guarda o giro já acumulado (`estado.giroObstaculos`) e preenche `estado.obstaculos`.
  Largura = `2·(meia+r)` na barra ou `2·r` no disco.
- **`pintarObstaculos()`** — escreve `transform: translate(x,y) rotate(ang)`.
- **`girarObstaculos(dt)`** — soma `CFG.obstaculoGiro·dt` em `ang` de toda forma com
  `gira: true`. **Todas** as formas giratórias giram juntas e à mesma velocidade.
- **`maisProximo(o, px, py)`** — ponto da forma mais próximo da bandeira; na barra
  devolve também a velocidade do ponto da superfície, para a reflexão ser no
  referencial da barra.
- **`colidirObstaculos()`** — separa a bandeira pela normal e reflete a velocidade
  relativa (elástico, `CFG.restituicaoParede`). **Sem força extra.**
- **`dentroDeObstaculo(x, y, folga)`** — usado no `criarLutador` para **ninguém nascer
  dentro** de um obstáculo. É automático: qualquer forma nova já é respeitada.

O visual sai de variáveis CSS: `.obstaculo` (base), `.obstaculo--circulo` (pino de metal),
`.obstaculo--barra` (haste) e `.obstaculo--madeira` (cruzes) em `styles.css`. As cores
vêm de tokens de tema: `--obstaculo-1`, `--obstaculo-2`, `--obstaculo-borda`,
`--obstaculo-glow-rgb` (genéricos) e `--madeira-1/2/borda`, `--metal-1/2/borda`
(materiais). **Só crie uma classe `obstaculo--<t>` nova se criar um `t` novo**;
reaproveitar `circulo`/`barra` não pede CSS. Um `material` novo só precisa de CSS se
for um acabamento novo; reaproveitar `madeira` não exige nada.

## 4. Checklist (faça nesta ordem)

Todos os caminhos são relativos à raiz do projeto.

### a) `js/config.js` — esquema do ajuste
- No campo `chave: 'obstaculo'` de `CAMPOS`, acrescente
  `{ valor: 'novo-id', texto: 'Rótulo Com Inicial Maiúscula' }` em `opcoes` e, se fizer
  sentido, ajuste o texto de `ajuda`.
- `valor` em kebab-case sem acento (ex.: `tres-cruzes`); `texto` em português do Brasil
  com acento e inicial maiúscula (há teste para isso).
- Valor desconhecido já cai no padrão (`normalizar`); não precisa tratar.

### b) `js/game.js` — o motor
- Acrescente a entrada em `OBSTACULOS` (seção "obstáculos"). Comente em uma linha o que
  a forma é e por que as medidas foram escolhidas (extremo, afastamento).
- Documente o novo valor na lista de `CFG.obstaculo` (perto do topo), se ajudar.
- **Não crie física nova.** Reaproveite `circulo`/`barra`; se a forma precisa girar, use
  `gira: true`. Não adicione forças, atração nem estado paralelo.

### c) `index.html` e `ajustes.html` — a opção na lista
- Em `index.html`, no `<select id="cfg-obstaculo">`, acrescente
  `<option value="novo-id">Rótulo</option>`.
- **Não edite `ajustes.html` à mão.** Rode `node tools/sincronizar-ajustes.js`: ele copia
  a lista de ajustes do `index.html` (entre `<!-- ajustes:inicio` e `<!-- ajustes:fim -->`).
  Há um teste que falha se as duas listas divergirem.

### d) `README.md`
- Atualize a linha de **Obstáculos** (ela lista os tipos). O README é em português do
  Brasil, com acentos.

### e) `tools/testar.js` — testes (obrigatório)
Atualize os testes parametrizados (procure por `---------- obstaculos ----------`):
1. `obstaculos: "nenhum" e o padrao e cada tipo monta a quantidade certa` — inclua o tipo
   no mapa `esperado` com **o número de formas** (círculos + barras). Ex.: uma cruz são
   2; três cruzes são 6.
2. `obstaculos: ninguem nasce dentro de um obstaculo` — acrescente o tipo ao laço.
3. `obstaculos nao impedem a onda de terminar` — acrescente o tipo ao laço (confirme que a
   onda fecha em menos de 600000 ms).
Escreva também um teste **próprio** quando o obstáculo tiver regra que os genéricos não
pegam (ex.: contar quantas cruzes há, conferir afastamento, confirmar que gira). Use as
ferramentas existentes: `arena(colecao)`, `comObstaculo(tipo, colecao)` (já em
`definirTamanho(400)`), `anda(jogo, ms)`, `ateVitoria(jogo)`, e leia `jogo.estado.obstaculos`
cada item tem `t, x, y, r, meia, ang, gira` em **px** do lado atual).

## 5. Regras que não podem ser quebradas

- **Física só de velocidade e colisão.** Nada de força para fora, atração pela abertura
  ou impulso extra. Um obstáculo só rebate; quem empurra é o giro, via reflexão no
  referencial da superfície.
- **Medidas em fração do lado da arena**, nunca em px. Valem em qualquer tamanho de tela.
- **Deixe passagem.** O extremo do obstáculo deve ficar bem dentro do anel (~0,455), em
  torno de 0,22–0,25 do centro. Não feche o caminho entre a arena e a abertura.
- **Ninguém nasce dentro** de um obstáculo — já garantido por `dentroDeObstaculo`; só não
  exagere no tamanho a ponto de a arena virar um bloco.
- **Nada de segundo laço, segunda física ou estado paralelo.** Reaproveite
  `estado.obstaculos`, `giroObstaculos`, `maisProximo`, `colidirObstaculos`.
- **Cor de tema só em variáveis CSS.** Não escreva cor à mão (há teste que falha). Se
  acrescentar um token novo (ex.: uma cor de material), defina-o **no `:root` e em todos
  os blocos `:root[data-tema="..."]`**: um teste exige que todo tema defina exactamente o
  mesmo conjunto de tokens.
- **Textos de valores nos Ajustes começam com maiúscula** (há teste que varre todos).
- Comentários de código seguem o estilo do arquivo (português, em geral **sem** acento);
  textos para o jogador em português do Brasil **com** acentos.
- O obstáculo é limpo em `limparObstaculos`, chamado por `montarObstaculos`. Na próxima
  partida nada fica para trás.

## 6. Como verificar

1. Se mexeu em `index.html`, rode antes `node tools/sincronizar-ajustes.js`.
2. `node tools/testar.js` — tudo verde (devem passar todos).
3. Rode o jogo por HTTP, não por `file://`: `python -m http.server 8000` na raiz e abra
   `http://localhost:8000`. Abra **Ajustes → Arena → Obstáculo**, escolha o novo obstáculo e
   jogue uma rodada inteira: confira que ele aparece, que as bandeiras rebatem sem
   atravessar e que dá para chegar à abertura.
4. Force a recarga (Ctrl+F5): os `.js` ficam em cache.

## 7. Armadilhas conhecidas

- Aumentar o `x/y` afasta as formas do centro; se `meia` não diminuir, vizinhas podem se
  tocar (cruzes/pinos sobrepostos). Em triângulo de raio `R`, os centros ficam a `R·√3`.
- `ang` só muda o desenho inicial da barra; o giro acumulado vem de `estado.giroObstaculos`,
  somado em `montarObstaculos`. Não "reinvente" o ângulo.
- Um teste que avança o relógio por tempo fixo pode pegar a rodada seguinte já terminada;
  para obstáculos isso raramente importa, mas use `ateVitoria` para "a onda fecha".
- No Windows, escrever HTML em modo texto pode virar CRLF. Prefira
  `node tools/sincronizar-ajustes.js` a copiar trechos entre `index.html` e `ajustes.html`.
- Novo token de cor só no `:root` deixa os outros temas sem ele e o teste de temas
  falha. Acrescente o mesmo token aos cinco blocos (Noite/`:root`, claro, estadio,
  por-do-sol, neon), com os valores que fizerem sentido em cada um.
- Cruzes e barra compartilham o tipo `barra` (mesma classe `obstaculo--barra`). Para dar
  acabamentos diferentes sem criar um `t` novo, use `material` (a classe vem depois e
  sobrepõe-se, desde que declarada **depois** de `.obstaculo--barra` no CSS).

## 8. Como entregar a resposta ao usuário

Responda em **português do Brasil**. Explique em linguagem simples: o que o obstáculo é
(uma tabela curta ajuda), onde foi mexido, as medidas escolhidas e **por quê**, o que foi
testado (e o que **não** foi). Se parte do pedido já existia, diga isso com franqueza.
