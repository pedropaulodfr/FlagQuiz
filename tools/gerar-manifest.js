#!/usr/bin/env node
/*
 * Varre a pasta flags/ e gera flags/manifest.js.
 *
 * Uso:
 *   node tools/gerar-manifest.js
 *
 * Regra geral: o nome do arquivo e a resposta CANONICA (minuscula, sem
 * acento). A forma de EXIBICAO vem de outro lugar:
 *
 *   brasil.svg        -> answer "brasil", nome "Brasil"
 *   sao-paulo.svg     -> answer "sao paulo", nome "Sao Paulo" (acento perdido)
 *
 * `answer` e' o que a entrada do jogador e' comparada contra, entao nao pode ter
 * acento nem caixa. `nome` e' o que aparece na tela, e por isso precisa preservar
 * a grafia real. Sem os dois campos, todo time com acento apareceria torto
 * ("Gremio", "Atletico Mineiro").
 *
 * Os nomes e apelidos dos clubes vem de tools/gerar-escudos.js (fonte unica).
 * Para qualquer outra colecao, use DICIONARIO.
 */

const fs = require('fs');
const path = require('path');
const { TIMES } = require('./gerar-escudos');

const ROOT = path.resolve(__dirname, '..');
const FLAGS_DIR = path.join(ROOT, 'flags');
const OUT = path.join(FLAGS_DIR, 'manifest.js');

const EXTENSOES = new Set(['.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif']);

/*
 * Apelidos extras para colecoes que NAO sejam a de clubes.
 *
 * A chave e o nome do arquivo ja sem acento, minusculo e com espacos. Hoje esta
 * vazio porque flags/ so tem os 40 clubes do Brasileiro, e eles saem de TIMES
 * (tools/gerar-escudos.js). Se voce trocar flags/ por outra colecao, e' aqui que
 * entram os apelidos dela.
 */
const DICIONARIO = {};

/*
 * Paises: nome de exibicao (com acento) e apelidos. A chave e' o nome do arquivo sem
 * acento, minusculo e com espacos. Clubes saem de TIMES; qualquer outra colecao
 * entra por aqui ou por DICIONARIO.
 */
const PAISES = {
  'africa do sul': { nome: "África do Sul", aliases: ["south africa"] },
  'alemanha': { nome: "Alemanha" },
  'arabia saudita': { nome: "Arábia Saudita", aliases: ["saudi arabia"] },
  'argelia': { nome: "Argélia", aliases: ["algeria"] },
  'argentina': { nome: "Argentina" },
  'australia': { nome: "Austrália" },
  'austria': { nome: "Áustria" },
  'belgica': { nome: "Bélgica" },
  'bolivia': { nome: "Bolívia" },
  'brasil': { nome: "Brasil", aliases: ["brazil"] },
  'cabo verde': { nome: "Cabo Verde", aliases: ["cape verde"] },
  'canada': { nome: "Canadá" },
  'catar': { nome: "Catar", aliases: ["qatar"] },
  'chile': { nome: "Chile" },
  'china': { nome: "China" },
  'colombia': { nome: "Colômbia" },
  'coreia do sul': { nome: "Coreia do Sul", aliases: ["south korea"] },
  'costa do marfim': { nome: "Costa do Marfim", aliases: ["ivory coast","cote divoire"] },
  'costa rica': { nome: "Costa Rica" },
  'cuba': { nome: "Cuba" },
  'dinamarca': { nome: "Dinamarca", aliases: ["denmark"] },
  'egipto': { nome: "Egipto", aliases: ["egypt"] },
  'emirados arabes unidos': { nome: "Emirados Árabes Unidos", aliases: ["uae","united arab emirates"] },
  'espanha': { nome: "Espanha", aliases: ["spain"] },
  'estados unidos': { nome: "Estados Unidos", aliases: ["eua","usa","united states","united states of america"] },
  'estonia': { nome: "Estônia" },
  'filipinas': { nome: "Filipinas", aliases: ["philippines"] },
  'finlandia': { nome: "Finlândia", aliases: ["finland"] },
  'franca': { nome: "França", aliases: ["france"] },
  'gana': { nome: "Gana", aliases: ["ghana"] },
  'grecia': { nome: "Grécia", aliases: ["greece"] },
  'guine bissau': { nome: "Guiné-Bissau", aliases: ["guinea bissau"] },
  'hungria': { nome: "Hungria", aliases: ["hungary"] },
  'india': { nome: "Índia" },
  'indonesia': { nome: "Indonésia" },
  'irlanda': { nome: "Irlanda", aliases: ["ireland"] },
  'islandia': { nome: "Islândia", aliases: ["iceland"] },
  'israel': { nome: "Israel" },
  'italia': { nome: "Itália", aliases: ["italy"] },
  'jamaica': { nome: "Jamaica" },
  'japao': { nome: "Japão", aliases: ["japan"] },
  'letonia': { nome: "Letônia", aliases: ["latvia"] },
  'lituania': { nome: "Lituânia", aliases: ["lithuania"] },
  'malasia': { nome: "Malásia", aliases: ["malaysia"] },
  'marrocos': { nome: "Marrocos", aliases: ["morocco"] },
  'mexico': { nome: "México" },
  'nigeria': { nome: "Nigéria" },
  'noruega': { nome: "Noruega", aliases: ["norway"] },
  'nova zelandia': { nome: "Nova Zelândia", aliases: ["new zealand"] },
  'paises baixos': { nome: "Países Baixos", aliases: ["holanda","netherlands","holland"] },
  'panama': { nome: "Panamá" },
  'peru': { nome: "Peru" },
  'polonia': { nome: "Polônia", aliases: ["poland"] },
  'portugal': { nome: "Portugal" },
  'reino unido': { nome: "Reino Unido", aliases: ["inglaterra","england","uk","great britain","britain"] },
  'republica tcheca': { nome: "República Tcheca", aliases: ["tcheca","czechia","czech republic"] },
  'romenia': { nome: "Romênia", aliases: ["romania"] },
  'russia': { nome: "Rússia" },
  'sao tome e principe': { nome: "São Tomé e Príncipe", aliases: ["sao tome and principe"] },
  'singapura': { nome: "Singapura", aliases: ["singapore"] },
  'suecia': { nome: "Suécia", aliases: ["sweden","sueca"] },
  'suica': { nome: "Suíça", aliases: ["switzerland"] },
  'tailandia': { nome: "Tailândia", aliases: ["thailand"] },
  'timor leste': { nome: "Timor-Leste", aliases: ["east timor"] },
  'tunisia': { nome: "Tunísia" },
  'turquia': { nome: "Turquia", aliases: ["turkey","turquie"] },
  'ucrania': { nome: "Ucrânia", aliases: ["ukraine"] },
  'uruguai': { nome: "Uruguai" },
  'venezuela': { nome: "Venezuela" },
  'vietna': { nome: "Vietnã", aliases: ["vietnam","viet nam"] }
};

