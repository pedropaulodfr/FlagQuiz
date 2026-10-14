---
name: novo-modo-de-jogo
description: Use quando o usuário pedir para criar, adicionar ou alterar um MODO DE JOGO do Flag Arena (ex.: "crie um novo modo em que...", "adicione um modo de..."). Explica o que é um modo neste projeto, quais arquivos e funções precisam mudar, as regras que não podem ser quebradas, como testar e como entregar.
---

# Criar um novo modo de jogo no Flag Arena

Leia este arquivo inteiro antes de mexer em qualquer código. Um modo toca em **seis
lugares** (motor, esquema dos ajustes, HTML, textos do app, README, testes). Esquecer
um deles deixa o modo "meio funcionando": aparece na lista mas não explica, não
tem teste ou não aparece na aba de ajustes.

## 1. O que é um modo aqui

Um **modo** responde a quatro perguntas sobre as rodadas. Anote as respostas do
usuário antes de codar:

| Pergunta | Onde isso vive no motor |
| --- | --- |
| **Quando a rodada termina?** (primeira fuga? sobrar uma bandeira? tempo? outra regra?) | `baterNoAnel` (quando a abertura está aberta), `escapar` (o que a fuga registra) e `coroa` (quem fecha a rodada) |
| **O que significa escapar?** (vencer, ser eliminada, só sair da rodada) | `coroa`: `estado.campeao`, `estado.vencidas.push({... modo})` e o `tipo` passado a `mostrarCoroa` |
| **Quem volta na rodada seguinte?** | `lotsAlvos` (a campeã volta primeiro, exceto na eliminação) e `idsDeVencedoras` (quem está banida com "Vencedoras voltam" desmarcado) |
| **Como a partida acaba e quem é o "resultado final"?** | `terminar` (`tipo`: `campea` ou `derrotada`) e `proximaOnda` |

Os três modos que existem hoje (`CFG.modo` em `js/game.js`):

| Valor | Rótulo no ajuste | Rodada termina quando | Quem escapa |
| --- | --- | --- | --- |
| `vencedora` (padrão) | Quem escapa vence | na primeira fuga | vence a rodada, entra no mural |
| `eliminacao` | Quem escapa é eliminada | na primeira fuga | sai da partida (mural vira "eliminadas") |
| `ultima` | Última na arena vence | sobra uma bandeira na arena | só sai da rodada; a última que sobra vence |

Use-os como modelo: `vencedora` e `eliminacao` fecham a rodada em `estado.resultado`
(a primeira que escapou); `ultima` fecha pela contagem de `vivos()`.

## 2. Perguntas ao usuário (só se faltar resposta)

Se o pedido não responder alguma destas, **pergunte antes de codar** (uma pergunta
objetiva com opções). Não invente em silêncio:

1. Quando termina a rodada e quem fecha o resultado?
2. O que o usuário vê no fim da rodada e no fim da partida (textos, legenda do painel)?
3. O modo precisa de **ajustes próprios** que entram sozinhos ao escolhê-lo (como a
   eliminação, que muda velocidade, abertura, tamanhos)? Quais valores?
4. Quando o parâmetro **Vencedoras voltam às rodadas** está desmarcado, como o modo se
   comporta? (hoje: quem foi marcada não volta; acaba quando sobra < 2 bandeiras sem marca)
5. O modo muda o mural, o aviso entre rodadas ou o som?

Se já existe modo parecido (veja a tabela), diga isso ao usuário e confirme o que muda.

## 3. Checklist (faça nesta ordem)

Todos os caminhos são relativos à raiz do projeto.

### a) `js/config.js` — esquema do ajuste
- Em `CAMPOS`, o campo `chave: 'modo'`: acrescente `{ valor: 'novo-id', texto: 'Rótulo Com Inicial Maiúscula' }`
  em `opcoes` e atualize o texto de `ajuda`.
