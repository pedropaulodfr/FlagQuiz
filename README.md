# Flag Quiz

Arena de sobrevivência de bandeiras. As bandeiras se movem sozinhas dentro de um
círculo, e o anel tem uma única abertura que não para de girar. Você **apenas
observa**: quando uma bandeira consegue atravessar o anel por essa abertura, ela
voa para fora e some da partida.

Não existe campo de texto: aqui você não digita resposta nenhuma. O jogo é de
observação, e cada onda termina com uma campeã coroada.

Cada onda nova traz de volta a campeã da onda anterior, então uma boa leitura
de padrão vale mais do que sorte. Funciona com bandeiras de países, times de
futebol, ou qualquer outra coleção: basta uma pasta de imagens.

Sem build, sem dependências, sem framework. Só HTML, CSS e JavaScript.

## Como rodar

Recomendo servir a pasta por HTTP, para as imagens em `flags/` carregarem sem
restrição de `file://`:

```bash
npx serve .
# ou
python -m http.server 8000
```

Depois abra `http://localhost:8000`.

Também dá para abrir o `index.html` direto (duplo clique). Nesse caso o jogo
funciona, mas alguns navegadores bloqueiam a leitura das imagens locais — se o
anel aparecer vazio, use um servidor.

## Controles

| Ação | Como |
| --- | --- |
| Começar a batalha | Botão **Iniciar** (no centro da arena) ou tecla **I** |
| Reiniciar a arena | Botão **Reiniciar arena** ou tecla **R** (volta ao estado de espera) |
| Abrir os Ajustes | Botão **Ajustes** ou tecla **A**; Esc fecha |
| Escolher as bandeiras da partida | Botão **Bandeiras** ou tecla **B**; Esc fecha |
| Mutar / desmutar o som | Tecla **M** |

Ao abrir a página a arena aparece **parada**: a batalha só começa no Iniciar.
Depois disso não há nada para clicar: o jogo é só de observação.

## Modos de jogo

Em **Quem escapa vence** e **Quem escapa é eliminada**, a rodada termina na
**primeira bandeira que atravessa a abertura**. Em **Última na arena vence**, a
rodada só termina quando sobra uma bandeira na arena. O modo é escolhido nos Ajustes.

| Modo | O que significa escapar | Fim da partida (com "Vencedoras voltam" desmarcado) |
| --- | --- | --- |
| **Quem escapa vence** (padrão) | A que escapa vence a rodada e entra no mural de vencedoras. | Sobra uma bandeira que nunca escapou: a **derrotada**. |
| **Quem escapa é eliminada** | A que escapa sai da partida (mural de eliminadas). | Sobra uma bandeira que sobreviveu a todas as rodadas: a **campeã**. |
| **Última na arena vence** | A rodada é uma batalha: quem escapa sai só da rodada; a **última que sobrar na arena vence** (entra no mural). | Sobra uma bandeira que nunca venceu: a **derrotada**. Na última rodada restam duas; a que não vence perde o jogo. |

Com "Vencedoras voltam às rodadas" marcado, quem foi marcada pode ser sorteada de
novo e a partida só acaba pelo **Número de rodadas** (0 = sem limite).

## Como o jogo se comporta

- **Física só de velocidade e colisão:** as bandeiras andam em linha reta e só
  mudam de rumo ao bater em outra bandeira, no anel ou num obstáculo (reflexão
  elástica). Não há força para fora nem atração pela abertura.
- **Sempre as mesmas bandeiras:** as bandeiras da partida são sorteadas uma vez, no
  começo (a quantidade é o ajuste "Bandeiras na arena"), e nenhuma bandeira nova
  entra depois. Só um novo Iniciar/Reiniciar sorteia outras.
- **Abertura:** é um trecho do anel sem parede. Escapa quem chega lá pela própria
  trajetória. Depois da primeira fuga da rodada, a abertura vira parede.
- **Obstáculos:** opcionais, escolhidos nos Ajustes (pino, três pinos, hexágono,
  barra, cruz ou três cruzes giratórias). Por padrão, nenhum.
- **A campeã volta:** no modo "quem escapa vence", a vencedora da rodada anterior
  entra na próxima (se "Vencedoras voltam" estiver marcado).
- **Duração estável em qualquer tela:** as velocidades são proporcionais ao lado
  da arena.