/* fonte unica: nome de exibicao e apelidos dos clubes */
const CLUBES = new Map();
TIMES.forEach((t) => {
  CLUBES.set(normalizar(t.arquivo.replace(/-/g, ' ')), { nome: t.nome, aliases: t.aliases || [] });
});

/*
 * Estas duas funcoes sao a MESMA regra de js/flags.js. Se divergirem, o
 * manifest passa a aceitar respostas que o jogo rejeita (ou vice-versa).
 */
function semAcento(s) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizar(s) {
  return semAcento(s)
    .replace(/[-_]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function chaveDe(nomeArquivo) {
  return normalizar(path.basename(nomeArquivo, path.extname(nomeArquivo)));
}

function gerar() {
  if (!fs.existsSync(FLAGS_DIR)) {
    console.error('Pasta flags/ nao encontrada.');
    process.exit(1);
  }

  const arquivos = fs
    .readdirSync(FLAGS_DIR)
    .filter((f) => EXTENSOES.has(path.extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));

  if (!arquivos.length) {
    console.error('Nenhuma imagem encontrada em flags/.');
    process.exit(1);
  }

  let comApelidos = 0;
  let comNome = 0;
  const desconhecidos = [];

  const entradas = arquivos.map((arquivo) => {
    const chave = chaveDe(arquivo);
    const clube = CLUBES.get(chave) || PAISES[chave];
    const extras = clube ? clube.aliases || [] : DICIONARIO[chave] || [];
    const aliases = [...new Set([chave, ...extras.map(normalizar)])];
    if (aliases.length > 1) comApelidos++;

    /* sem entrada em TIMES/DICIONARIO o jogo ainda funciona: cai no
       `exibir(answer)`, que so' levanta a inicial. */
    if (!clube) desconhecidos.push(chave);

    return {
      id: path.parse(arquivo).name,
      src: `flags/${arquivo}`,
      answer: chave,
      nome: clube ? clube.nome : undefined,
      aliases,
    };
  });

  if (desconhecidos.length) {
    console.log(
      `${desconhecidos.length} imagem(ns) sem nome de exibicao proprio: ${desconhecidos.join(', ')}`
    );
  }

  const corpo = entradas
    .map((e) => {
      const aliases = e.aliases.map((a) => JSON.stringify(a)).join(', ');
      const nome = e.nome ? `, nome: ${JSON.stringify(e.nome)}` : '';
      return (
        `  { id: ${JSON.stringify(e.id)}, src: ${JSON.stringify(e.src)}, ` +
        `answer: ${JSON.stringify(e.answer)}${nome}, aliases: [${aliases}] }`
      );
    })
    .join(',\n');

  const saida =
    `/* Gerado por tools/gerar-manifest.js. Nao edite a mao.\n` +
    ` * Rodar: node tools/gerar-manifest.js\n` +
    ` *\n` +
    ` * Cada entrada:\n` +
    ` *   id       identificador interno\n` +
    ` *   src      caminho da imagem\n` +
    ` *   answer   resposta canonica esperada: minuscula e sem acento, e o que\n` +
    ` *            a entrada do jogador e' comparada contra\n` +
    ` *   nome     forma de exibicao, com a grafia real (acento e' preservado).\n` +
    ` *            Ausente quando a colecao nao tem um nome proprio declarado.\n` +
    ` *   aliases  outras respostas aceitas (comparadas sem acento e minusculas)\n` +
    ` */\n` +
    `window.FLAG_MANIFEST = [\n${corpo}\n];\n`;

  fs.writeFileSync(OUT, saida, 'utf8');

  console.log(`${entradas.length} imagens -> flags/manifest.js`);
  console.log(`${comApelidos} com apelidos extras.`);
  console.log(`${entradas.filter((e) => e.nome).length} com nome de exibicao proprio.`);
}

gerar();