- `valor` é kebab-case sem acento (ex.: `ultima`). `texto` com acento e inicial maiúscula.
- Se o modo traz ajustes automáticos: acrescente uma entrada em `PRESETS` com **chaves do
  esquema** (`velocidade`, `rotacao`, `abertura`, `arena`, `anel`, `tamanhoBandeira`...).
  Todos os valores precisam caber em `min`/`max` do campo (há teste para isso). O app e a
  aba `ajustes.html` aplicam o preset quando o usuário escolhe o modo.
- Valor desconhecido já cai no padrão (`normalizar`); não precisa tratar.

### b) `index.html` e `ajustes.html` — a opção na lista
- Em `index.html`, no `<select id="cfg-modo">`, acrescente `<option value="novo-id">Rótulo</option>`.
- **Não edite `ajustes.html` à mão.** Rode `node tools/sincronizar-ajustes.js`: ele copia a
  lista de ajustes do `index.html` (entre `<!-- ajustes:inicio` e `<!-- ajustes:fim -->`).
  Há um teste que falha se as duas listas divergirem.

### c) `js/game.js` — o motor
1. **Documente** o modo no comentário de `CFG.modo` (no topo do arquivo, junto de
   `vencedora`/`eliminacao`/`ultima`).
2. Percorra **cada ponto de decisão** e dê ao novo valor o comportamento certo:
   - `baterNoAnel` → regra de quando a abertura deixa passar (`aberta`).
   - `escapar` → o que a fuga registra (`estado.resultado` fecha a rodada nos modos de "primeira fuga").
   - `coroa` → quem é o resultado, `estado.campeao`, o registro em `estado.vencidas` (inclua `modo`), o `tipo` de `mostrarCoroa` e o `modo` emitido em `'vitoria'`.
   - `montarOnda` → caso de uma bandeira só.
   - `lotsAlvos` → se a campeã da rodada anterior volta primeiro.
   - `pintarVencedoras` → título do mural (`vencedoras`/`eliminadas`).
   - `duracaoDaCoroa` → tempo do aviso entre rodadas.
   - `terminar` → `tipo` final (`campea`/`derrotada`) e o painel final.
   - `LEGENDAS` (e `mostrarCoroa`) → texto da legenda do painel central; se criar um `tipo` novo,
     veja se `styles.css` precisa de um `.coroa[data-tipo="..."]`.
3. Não crie um segundo laço, uma segunda física nem estado paralelo. Reaproveite
   `estado.resultado`, `estado.vencidas`, `vivos()`, `proximaOnda`, `terminar`.

### d) `js/app.js` — textos para o jogador
- `iniciarBatalha` → a dica do rodapé ao iniciar (cadeia de `jogo.CFG.modo === ...`).
- handler de `jogo.on('vitoria', ...)` → o cartão "venceu X" / "X eliminada" / o seu texto.
- handler de `jogo.on('fim', ...)` → mensagens de fim (`d.tipo`, `d.motivo`).
- Se o modo tem preset, **não precisa** mudar o app: ele já chama `Config.aplicarPreset` quando o modo muda.

### e) `README.md`
- Atualize a tabela de **Modos de jogo** (e o parágrafo logo acima dela).

### f) `tools/testar.js` — testes (obrigatório)
Escreva testes novos junto dos de modo (procure por `modo "ultima"` e `modo "quem escapa`):
- a rodada termina como o modo promete e o resultado é a bandeira certa;
- o registro em `estado.vencidas` (inclua o `modo`) e o `campeao`;
- com `jogo.CFG.vencedorasVoltam = false`, numa coleção pequena (`arenaPequena(3)`): quem foi
  marcada não volta e o fim traz o `tipo` certo (`campea` ou `derrotada`, evento `'fim'`);
- o esquema aceita o valor (`Config.campo('modo').opcoes` e `normalizar`);
- se há preset, os valores cabem nos limites.
Atualize também o teste "o esquema oferece os tres modos" (ele compara a lista exata de modos).

