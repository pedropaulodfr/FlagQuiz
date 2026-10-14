#!/usr/bin/env node
/*
 * Desenha os brasoes de `flags/` a partir da especificacao em TIMES.
 *
 * Uso:
 *   node tools/gerar-escudos.js
 *
 * Por que um gerador em vez de 40 SVGs escritos a mao:
 *   - todos os brasaes saem do mesmo vocabulario de formas, listras e emblemas,
 *     o que mantem a colecao visualmente coerente;
 *   - mudar um escudo e' editar uma linha da lista TIMES, e nao recalcular
 *     coordenadas;
 *   - e' reproduzivel: rodar de novo geraExactly os mesmos arquivos, entao o
 *     diff do git so aparece quando a arte muda de verdade.
 *
 * DIREITO AUTORAL
 *   Estes NAO sao os escudos oficiais dos clubes. Sao interpretacoes graficas
 *   originais, feitas para este projeto, que seguem a paleta, o padrao de
 *   listras e a sigla de cada time. Reproduzir os escudos oficiais exigiria
 *   autorizacao do clube ou de um fornecedor de imagens.
 *
 * CAMADAS
 *   Cada brasao e' uma lista de camadas desenhadas de baixo para cima dentro de
 *   uma mascara. A DSL e' propositalmente pequena: primitiva desconhecida faz o
 *   gerador reclamar, em vez de gerar uma imagem silenciosamente errada.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FLAGS_DIR = path.join(ROOT, 'flags');

/* ------------------------------------------------------------------ */
/* geometria dos escudos                                               */
/* ------------------------------------------------------------------ */

const FORMAS = {
  escudo: 'M50 4 L94 16 V53 C94 84 73 102 50 108 C27 102 6 84 6 53 V16 Z',
  'escudo-alto': 'M50 3 L90 19 V51 C90 82 71 101 50 108 C29 101 10 82 10 51 V19 Z',
  'escudo-arredondado':
    'M50 5 C69 5 94 11 94 11 V54 C94 82 74 100 50 108 C26 100 6 82 6 54 V11 C6 11 31 5 50 5 Z',
  'escudo-retangular': 'M10 6 H90 V68 C90 88 73 101 50 108 C27 101 10 88 10 68 Z',
  circulo: null,
};

/* caixa generosa: as camadas sao recortadas pela mascara do escudo */
const CAIXA = { x: -40, y: -40, width: 180, height: 192 };

const r2 = (n) => Number(n).toFixed(2);
const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function ret(x, y, w, h, c) {
  return `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" fill="${c}"/>`;
}

function poligono(pontos, c) {
  return `<polygon points="${pontos
    .map(([x, y]) => `${r2(x)},${r2(y)}`)
    .join(' ')}" fill="${c}"/>`;
}

/*
 * Faixa de largura perpendicular `largura`, centrada na diagonal que passa por
 * (50,56) com inclinacao `m`. Desenhada como paralelogramo entre duas retas
 * paralelas, e recortada pela mascara do escudo.
 */
function faixaInclinada(c, largura, m) {
  const X0 = -40;
  const X1 = 140;
  const centro = 56 - m * 50;
  const sep = largura * Math.sqrt(1 + m * m);
  const b1 = centro - sep / 2;
  const b2 = centro + sep / 2;
  return poligono(
    [
      [X0, m * X0 + b1],
      [X1, m * X1 + b1],
      [X1, m * X1 + b2],
      [X0, m * X0 + b2],
    ],
    c
  );
}

function estrela(cx, cy, raio, c) {
  const pontos = [];
  for (let i = 0; i < 10; i++) {
    const ra = i % 2 === 0 ? raio : raio * 0.42;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pontos.push([cx + ra * Math.cos(a), cy + ra * Math.sin(a)]);
  }
  return poligono(pontos, c);
}

function pentagono(cx, cy, raio, c) {
  const pontos = [];
  for (let i = 0; i < 5; i++) {
    const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    pontos.push([cx + raio * Math.cos(a), cy + raio * Math.sin(a)]);
  }
  return poligono(pontos, c);
}

/* Contorno do texto na cor oposta (escura para letra clara e vice-versa): sem
   ele, letra preta sobre listra preta (Atletico-MG, Botafogo) some. */