- **Fantasmas:** cada fuga deixa uma marca translúcida no contador, até 40.
- **Mural que passeia sozinho:** quando as bandeiras do mural nao cabem na area visivel (celular, mural na vertical), de tempos em tempos (a primeira vez ~10 s depois de abrir, depois a cada ~45 s) o mural desce devagar mostrando todas ate as primeiras vencedoras, faz uma pausa e volta suavemente ao topo, onde ficam as mais recentes. Se alguem rola, toca ou passa o mouse por cima, ele para ate 12 s sem mexer. Ver js/rolagem.js.
- **Mural:** horizontal (8 mais recentes, o resto vira `+N`) ou vertical (coluna
  lateral com todas, sem esconder nenhuma). Reiniciar limpa o mural.

## Celular

Em telas de até 720 px de largura o jogo usa o **layout de celular**: placar
(Escaparam / Restam) numa linha em cima, arena grande ocupando a largura, três botões
largos embaixo e as janelas de Ajustes e Bandeiras em tela cheia. O ajuste **Layout da
tela** (grupo Aparência) permite forçar Celular ou Computador; o padrão é Automático.
### Transmitir uma live vertical (YouTube)

Nos Ajustes, em **Aparência → Layout da tela**, escolha **Celular (vertical 9:16)**.
Mesmo num monitor largo, o jogo passa a aparecer numa **coluna vertical de proporção
9:16, centralizada**, com todas as informações (placar, mural, arena, botões). Quem
assiste pelo celular vê o jogo inteiro e legível. Basta capturar essa coluna (por
exemplo, no OBS, recortando a região ou usando uma janela de navegador em tela
vertical). A janela de Ajustes e a de Bandeiras abrem dentro da moldura; para configurar
sem aparecer na transmissão, use **`ajustes.html`** em outra aba ou monitor (as mudanças
valem na hora no jogo). Combine com os ajustes **Cursor do mouse** e **Botões Reiniciar
e Ajustes** desligados para uma tela limpa.

O layout é uma classe `layout-celular` no `<html>` (ver `Config.usaLayoutCelular`), e as
regras estão na seção "layout de celular" do `styles.css`.

## Escolher as bandeiras que disputam

O botão **Bandeiras** (ou a tecla **B**) abre a lista da coleção, com busca,
**Marcar todas** e **Limpar**. Marque as que devem jogar (por exemplo, só Brasil,
Argentina, Estados Unidos, França, Espanha e México): só elas disputam a partida,
todas de uma vez, sem sorteio. Com nenhuma marcada, o jogo sorteia as bandeiras
como antes (o ajuste "Bandeiras na arena" diz quantas). É preciso marcar pelo menos
2. A escolha fica salva no navegador e vale a partir da próxima partida: antes do
Iniciar ela se refaz na hora; durante a partida, vale depois de Reiniciar.

## Ajustes

O painel (botão ou tecla **A**) tem velocidade, rotação e tamanho da abertura,
número de bandeiras, tamanho do círculo e das bandeiras, formato (retangular,
quadrada, redonda), modo de jogo, obstáculo, posição do mural, rodadas, som
(tipo e volume) e tema visual (Noite, Claro, Estádio, Pôr do sol, Neon) e vários interruptores
de exibição. Os ajustes são organizados em grupos: Partida, Arena, Bandeiras, Som e
efeitos, Placar e indicadores, Aparência e Interface. Tudo fica salvo no navegador.

Para usar numa aba própria, abra **`ajustes.html`** (há um link no painel). As
mudanças feitas lá valem no jogo aberto em outra aba, desde que as duas abas
estejam no **mesmo endereço** (por exemplo, o mesmo `http://localhost:8000`). Abrindo
direto por `file://`, alguns navegadores não compartilham o armazenamento entre
abas; use um servidor. A lista de ajustes de `ajustes.html` é copiada de
`index.html` por `node tools/sincronizar-ajustes.js`.

O tempo usa prazo absoluto (`performance.now()`) em vez de `setInterval`,
então não acumula desvio em partidas longas e a aba ficar em segundo plano
não dá tempo de graça.

## Usar suas próprias bandeiras

### Opção 1 — escolher a pasta no jogo (rápido, sem build)

Clique em **Carregar pasta** e escolha o diretório. Funciona na hora, nada é
gravado no projeto, as imagens não saem da sua máquina.

### Opção 2 — deixar no projeto (para o jogo abrir sempre com elas)

1. Coloque as imagens em `flags/`
2. Rode o gerador:

```bash
node tools/gerar-manifest.js
```