Ferramentas de teste que já existem: `arena(colecao)`, `arenaPequena(n)`, `fecharOnda(jogo)`
(força uma fuga), `ateVitoria(jogo)`, `ateProximaRodada(jogo)`, `anda(jogo, ms)`,
`enfileirarNaSaida`. **Atenção:** o `CFG` local do arquivo de testes é só um espelho de
algumas chaves; para ler o valor real do motor use `jogo.CFG.<chave>`.

## 4. Regras que não podem ser quebradas

- **Física só de velocidade e colisão.** Nada de força para fora, atração pela
  abertura ou impulso extra. A abertura é só um trecho do anel sem parede. Um modo muda
  *regras de rodada*, não a física.
- **As bandeiras da partida são sorteadas uma vez** (`garantirParticipantes`) e são as mesmas
  até o fim; nenhuma bandeira nova entra em rodada seguinte. Respeite a seleção do usuário
  (`definirSelecao`). Nunca sorteie de `estado.todas` dentro de uma rodada.
- **A arena começa parada.** O jogo só roda depois do Iniciar (`pronto()` → `comecar()`).
  Reiniciar volta ao estado de espera. Não inicie sozinho.
- **O motor não escreve no DOM além de `div`, `img`, `b` e `span`** e só pelos elementos que o app
  passa (`el.*`). Há teste para isso.
- **Cor de tema só em variáveis CSS** (`styles.css`, seção "temas visuais"). Não escreva cor
  de tema à mão; um teste falha se aparecer.
- **Textos de valores nos Ajustes começam com maiúscula** (Ligado, Sim, Sem limite, Noite).
  Há teste que varre todos os valores possíveis.
- **Nomes de bandeiras** vêm de `Bandeiras.nome(flag)` (grafia real) — nunca de `flag.answer`.
- Textos para o jogador em **português do Brasil, com acentos**. Comentários de código
  seguem o estilo do arquivo (português, em geral sem acento).
- Estados e eventos novos precisam ser **limpos em `preparar`/`pronto`/`reiniciar`** para a
  partida seguinte não herdar lixo.

## 5. Como verificar

1. `node tools/testar.js` — tudo verde. Se mexeu em `index.html`, rode antes
   `node tools/sincronizar-ajustes.js`.
2. Rode o jogo por HTTP, não por `file://`: `python -m http.server 8000` na raiz do
   projeto e abra `http://localhost:8000`. Abra **Ajustes → Partida → Modo de jogo**, escolha o
   novo modo e jogue uma rodada inteira; se `vencedorasVoltam` é relevante, desmarque-o
   e jogue até o fim da partida. Confira o painel central, o mural e o aviso final.
   (Em navegador embutido a animação só avança com capturas de tela; os testes em Node
   cobrem a lógica.)
3. Force a recarga (Ctrl+F5): os `.js` ficam em cache.

## 6. Armadilhas conhecidas

- No Windows, ao reescrever arquivos com Python em modo texto, as quebras de linha viram
  CRLF. `index.html` e `ajustes.html` devem ficar com a **mesma** quebra de linha. Prefira
  `node tools/sincronizar-ajustes.js` a copiar trechos.
- Regex com `\b`, `\w` etc. escritas por scripts de substituição às vezes chegam ao arquivo
  sem a barra invertida. Releia o trecho depois de gravar.
- `lutadoresIniciais` ("Bandeiras na arena") só vale ao iniciar uma partida nova; não tente
  usá-lo para mudar o grupo no meio dela.
- Um teste que avança o relógio por tempo fixo pode pegar a rodada seguinte já terminada
  (uma bandeira pode escapar sozinha). Use `ateProximaRodada` para esperar o início da próxima.

## 7. Como entregar a resposta ao usuário

Explique em linguagem simples: o que o modo faz (uma tabela curta ajuda), onde foi
mexido, o que foi testado (e o que **não** foi), e qualquer interpretação que você teve de
escolher. Se parte do pedido já existia, diga isso com franqueza.