function halo(cor) {
  let h = String(cor).replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  if (!/^[0-9a-f]{6}$/i.test(h)) return '#ffffff';
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.55 ? '#111111' : '#ffffff';
}

function texto(x, y, conteudo, tamanho, cor, peso = 700, espaco = 0) {
  return (
    `<text x="${r2(x)}" y="${r2(y)}" font-family="Arial, Helvetica, sans-serif" ` +
    `font-size="${r2(tamanho)}" font-weight="${peso}" fill="${cor}" ` +
    `stroke="${halo(cor)}" stroke-width="${r2(Math.max(1.2, tamanho * 0.16))}" paint-order="stroke" stroke-linejoin="round" ` +
    `text-anchor="middle" dominant-baseline="central"` +
    (espaco ? ` letter-spacing="${r2(espaco)}"` : '') +
    `>${esc(conteudo)}</text>`
  );
}

/* ------------------------------------------------------------------ */
/* primitivas da DSL                                                   */
/* ------------------------------------------------------------------ */

const P = {
  fundo: (c) => ret(CAIXA.x, CAIXA.y, CAIXA.width, CAIXA.height, c),

  /* n faixas alternando duas cores, no sentido pedido */
  vAlt: (n, a, b) => {
    const w = 100 / n;
    let s = '';
    for (let i = 0; i < n; i++) {
      s += ret(i * w, CAIXA.y, w, CAIXA.height, i % 2 === 0 ? a : b);
    }
    return s;
  },
  hAlt: (n, a, b) => {
    const h = 112 / n;
    let s = '';
    for (let i = 0; i < n; i++) {
      s += ret(CAIXA.x, i * h, CAIXA.width, h, i % 2 === 0 ? a : b);
    }
    return s;
  },

  /* listras de uma cor sobre o fundo existente */
  vs: (n, c) => {
    const w = 100 / n;
    let s = '';
    for (let i = 1; i < n; i += 2) s += ret(i * w, CAIXA.y, w, CAIXA.height, c);
    return s;
  },
  hs: (n, c) => {
    const h = 112 / n;
    let s = '';
    for (let i = 1; i < n; i += 2) s += ret(CAIXA.x, i * h, CAIXA.width, h, c);
    return s;
  },

  /* cortes em diagonal */
  diagonal: (c) => poligono([[-40, 152], [140, -40], [140, 152]], c),
  diagonal2: (c) => poligono([[-40, -40], [140, 152], [-40, 152]], c),

  /* faixas */
  bandaH: (y, h, c) => ret(CAIXA.x, y, CAIXA.width, h, c),
  bandaV: (x, w, c) => ret(x, CAIXA.y, w, CAIXA.height, c),
  bandaD: (c, l) => faixaInclinada(c, l || 13, 0.62),
  bandaD2: (c, l) => faixaInclinada(c, l || 13, -0.62),
  moldura: (l, c) => faixaInclinada(c, l || 13, 0.62) + faixaInclinada(c, l || 13, -0.62),

  /* emblemas */
  disco: (cx, cy, r, c) => `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}" fill="${c}"/>`,
  anel: (cx, cy, r, w, c) =>
    `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}" fill="none" stroke="${c}" stroke-width="${r2(w)}"/>`,
  estrela: (cx, cy, r, c) => estrela(cx, cy, r, c),
  bola: (cx, cy, r) =>
    `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.6"/>` +
    pentagono(cx, cy, r * 0.42, '#1a1a1a') +
    [0, 1, 2, 3, 4]
      .map((i) => {
        const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        return pentagono(cx + r * 0.78 * Math.cos(a), cy + r * 0.78 * Math.sin(a), r * 0.19, '#1a1a1a');
      })
      .join(''),
  roda: (cx, cy, r, c) =>
    `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}" fill="none" stroke="${c}" stroke-width="3"/>` +
    `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r * 0.28)}" fill="${c}"/>` +
    [0, 1, 2, 3, 4, 5]
      .map((i) => {
        const a = (Math.PI * i) / 3;
        return (
          `<line x1="${r2(cx)}" y1="${r2(cy)}" x2="${r2(cx + r * 0.9 * Math.cos(a))}" ` +
          `y2="${r2(cy + r * 0.9 * Math.sin(a))}" stroke="${c}" stroke-width="2"/>`
        );
      })
      .join(''),
  cruzinha: (cx, cy, s, w, c) =>
    ret(cx - w / 2, cy - s, w, s * 2, c) + ret(cx - s, cy - w / 2, s * 2, w, c),
  /* proa de navio: remindedor do Nautico */
  proa: (cx, cy, larg, alt, c) =>
    poligono(
      [
        [cx, cy - alt / 2],
        [cx + larg / 2, cy + alt / 2],
        [cx - larg / 2, cy + alt / 2],
      ],
      c
    ),

  /* texto */
  txt: (x, y, t, tam, c, peso, esp) => texto(x, y, t, tam, c, peso, esp),
};

