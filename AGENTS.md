# Flag Arena — guia para agentes de IA

Jogo de observação em HTML, CSS e JavaScript puros (sem build, sem dependências):
bandeiras se movem num círculo com uma abertura que gira; ver o `README.md`.

## Antes de mexer

- Testes: `node tools/testar.js` (devem passar sempre).
- Estrutura: `js/game.js` (motor), `js/app.js` (liga DOM e motor), `js/config.js`
  (esquema dos Ajustes), `js/flags.js` (bandeiras), `styles.css` (visual e temas),
  `index.html` (jogo) e `ajustes.html` (Ajustes em outra aba).
- A lista de ajustes de `ajustes.html` é copiada de `index.html`:
  `node tools/sincronizar-ajustes.js`.

## Tarefas com instruções prontas

| Pedido do usuário | Leia primeiro |
| --- | --- |
| Criar, adicionar ou alterar um **modo de jogo** | `.claude/skills/novo-modo-de-jogo/SKILL.md` |

Siga o passo a passo da skill à risca: ela lista os arquivos e funções a alterar, as
regras que não podem ser quebradas e os testes que devem acompanhar a mudança.