Isso regenera `flags/manifest.js` e o jogo passa a usar aquela coleção.

## O nome do arquivo é a resposta

Essa é a regra principal. O gerador tira a extensão e usa o resto:

| Arquivo | Resposta esperada |
| --- | --- |
| `reino-unido.svg` | `reino unido` |
| `flamengo.png` | `flamengo` |
| `flamengo-2024.webp` | `flamengo 2024` |

O nome também vira o **id** do lutador, então `reino-unido.svg` e
`reino_unido.png` são a mesma bandeira — trocar a extensão não duplica nada.
Para saber o que o jogo está comparando, a ficha da coroa mostra o id.

Internamente o nome fica minúsculo (`reino unido`), porque é contra essa forma
que a comparação é feita. **Na tela ele aparece com a inicial maiúscula**
(`Reino Unido`) — no lutador do anel, na coroa, no mural das vencedoras e nos
avisos. A mudança é só de exibição: o que o jogo compara não muda.

Como a comparação é normalizada, o jogador pode escrever com ou sem acento,
com caixa alta, com traço ou espaço:

- `Suíça`, `suica`, `SUÍÇA` → todas casam com `suica`
- `Reino Unido`, `reino-unido`, `REINO UNIDO` → todas casam com `reino unido`
- `E.U.A.` casa com `eua`

Pontuação que **não** é separador é removida em vez de virar espaço, por isso
siglas com ponto continuam funcionando.

Formatos aceitos: `.svg`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.avif`.

### Dicas para os nomes

- Prefira ASCII e sem acento: `suica.svg`, não `suíça.svg`.
  Se quiser corrigir nomes já existentes, rode `node tools/sanear-nomes.js`.
- O anel nunca mostra a mesma bandeira duas vezes ao mesmo tempo, e nunca
  tem mais lugares do que bandeiras. Com 5 imagens o anel mostra 5.

## Aceitar mais de uma grafia

Para aceitar apelidos (o nome em inglês, por exemplo), edite o dicionário
`DICIONARIO` em `tools/gerar-manifest.js` e rode o gerador de novo:

```js
tailandia: ['thailand'],
suica: ['switzerland'],
```

A chave é o nome do arquivo sem extensão, sem acento e em minúsculas.

Para mudar a resposta de uma bandeira que já está no projeto, renomeie o
arquivo e regere:

```bash
node tools/renomear.js "antiga.svg" "nova-resposta.svg"
node tools/gerar-manifest.js
```

## Estrutura

```
index.html            página do jogo
styles.css            visual, arena, animação de fuga e responsividade
flags/                suas imagens + manifest.js (gerado)
js/flags.js           carregamento, normalização, id, pasta e revogação de URL
js/game.js            estado, laço de tempo, fuga, coroa e ondas
AGENTS.md             guia para agentes de IA (aponta para as skills)
.claude/skills/       instruções prontas para tarefas recorrentes (ex.: novo modo de jogo)
js/app.js             liga o DOM ao motor
js/config.js          esquema e gravação dos Ajustes
js/ajustes-aba.js     Ajustes em aba própria (ajustes.html)
ajustes.html          Ajustes numa aba separada
tools/gerar-manifest.js    gera flags/manifest.js a partir de flags/
tools/verificar-manifest.js  confere o manifest gerado
tools/sanear-nomes.js       normaliza nomes de arquivo para ASCII
tools/renomear.js           renomeia uma bandeira
tools/checar-acentos.js     caça regex de acento escritas com caractere literal
tools/sincronizar-ajustes.js copia a lista de ajustes de index.html para ajustes.html
tools/testar.js             testes sem navegador
```

## Testes

Há 81 testes que rodam no Node, sem navegador. Eles sobem o jogo num DOM
mínimo e controlam o relógio para exercitar a máquina de estados de verdade
(bandeira batendo no anel, fuga, coroa, campeã voltando na onda seguinte, mural
das vencedoras enchendo e sendo limpo), além de conferir a geometria da arena, o
manifest, a forma de exibição dos nomes e o contrato entre os arquivos.

```bash
node tools/testar.js
```

A arena usa `performance.now`, `requestAnimationFrame`, `setTimeout` e
`Math.random`. Os quatro são controlados pelo sandbox, então a simulação roda
igual em qualquer máquina e nenhum teste espera tempo de relógio real.

Se algum teste falhar, ele imprime o motivo. Vale rodar depois de mexer em
`game.js`, `flags.js` ou no gerador.