/* ------------------------------------------------------------------ */
/* interprets da DSL                                                   */
/* ------------------------------------------------------------------ */

function interpretar(camada) {
  const m = /^([a-zA-Z0-9-]+)\((.*)\)$/.exec(camada);
  if (!m) throw new Error(`camada invalida: ${camada}`);
  const fn = P[m[1]];
  if (!fn) throw new Error(`primitiva desconhecida: ${m[1]} em: ${camada}`);
  const args = m[2].split(',').map((a) => {
    const s = a.trim();
    if (/^".*"$/.test(s)) return s.slice(1, -1);
    if (/^-?\d*\.?\d+$/.test(s)) return parseFloat(s);
    if (!s) throw new Error(`argumento vazio em: ${camada}`);
    return s;
  });
  return fn(...args);
}

/* ------------------------------------------------------------------ */
/* os 40 times: Brasileiro 2026, Series A e B                         */
/* ------------------------------------------------------------------ */

const TIMES = [
  /* ------------------------------- Serie A ------------------------------ */
  {
    arquivo: 'flamengo',
    nome: 'Flamengo',
    aliases: ['fla', 'mengao', 'crf'],
    forma: 'escudo',
    contorno: '#0d0d0d',
    camadas: [
      'fundo(#c52613)',
      'hAlt(6,#c52613,#0d0d0d)',
      'bandaH(29,14,#f2c14e)',
      'txt(50,45,"CRF",15,"#0d0d0d")',
      'txt(50,64,"FLA",9,"#0d0d0d")',
      'txt(50,86,"1929",8,"#f2c14e")',
    ],
  },
  {
    arquivo: 'palmeiras',
    nome: 'Palmeiras',
    aliases: ['palma', 'verdao'],
    forma: 'escudo-arredondado',
    contorno: '#004d2c',
    camadas: [
      'fundo(#006437)',
      'anel(50,56,38,3,"#ffffff")',
      'txt(50,44,"PALMEIRAS",8,"#ffffff",700,0.3)',
      'txt(50,68,"P",24,"#d50032")',
      'txt(50,90,"1914",7,"#ffffff")',
    ],
  },
  {
    arquivo: 'athletico-paranaense',
    nome: 'Athletico Paranaense',
    aliases: ['athletico paranaense', 'athletico pr', 'atletico paranaense', 'cap'],
    forma: 'escudo',
    contorno: '#111111',
    camadas: [
      'fundo(#111111)',
      'vs(6,#d50032)',
      'bandaD("#ffffff",12)',
      'txt(50,45,"CAP",13,"#d50032")',
      'txt(50,66,"ATHLETICO",7,"#111111")',
      'txt(50,76,"PARANAENSE",6.5,"#111111")',
      'txt(50,93,"1924",7,"#d50032")',
    ],
  },
  {
    arquivo: 'fluminense',
    nome: 'Fluminense',
    aliases: ['flu', 'tricolor'],
    forma: 'escudo',
    contorno: '#7a1b3a',
    camadas: [
      'fundo(#7a1b3a)',
      'bandaV(33.34,33.32,"#12805c")',
      'bandaV(66.66,33.34,"#ffffff")',
      'anel(50,52,26,3,"#ffffff")',
      'txt(50,52,"FLU",13,"#7a1b3a")',
      'txt(50,86,"1902",7,"#ffffff")',
    ],
  },
  {
    arquivo: 'bahia',
    nome: 'Bahia',
    aliases: ['bahia', 'esporte club bahia'],
    forma: 'escudo',
    contorno: '#0b4ea2',
    camadas: [
      'fundo(#0b4ea2)',
      'vs(3,#d81f2a)',
      'bandaD("#ffffff",15)',
      'anel(50,48,23,2.5,"#ffffff")',
      'txt(50,46,"BAHIA",11,"#0b4ea2")',
      'txt(50,80,"1931",7,"#0b4ea2")',
    ],
  },
  {
    arquivo: 'cruzeiro',
    nome: 'Cruzeiro',
    aliases: ['cru', 'cruzeiro mg'],
    forma: 'escudo',
    contorno: '#0d2c6b',
    camadas: [
      'fundo(#0d2c6b)',
      'bandaD("#ffffff",16)',
      'anel(50,44,19,3,"#0d2c6b")',
      'txt(50,44,"C",19,"#0d2c6b")',
      'txt(50,78,"CRUZEIRO",7,"#0d2c6b")',
      'txt(50,90,"1921",7,"#0d2c6b")',
    ],
  },
  {
    arquivo: 'atletico-mineiro',
    nome: 'Atlético Mineiro',
    aliases: ['atletico mineiro', 'atletico mg', 'cam', 'galo'],
    forma: 'circulo',
    contorno: '#111111',
    camadas: [
      'fundo(#111111)',
      'vs(8,#ffffff)',
      'anel(50,56,30,4,"#111111")',
      'txt(50,50,"CAM",14,"#111111")',
      'txt(50,69,"1908",7.5,"#111111")',
    ],
  },
  {
    arquivo: 'santos',
    nome: 'Santos',
    aliases: ['santos', 'peixe', 'meninos da vila'],
    forma: 'escudo-retangular',
    contorno: '#0b1a3a',
    camadas: [
      'fundo(#ffffff)',
      'bandaH(56,56,"#0b1a3a")',
      'txt(50,34,"SANTOS",11,"#0b1a3a")',
      'txt(50,76,"FC",9,"#ffffff")',
      'txt(50,92,"1912",7,"#ffffff")',
    ],
  },
  {
    arquivo: 'coritiba',
    nome: 'Coritiba',
    aliases: ['coritiba', 'coritiba cf'],
    forma: 'circulo',
    contorno: '#0e7a3c',
    camadas: [
      'fundo(#ffffff)',
      'vs(6,#0e7a3c)',
      'anel(50,56,41,4,"#0e7a3c")',
      'bola(50,52,15)',
      'txt(50,86,"CFC",9,"#0e7a3c")',
    ],
  },
  {
    arquivo: 'bragantino',
    nome: 'Red Bull Bragantino',
    aliases: ['bragantino', 'rbbr', 'red bull bragantino'],
    forma: 'escudo',
    contorno: '#222222',
    camadas: [
      'fundo(#d2212b)',
      'bandaV(38,24,"#ffffff")',
      'bandaH(72,9,"#222222")',
      'txt(50,42,"RBB",12,"#222222")',
      'txt(50,61,"BRAGANTINO",6,"#222222")',
      'txt(50,90,"1928",7,"#ffffff")',
    ],
  },
  {
    arquivo: 'sao-paulo',
    nome: 'São Paulo',
    aliases: ['sao paulo', 'saopaulo', 'spfc'],
    forma: 'escudo-retangular',
    contorno: '#1a1a1a',
    camadas: [
      'fundo(#ffffff)',
      'hAlt(4,#ffffff,#d2212b)',
      'bandaH(56,7,"#1a1a1a")',
      'txt(50,30,"SAO",11,"#1a1a1a")',
      'txt(50,72,"PAULO",11,"#1a1a1a")',
      'txt(50,90,"1930",7,"#d2212b")',
    ],
  },
  {
    arquivo: 'botafogo',
    nome: 'Botafogo',
    aliases: ['botafogo', 'fogao', 'botafogo rj'],
    forma: 'escudo-arredondado',
    contorno: '#111111',
    camadas: [
      'fundo(#ffffff)',
      'vs(10,#111111)',
      'anel(50,46,25,4,"#ffffff")',
      'txt(50,46,"BOTAFOGO",7.5,"#111111")',
      'estrela(50,74,11,"#111111")',
      'txt(50,94,"1904",6.5,"#111111")',
    ],
  },
  {
    arquivo: 'vitoria',
    nome: 'Vitória',
    aliases: ['vitoria', 'vitoria ba'],
    forma: 'escudo',
    contorno: '#111111',
    camadas: [
      'fundo(#c1272d)',
      'bandaH(38,26,"#111111")',
      'txt(50,51,"VITORIA",8,"#ffffff")',
      'txt(50,78,"BA",9,"#ffffff")',
      'txt(50,93,"1899",7,"#c1272d")',
    ],
  },
  {
    arquivo: 'corinthians',
    nome: 'Corinthians',
    aliases: ['corinthians', 'corinthiano', 'timao', 'sccp'],
    forma: 'escudo',
    contorno: '#1a1a1a',
    camadas: [
      'fundo(#1a1a1a)',
      'bandaH(38,34,"#ffffff")',
      'txt(50,55,"CORINTHIANS",6.5,"#1a1a1a")',
      'txt(50,82,"1910",7,"#ffffff")',
    ],
  },
  {
    arquivo: 'mirassol',
    nome: 'Mirassol',
    aliases: ['mirassol', 'mira', 'mirassol fc'],
    forma: 'escudo',
    contorno: '#8a6d00',
    camadas: [
      'fundo(#ffd200)',
      'bandaV(34,32,"#0e7a3c")',
      'bandaH(74,38,"#0e7a3c")',
      'txt(50,32,"MIRASSOL",8,"#8a6d00")',
      'txt(50,54,"MFC",11,"#ffffff")',
      'txt(50,92,"1925",7,"#ffd200")',
    ],
  },
  {
    arquivo: 'vasco-da-gama',
    nome: 'Vasco da Gama',
    aliases: ['vasco', 'vasco da gama', 'vascodagama', 'crvg'],
    forma: 'escudo',
    contorno: '#111111',
    camadas: [
      'fundo(#ffffff)',
      'moldura(13,"#111111")',
      'txt(50,34,"VASCO",8,"#111111")',
      'txt(50,50,"DA",8,"#111111")',
      'txt(50,66,"GAMA",8,"#111111")',
      'txt(50,88,"1898",7,"#111111")',
    ],
  },
  {
    arquivo: 'gremio',
    nome: 'Grêmio',
    aliases: ['gremio', 'gremio fb'],
    forma: 'escudo',
    contorno: '#0d5eaf',
    camadas: [
      'fundo(#0d5eaf)',
      'bandaH(28,15,"#111111")',
      'bandaH(43,15,"#111111")',
      'bandaH(58,15,"#111111")',
      'anel(50,48,21,3,"#ffffff")',
      'txt(50,48,"GREMIO",8,"#0d5eaf")',
      'txt(50,90,"1903",7,"#ffffff")',
    ],
  },
  {
    arquivo: 'internacional',
    nome: 'Internacional',
    aliases: ['inter', 'colorado', 'inter de porto alegre'],
    forma: 'circulo',
    contorno: '#d8232a',
    camadas: [
      'fundo(#d8232a)',
      'anel(50,56,38,4,"#ffffff")',
      'disco(50,56,25,"#ffffff")',
      'txt(50,50,"INTER",9,"#d8232a")',
      'txt(50,68,"1909",7.5,"#d8232a")',
    ],
  },
  {
    arquivo: 'remo',
    nome: 'Remo',
    aliases: ['remo', 'remo club'],
    forma: 'escudo',
    contorno: '#0b3b8c',
    camadas: [
      'fundo(#0b3b8c)',
      'bandaV(37,26,"#ffffff")',
      'estrela(50,34,10,"#0b3b8c")',
      'txt(50,62,"REMO",12,"#0b3b8c")',
      'txt(50,84,"1904",7,"#0b3b8c")',
    ],
  },
  {
    arquivo: 'chapecoense',
    nome: 'Chapecoense',
    aliases: ['chapecoense', 'chape'],
    forma: 'escudo-alto',
    contorno: '#0b6b3a',
    camadas: [
      'fundo(#0e7a3c)',
      'bandaH(56,52,"#1b3f8b")',
      'bandaD("#ffffff",10)',
      'txt(50,34,"CHAPECOENSE",6,"#ffffff")',
      'txt(50,84,"2009",7.5,"#ffffff")',
    ],
  },

  /* ------------------------------- Serie B ------------------------------ */
  {
    arquivo: 'vila-nova',
    nome: 'Vila Nova',
    aliases: ['vila nova', 'vilanovense'],
    forma: 'escudo',
    contorno: '#b0201f',
    camadas: [
      'fundo(#d8232a)',
      'vs(4,#ffffff)',
      'anel(50,52,27,3,"#ffffff")',
      'txt(50,46,"VILA",12,"#b0201f")',
      'txt(50,64,"NOVA",12,"#b0201f")',
      'txt(50,90,"1943",7,"#b0201f")',
    ],
  },
  {
    arquivo: 'novorizontino',
    nome: 'Novorizontino',
    aliases: ['novorizontino', 'novo'],
    forma: 'escudo-arredondado',
    contorno: '#b0201f',
    camadas: [
      'fundo(#ffffff)',
      'hAlt(6,#ffffff,#d8232a)',
      'anel(50,56,39,3,"#d8232a")',
      'txt(50,50,"NOVO",11,"#b0201f")',
      'txt(50,64,"HORIZONTINO",6,"#b0201f")',
      'txt(50,88,"1984",7,"#b0201f")',
    ],
  },
  {
    arquivo: 'fortaleza',
    nome: 'Fortaleza',
    aliases: ['fortaleza', 'fortaleza ec'],
    forma: 'escudo',
    contorno: '#111111',
    camadas: [
      'fundo(#1b3f8b)',
      'diagonal(#d8232a)',
      'diagonal2("#111111")',
      'anel(50,54,26,3,"#ffffff")',
      'txt(50,46,"FOR",11,"#ffffff")',
      'txt(50,62,"TALEZA",6.5,"#ffffff")',
      'txt(50,88,"1918",7,"#ffffff")',
    ],
  },
  {
    arquivo: 'juventude',
    nome: 'Juventude',
    aliases: ['juventude', 'levantamento'],
    forma: 'escudo-arredondado',
    contorno: '#0b6b3a',
    camadas: [
      'fundo(#ffffff)',
      'anel(50,56,40,4,"#0e7a3c")',
      'txt(50,52,"JUV",19,"#0e7a3c")',
      'txt(50,82,"1913",7,"#0e7a3c")',
    ],
  },
  {
    arquivo: 'operario-pr',
    nome: 'Operário-PR',
    aliases: ['operario', 'operario pr', 'operario-pr'],
    forma: 'escudo',
    contorno: '#111111',
    camadas: [
      'fundo(#ffffff)',
      'vs(4,#111111)',
      'anel(50,46,26,3,"#111111")',
      'txt(50,46,"OPERARIO",7,"#111111")',
      'roda(50,80,12,"#111111")',
    ],
  },
  {
    arquivo: 'criciuma',
    nome: 'Criciúma',
    aliases: ['criciuma', 'cricio'],
    forma: 'escudo',
    contorno: '#111111',
    camadas: [
      'fundo(#ffd200)',
      'diagonal("#111111")',
      'anel(50,50,24,3,"#ffd200")',
      'txt(50,50,"CRICIUMA",7,"#ffd200")',
      'txt(50,82,"1913",7,"#111111")',
    ],
  },
  {
    arquivo: 'atletico-goianiense',
    nome: 'Atlético Goianiense',
    aliases: ['atletico goianiense', 'atletico go', 'dragao'],
    forma: 'escudo',
    contorno: '#111111',
    camadas: [
      'fundo(#c1272d)',
      'vs(5,#111111)',
      'anel(50,52,28,3,"#ffffff")',
      'txt(50,46,"ATLETICO",6.5,"#ffffff")',
      'txt(50,62,"GOIANIENSE",6.5,"#ffffff")',
      'txt(50,88,"1937",7,"#ffffff")',
    ],
  },
  {
    arquivo: 'crb',
    nome: 'CRB',
    aliases: ['crb', 'centro sportivo alagoano'],
    forma: 'escudo',
    contorno: '#b0201f',
    camadas: [
      'fundo(#ffffff)',
      'hAlt(4,#ffffff,#d8232a)',
      'anel(50,56,29,3,"#d8232a")',
      'txt(50,54,"CRB",15,"#b0201f")',
      'txt(50,86,"1914",7,"#b0201f")',
    ],
  },
  {
    arquivo: 'sport',
    nome: 'Sport Recife',
    aliases: ['sport', 'sport club', 'sport club do recife'],
    forma: 'escudo',
    contorno: '#111111',
    camadas: [
      'fundo(#ffffff)',
      'diagonal("#c1272d")',
      'diagonal2("#111111")',
      'txt(50,42,"SPORT",8,"#ffffff")',
      'txt(50,58,"CLUB",6.5,"#ffffff")',
      'txt(50,86,"1905",7,"#ffffff")',
    ],
  },
  {
    arquivo: 'cuiaba',
    nome: 'Cuiabá',
    aliases: ['cuiaba', 'cuiaba mt'],
    forma: 'escudo',
    contorno: '#0b6b3a',
    camadas: [
      'fundo(#0e7a3c)',
      'bandaH(46,66,"#ffd200")',
      'txt(50,34,"CUIABA",9,"#ffffff")',
      'txt(50,70,"EC",13,"#0e7a3c")',
      'txt(50,92,"2001",7,"#0e7a3c")',
    ],
  },
  {
    arquivo: 'goias',
    nome: 'Goiás',
    aliases: ['goias', 'esmeraldino'],
    forma: 'escudo',
    contorno: '#0b6b3a',
    camadas: [
      'fundo(#0e7a3c)',
      'bandaH(58,50,"#ffffff")',
      'txt(50,38,"GOIAS",12,"#ffffff")',
      'txt(50,82,"1944",7.5,"#0e7a3c")',
    ],
  },
  {
    arquivo: 'sao-bernardo',
    nome: 'São Bernardo',
    aliases: ['sao bernardo', 'serrano'],
    forma: 'escudo-alto',
    contorno: '#8a6d00',
    camadas: [
      'fundo(#ffd200)',
      'bandaH(56,52,"#0b3b8c")',
      'txt(50,32,"SAO BERNARDO",5.8,"#0b3b8c")',
      'txt(50,78,"SBC",12,"#ffffff")',
      'txt(50,96,"1928",6.5,"#ffd200")',
    ],
  },
  {
    arquivo: 'athletic',
    nome: 'Athletic',
    aliases: ['athletic', 'athletic club', 'athletic mg'],
    forma: 'escudo',
    contorno: '#111111',
    camadas: [
      'fundo(#ffffff)',
      'hAlt(4,#ffffff,#c1272d)',
      'anel(50,50,25,3,"#c1272d")',
      'txt(50,50,"ATHLETIC",7,"#c1272d")',
      'txt(50,84,"1904",7,"#c1272d")',
    ],
  },
  {
    arquivo: 'nautico',
    nome: 'Náutico',
    aliases: ['nautico', 'nautico pernambucano'],
    forma: 'escudo',
    contorno: '#b0201f',
    camadas: [
      'fundo(#c1272d)',
      'bandaV(35,30,"#ffffff")',
      'proa(50,52,26,18,"#b0201f")',
      'txt(50,76,"1901",7.5,"#b0201f")',
      'txt(50,90,"NAUTICO",7,"#ffffff")',
    ],
  },
  {
    arquivo: 'ceara',
    nome: 'Ceará',
    aliases: ['ceara', 'ceara sc'],
    forma: 'escudo',
    contorno: '#111111',
    camadas: [
      'fundo(#111111)',
      'bandaD("#ffffff",16)',
      'txt(50,44,"CEARA",10,"#111111")',
      'txt(50,76,"1914",7,"#ffffff")',
    ],
  },
  {
    arquivo: 'botafogo-sp',
    nome: 'Botafogo-SP',
    aliases: ['botafogo sp', 'botafogosp', 'boto'],
    forma: 'escudo',
    contorno: '#111111',
    camadas: [
      'fundo(#ffffff)',
      'hAlt(4,#ffffff,#d8232a)',
      'anel(50,52,25,3,"#111111")',
      'estrela(50,52,13,"#111111")',
      'txt(50,88,"1933",7,"#111111")',
    ],
  },
  {
    arquivo: 'avai',
    nome: 'Avaí',
    aliases: ['avai', 'avai fc'],
    forma: 'escudo-alto',
    contorno: '#123a7a',
    camadas: [
      'fundo(#ffffff)',
      'bandaH(68,40,"#1a4f9c")',
      'txt(50,36,"AVAI",14,"#1a4f9c")',
      'txt(50,88,"FC 1929",7,"#1a4f9c")',
    ],
  },
  {
    arquivo: 'londrina',
    nome: 'Londrina',
    aliases: ['londrina', 'londrina ec'],
    forma: 'escudo',
    contorno: '#0d5eaf',
    camadas: [
      'fundo(#ffffff)',
      'bandaH(62,46,"#0d5eaf")',
      'txt(50,40,"LONDRINA",8,"#0d5eaf")',
      'txt(50,84,"1936",7,"#ffffff")',
    ],
  },
  {
    arquivo: 'america-mineiro',
    nome: 'América Mineiro',
    aliases: ['america mineiro', 'america mg'],
    forma: 'circulo',
    contorno: '#0b6b3a',
    camadas: [
      'fundo(#ffffff)',
      'anel(50,56,42,4,"#0e7a3c")',
      'txt(50,44,"AMERICA",8,"#0e7a3c")',
      'txt(50,62,"MINEIRO",8,"#0e7a3c")',
      'txt(50,82,"1908",7,"#0e7a3c")',
    ],
  },
  {
    arquivo: 'ponte-preta',
    nome: 'Ponte Preta',
    aliases: ['ponte preta', 'pontepreta', 'macarrao'],
    forma: 'escudo',
    contorno: '#111111',
    camadas: [
      'fundo(#ffffff)',
      'bandaD("#111111",19)',
      'txt(50,38,"PONTE",9,"#ffffff")',
      'txt(50,52,"PRETA",9,"#ffffff")',
      'txt(50,88,"1933",7,"#111111")',
    ],
  },
];

/* ------------------------------------------------------------------ */
/* montagem                                                           */
/* ------------------------------------------------------------------ */

function montar(spec) {
  if (!Object.prototype.hasOwnProperty.call(FORMAS, spec.forma)) {
    throw new Error(`forma desconhecida: ${spec.forma}`);
  }

  const circulo = spec.forma === 'circulo';
  const d = circulo ? null : FORMAS[spec.forma];

  const mascara = circulo ? '<circle cx="50" cy="56" r="47"/>' : `<path d="${d}"/>`;
  const contorno = circulo
    ? `<circle cx="50" cy="56" r="44.5" fill="none" stroke="${spec.contorno}" stroke-width="5"/>`
    : `<path d="${d}" fill="none" stroke="${spec.contorno}" stroke-width="5" stroke-linejoin="round"/>`;

  const dentro = spec.camadas.map(interpretar).join('\n    ');

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 112" width="100" height="112">\n` +
    `  <title>${esc(spec.nome)}</title>\n` +
    `  <defs>\n    <clipPath id="mascara">${mascara}</clipPath>\n  </defs>\n` +
    `  <g clip-path="url(#mascara)">\n    ${dentro}\n  </g>\n` +
    `  ${contorno}\n</svg>\n`
  );
}

function gerar(destino) {
  const dir = destino || FLAGS_DIR;
  if (!fs.existsSync(dir)) {
    console.error('Pasta flags/ nao encontrada.');
    process.exit(1);
  }

  const vistos = new Set();
  TIMES.forEach((spec) => {
    if (!/^[a-z0-9-]+$/.test(spec.arquivo)) {
      throw new Error(`nome de arquivo fora do padrao: ${spec.arquivo}`);
    }
    if (vistos.has(spec.arquivo)) throw new Error(`arquivo repetido: ${spec.arquivo}`);
    vistos.add(spec.arquivo);
    fs.writeFileSync(path.join(dir, `${spec.arquivo}.svg`), montar(spec), 'utf8');
  });

  console.log(`${TIMES.length} brasaes -> flags/*.svg`);
  return TIMES.map((t) => t.arquivo);
}

if (require.main === module) gerar();

module.exports = { TIMES, FORMAS, P, montar, gerar };