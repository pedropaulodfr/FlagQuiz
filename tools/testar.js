/* =====================================================================
   Flag Arena - suite de testes (roda em Node, sem dependencias)

   node tools\testar.js

   A arena usa performance.now, requestAnimationFrame, setTimeout e
   Math.random. Aqui os quatro sao controlados, entao a simulacao roda
   igual em qualquer maquina e nenhum teste espera wall-clock.
   ===================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const raiz = path.join(__dirname, '..');
const ARQUIVOS = ['js/flags.js', 'js/game.js', 'js/config.js', 'js/rolagem.js'];

/* ---------------------------------------------------------------- */
/* infra de teste                                                     */
/* ---------------------------------------------------------------- */

let passou = 0;
const falhas = [];

function teste(nome, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === 'function') throw new Error('teste devolveu Promise');
    passou++;
  } catch (e) {
    falhas.push({ nome, erro: e && e.message ? e.message : String(e) });
  }
}

function igual(a, b, msg) {
  if (a !== b) throw new Error(msg + ' — esperado ' + JSON.stringify(b) + ', veio ' + JSON.stringify(a));
}
function verdadeiro(v, msg) {
  if (!v) throw new Error(msg || 'esperava valor verdadeiro');
}
function falso(v, msg) {
  if (v) throw new Error(msg || 'esperava valor falso');
}
function perto(a, b, tol, msg) {
  if (!(Math.abs(a - b) <= tol)) {
    throw new Error((msg || 'numeros longe') + ' — ' + a + ' vs ' + b + ' (tolerância ' + tol + ')');
  }
}

const lidos = {};
for (const rel of ARQUIVOS) lidos[rel] = fs.readFileSync(path.join(raiz, rel), 'utf8');
const jogoSrc = lidos['js/game.js'];
lidos['js/app.js'] = fs.readFileSync(path.join(raiz, 'js/app.js'), 'utf8');
lidos['styles.css'] = fs.readFileSync(path.join(raiz, 'styles.css'), 'utf8');
lidos['index.html'] = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');

/* o DOM do sandbox nao tem layout, entao posicao de CSS e' invisivel aos testes
   de simulacao. Estes testes fixam o contrato que o motor depende: o
   translate3d que o motor escreve e' relativo ao CENTRO da arena. */
function blocoCss(css, seletor) {
  /* comentarios saem fora: eles falam das mesmas propriedades e fariam o teste
     passar com a declaracao errada */
  const limpo = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const alvo = seletor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp('(^|[},])\\s*' + alvo + '\\s*\\{([^}]*)\\}').exec(limpo);
  return m ? m[2] : null;
}

/* manifest.js e' script de navegador (window.FLAG_MANIFEST); aqui ele vira array */
const MANIFEST = (() => {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(raiz, 'flags/manifest.js'), 'utf8'), ctx);
  return ctx.window.FLAG_MANIFEST;
})();

/* todos os ids que o app.js vai buscar: o sandbox do app so' cria elemento
   para os que estao aqui, entao um id novo na tela sem entrar nesta lista
   simplesmente nao existe para o teste */
const IDS_DA_TELA = [
  'arena', 'arena-anel', 'arena-anel-giro', 'arena-trilho', 'arena-giro', 'arena-seta', 'lutadores',
  'coroa', 'coroa-icone', 'coroa-nome', 'coroa-legenda', 'obstaculos', 'iniciar', 'btn-iniciar', 'vencedoras-titulo',
  'contador-escaparam',
  'contador-restam', 'fantasmas-escaparam', 'onda', 'nota-resto', 'dica',
  'vencedoras', 'vencedoras-lista', 'vencedoras-vazia', 'vencedoras-total',
  'aviso-cartao', 'aviso-titulo', 'aviso-texto', 'btn-reiniciar', 'input-pasta', 'config-info', 'aviso',
  /* pagina de ajustes: o painel e os cinco pares de slider/numero */
  'config-pagina', 'config-resumo', 'btn-config', 'btn-fechar-config', 'btn-reset-config',
  'cfg-velocidade', 'cfg-velocidade-valor',
  'cfg-rotacao', 'cfg-rotacao-valor',
  'cfg-abertura', 'cfg-abertura-valor',
  'cfg-lutadores', 'cfg-lutadores-valor',
  'cfg-arena', 'cfg-arena-valor',
  'cfg-anel', 'cfg-anel-valor',
  'cfg-tamanhoBandeira', 'cfg-tamanhoBandeira-valor',
  'cfg-formato', 'cfg-formato-valor',
  'cfg-efeitoParede', 'cfg-efeitoParede-valor',
  'selecao-pagina', 'selecao-grade', 'selecao-busca', 'selecao-contagem', 'selecao-sorteio',
  'btn-bandeiras', 'btn-fechar-selecao', 'btn-selecao-todas', 'btn-selecao-nenhuma',
  'cfg-botoes', 'cfg-botoes-valor',
  'cfg-tema', 'cfg-tema-valor',
  'cfg-layout', 'cfg-layout-valor',
  'cfg-botaoIniciar', 'cfg-botaoIniciar-valor',
  'cfg-rodadas', 'cfg-rodadas-valor',
  'cfg-vencedorasVoltam', 'cfg-vencedorasVoltam-valor',
  'cfg-dica', 'cfg-dica-valor',
  'cfg-contadorOndas', 'cfg-contadorOndas-valor',
  'cfg-contadores', 'cfg-contadores-valor',
  'cfg-mural', 'cfg-mural-valor',
  'cfg-rolagemMural', 'cfg-rolagemMural-valor',
  'cfg-seta', 'cfg-seta-valor',
  'cfg-cursor', 'cfg-cursor-valor',
  'cfg-som', 'cfg-som-valor',
  'cfg-modo', 'cfg-modo-valor',
  'cfg-obstaculo', 'cfg-obstaculo-valor',
  'cfg-efeitoAnel', 'cfg-efeitoAnel-valor',
  'cfg-muralPosicao', 'cfg-muralPosicao-valor',
  'cfg-volume', 'cfg-volume-valor',
  'cfg-nomesVencedoras', 'cfg-nomesVencedoras-valor'
];

/* Cada chave do schema precisa de um par (id do slider, id do numero) na tela.
   Se o JS ganhar um campo e o HTML nao ganhar o par, este teste quebra — e' o
   aviso de que os dois lados sairam de sincronia. */
const PARES_DO_SCHEMA = [
  'cfg-velocidade', 'cfg-rotacao', 'cfg-abertura', 'cfg-lutadores', 'cfg-arena', 'cfg-anel',
  'cfg-tamanhoBandeira', 'cfg-formato', 'cfg-efeitoParede', 'cfg-modo', 'cfg-obstaculo', 'cfg-muralPosicao', 'cfg-som', 'cfg-volume', 'cfg-rodadas', 'cfg-tema', 'cfg-layout', 'cfg-botaoIniciar', 'cfg-botoes', 'cfg-dica', 'cfg-contadorOndas', 'cfg-contadores', 'cfg-mural', 'cfg-rolagemMural', 'cfg-vencedorasVoltam', 'cfg-seta', 'cfg-cursor', 'cfg-nomesVencedoras'
];

/* ---------------------------------------------------------------- */
/* DOM de mentira: so' o que a arena usa                             */
/* ---------------------------------------------------------------- */

function criarElemento(tag) {
  const el = {
    tagName: String(tag).toUpperCase(),
    children: [],
    parentNode: null,
    _texto: '',
    style: {},
    _dataset: {},
    classes: new Set(),
    atributos: {},
    offsetWidth: 0,
    hidden: false,
    src: '',
    alt: '',
    title: '',
    clientWidth: 400,

    get className() { return [...this.classes].join(' '); },
    set className(v) { this.classes = new Set(String(v).split(/\s+/).filter(Boolean)); },
    get classList() {
      const el = this;
      return {
        add(...n) { n.forEach(c => el.classes.add(c)); },
        remove(...n) { n.forEach(c => el.classes.delete(c)); },
        contains(c) { return el.classes.has(c); },
        toggle(c, on) { if (on === undefined ? !el.classes.has(c) : on) el.classes.add(c); else el.classes.delete(c); }
      };
    },
    get textContent() { return this._texto; },
    set textContent(v) { this._texto = String(v); this.children = []; },

    get firstChild() { return this.children[0] || null; },

    appendChild(n) { n.parentNode = this; this.children.push(n); return n; },
    removeChild(n) {
      const i = this.children.indexOf(n);
      if (i !== -1) this.children.splice(i, 1);
      n.parentNode = null;
      return n;
    },
    setAttribute(k, v) { this.atributos[k] = String(v); },
    getAttribute(k) { return this.atributos[k] ?? null; },

    /* no DOM de verdade, escrever em dataset.id cria o atributo data-id;
       o espelho mantem os testes honestos sem Proxy */
    get dataset() {
      const el = this;
      return new Proxy(el._dataset || (el._dataset = {}), {
        set(alvo, k, v) { alvo[k] = v; el.atributos['data-' + String(k)] = String(v); return true; }
      });
    },
    addEventListener() {},
    removeEventListener() {},
    dispatch() {},

    /* o motor so' procura <img> dentro do proprio lutador */
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; },
    querySelectorAll(sel) {
      const quer = String(sel).toUpperCase();
      const out = [];
      (function anda(no) {
        for (const c of no.children) {
          if (c.tagName === quer) out.push(c);
          anda(c);
        }
      })(this);
      return out;
    },    getBoundingClientRect() {
      return { x: 0, y: 0, left: 0, top: 0, width: this.clientWidth, height: this.clientWidth, right: this.clientWidth, bottom: this.clientWidth };
    }
  };
  return el;
}

/* ---------------------------------------------------------------- */
/* sandbox: relogio, timers e sorteio controlados                     */
/* ---------------------------------------------------------------- */

function montarContexto(semente) {
  const relogio = { t: 1000 };
  const timers = new Map();
  const raf = { fn: null };
  /* ids crescem para sempre: derivar do `timers.size` faria um timer novo
     colidir com um ainda pendente depois que outro fosse disparado, e o
     `clearTimeout` de um acabaria cancelando o outro por engano. */
  let proxId = 0;

  const sandbox = {
    console,
    performance: { now: () => relogio.t },
    document: { createElement: criarElemento },
    requestAnimationFrame(fn) { raf.fn = fn; return 1; },
    cancelAnimationFrame() { raf.fn = null; },
    setTimeout(fn, ms) {
      const id = ++proxId;
      timers.set(id, { t: relogio.t + (ms || 0), fn });
      return id;
    },
    clearTimeout(id) { timers.delete(id); },
    addEventListener() {},
    location: { protocol: 'file:', hash: '' },
    Set,
    Math,
    Date,
    FLAG_MANIFEST: null
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  /* Math.random semeado (mulberry32): mesma arena, mesmo sorteio */
  let a = (semente >>> 0) || 0x9e3779b9;
  sandbox.sembrar = (s) => { a = (s >>> 0) || 0x9e3779b9; };
  const mr = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  /* Math com sorteio proprio: as demais funcoes sao as nativas */
  sandbox.Math = {};
  for (const k of ['abs', 'hypot', 'atan2', 'sin', 'cos', 'floor', 'min', 'max', 'sqrt', 'pow', 'sign', 'round']) {
    sandbox.Math[k] = Math[k];
  }
  sandbox.Math.PI = Math.PI;
  sandbox.Math.E = Math.E;
  sandbox.Math.random = mr;

  /* cria jogo ja ligado ao relogio deste sandbox, para os testes poderem
     andar no tempo com `anda(jogo, ms)` sem tocar no motor */
  sandbox.__criar = (el) => {
    const j = sandbox.FlagQuiz.criarJogo(el);
    j.__sb = sandbox;
    return j;
  };

  /* avanca o relogio em quadros de ~16ms, disparando o rAF de cada quadro e
     os timers vencidos — e' assim que o navegador se comporta. Andar direto
     ate o fim daria dt=0 no motor e a arena congelaria. */
  sandbox.avancar = (ms) => {
    const F = 16;
    let restante = ms;
    while (restante > 0) {
      const passo = Math.min(F, restante);
      relogio.t += passo;
      restante -= passo;

      /* timers vencidos primeiro: quem expira sai antes do proximo quadro */
      for (;;) {
        let prox = null, idProx = -1;
        for (const [id, t] of timers) {
          if (t.t <= relogio.t && (prox === null || t.t < prox)) { prox = t.t; idProx = id; }
        }
        if (prox === null) break;
        const t = timers.get(idProx);
        timers.delete(idProx);
        t.fn();
      }

      if (raf.fn) { const f = raf.fn; raf.fn = null; f(relogio.t); }
    }
  };

  return sandbox;
}

function rodar(sandbox, rels) {
  for (const rel of rels) vm.runInContext(lidos[rel], sandbox, { filename: rel });
}

/* ---------------------------------------------------------------- */
/* helpers de arena                                                   */
/* ---------------------------------------------------------------- */

function arenaDe(colecao, semente, elExtra) {
  const sandbox = montarContexto(semente === undefined ? 1 : semente);
  sandbox.sembrar(semente === undefined ? 1 : semente);
  sandbox.FLAG_MANIFEST = (colecao || MANIFEST).map(f => ({
    id: f.id, answer: f.answer, aliases: f.aliases, src: f.src
  }));
  rodar(sandbox, ARQUIVOS);
  const B = sandbox.Bandeiras;
  const flags = B.lerManifest();
  const jogo = sandbox.__criar(Object.assign({ arena: { clientWidth: 400 } }, elExtra));
  jogo.definirTamanho(400);
  jogo.preparar(flags);
  jogo.iniciar();
  return { sandbox, jogo, flags, Bandeiras: B };
}

function arena(colecao) { return arenaDe(colecao, 1); }

/* O <circle> do anel, tal como o index.html o escreve. Passa-lo no `el` e' a
   mesma via que o app usa — o motor le-o de la e escreve o tracejado em cima,
   sem nunca o receber por parametro. */
function anelDeR(r) {
  const anel = criarElemento('circle');
  anel.setAttribute('cx', '200');
  anel.setAttribute('cy', '200');
  anel.setAttribute('r', String(r));
  return anel;
}

/* avanca o tempo como o navegador faria: quadro de animacao, timers e relogio */
function anda(jogo, ms) {
  const sb = jogo.__sb;
  if (!sb) throw new Error('jogo sem sandbox');
  sb.avancar(ms);
}

/* avanca ate a onda fechar (ou desistir) */
function ateVitoria(jogo, ms = 600000) {
  let gasto = 0;
  while (jogo.estado.fase === jogo.FASE.RODANDO && gasto < ms) {
    anda(jogo, 100);
    gasto += 100;
  }
  return gasto < ms;
}

/* espelho do CFG do motor, so' com o que os testes precisam saber. Se aqui
   aparecem constantes que o jogo ja' nao tem — como a antiga taxaFuga — os
   testes passam a descrever uma fisica que nao existe. */
const CFG = {
  lutadoresIniciais: 16,
  aberturaVelocidade: 0.18,
  aberturaMeiaLargura: 0.6021,
  duracaoCoroa: 5200,
  vencedorasVisiveis: 8
};

/* POE uma bandeira em fila para atravessar o portao: encosta-a no anel, no
   angulo da abertura, e da-lhe velocidade para fora. E' a fuga mais direta que
   existe — nada de meter no medidor (ja' nao existe). Como `restam` guarda quem
   pode sair, quem fica para tras continua a volta. */
function enfileirarNaSaida(jogo, l, { vel = 90 } = {}) {
  const e = jogo.estado;
  e.abertura = 0;                       /* o portao no topo, onde esta' a seta */
  l.x = e.cx;
  l.y = e.cy - e.raioJogador;
  l.rumo = -Math.PI / 2;                /* para fora = para cima */
  l.vx = 0;
  l.vy = -vel;
  /* as demais ficam paradas: a fisica agora e' so' velocidade, e uma delas
     poderia sair sozinha durante o teste e falsear a contagem. */
  for (const o of e.lutadores) {
    if (o !== l) { o.vx = 0; o.vy = 0; }
  }
  return l;
}

/* ---------------------------------------------------------------- */
/* flags.js                                                           */
/* ---------------------------------------------------------------- */

const base = arena();

teste('exibir levanta so a inicial, sem mexer no que se compara', () => {
  const B = base.Bandeiras;
  igual(B.exibir('suica'), 'Suica', 'primeira letra so');
  igual(B.exibir('reino unido'), 'Reino Unido', 'cada palavra com inicial maiuscula');
  igual(B.exibir('estados unidos'), 'Estados Unidos', 'estados unidos');
  igual(B.exibir('africa do sul'), 'Africa do Sul', 'ligacao (do) fica minuscula no meio');
  igual(B.exibir('coreia do sul'), 'Coreia do Sul', 'coreia do sul');
  igual(B.exibir('do brasil'), 'Do Brasil', 'ligacao no comeco leva maiuscula');
  igual(B.exibir('eua'), 'Eua', 'sigla com ponto');
  igual(B.exibir('Suica'), 'Suica', 'ja maiuscula nao muda');
  igual(B.exibir('2024'), '2024', 'digito nao tem caixa');
  igual(B.exibir(''), '', 'vazio nao vira espaco');
  igual(B.exibir(null), '', 'ausente nao quebra a tela');

  /* o ponto de exibir nao pode vazar para a comparacao: `answer` continua
     minuscula, que e' o que casa com a entrada do jogador */
  igual(B.normalizar(B.exibir('suica')), B.normalizar('suica'), 'comparacao estavel');
  verdadeiro(B.exibir('suica') !== 'suica', 'a diferenca existe mesmo assim');
});

teste('todo nome do manifest esta com a inicial de cada palavra em maiuscula e bate com a resposta', () => {
  const sb = montarContexto(1);
  rodar(sb, ['js/flags.js']);
  const B = sb.Bandeiras;
  const LIGACOES = ['de', 'da', 'do', 'das', 'dos', 'e'];
  for (const f of MANIFEST) {
    verdadeiro(f.nome, f.id + ': sem nome de exibicao');
    igual(B.normalizar(f.nome), f.answer, f.id + ': o nome nao bate com a resposta (alem de acento e caixa)');
    f.nome.split(' ').forEach((palavra, i) => {
      if (i > 0 && LIGACOES.includes(palavra)) return;
      igual(palavra.charAt(0), palavra.charAt(0).toUpperCase(), f.id + ': palavra sem maiuscula: ' + palavra);
    });
    igual(B.nome(f), f.nome, f.id + ': a tela usa o nome com a grafia real');
  }
  igual(B.nome({ answer: 'estados unidos' }), 'Estados Unidos', 'sem nome no manifest cai no exibir()');
});

teste('o nome que aparece na tela ja vem com a inicial em maiuscula', () => {
  /* passa por TODOS os lugares por onde um nome de bandeira chega ao olho:
     o lutador no anel, o title, o alt e a coroa. Um display novo que esqueça
     de passar por `exibir` cai neste teste. */
  const s = arena();
  const lutadores = criarElemento('div');
  const coroaNome = criarElemento('div');
  const jogo = s.sandbox.__criar({
    arena: { clientWidth: 400 },
    lutadores: lutadores,
    coroaNome: coroaNome
  });
  jogo.definirTamanho(400);
  jogo.preparar(s.flags);
  jogo.iniciar();
  const B = s.Bandeiras;

  verdadeiro(lutadores.children.length > 0, 'o anel tem lutadores');
  for (const elL of lutadores.children) {
    const img = elL.querySelector('img');
    igual(img.alt, B.exibir(img.alt), 'alt em forma de exibicao: ' + img.alt);
    const titulo = elL.title.replace(' (campeã)', '');
    igual(titulo, B.exibir(titulo), 'title em forma de exibicao: ' + titulo);
    igual(elL.getAttribute('aria-label'), B.exibir(elL.getAttribute('aria-label')), 'aria-label em forma de exibicao');
  }

  verdadeiro(ateVitoria(jogo), 'a onda fecha');
  igual(coroaNome.textContent, B.exibir(jogo.estado.campeao.answer), 'coroa em forma de exibicao');
});

teste('comparacao ignora acento, caixa e hifen', () => {
  const B = base.Bandeiras;
  igual(B.normalizar('Suíça'), 'suica', 'acento');
  igual(B.normalizar('  SUISSE  '), 'suisse', 'caixa/espaco');
  igual(B.normalizar('reino-unido'), 'reino unido', 'hifen');
  igual(B.normalizar('E.U.A.'), 'eua', 'pontos somem');
  igual(B.normalizar('Costa_do_Mar'), 'costa do mar', 'underscore');
});

teste('o nome do arquivo vira a resposta', () => {
  const B = base.Bandeiras;
  igual(B.respostaDoNome('reino-unido.svg'), 'reino unido');
  igual(B.respostaDoNome('bandeiras\\suica.png'), 'suica');
  igual(B.respostaDoNome('Japão.JPEG'), 'japao');
  igual(B.respostaDoNome('sem-extensao'), 'sem extensao');
});

teste('so' + ' imagem vira bandeira', () => {
  const B = base.Bandeiras;
  verdadeiro(B.temExtensaoDeImagem('a.svg'), 'svg');
  verdadeiro(B.temExtensaoDeImagem('a.WEBP'), 'webp');
  falso(B.temExtensaoDeImagem('a.txt'), 'txt');
  falso(B.temExtensaoDeImagem('a'), 'sem ponto');
});

teste('manifest carrega id, answer normalizado e aliases', () => {
  const B = base.Bandeiras;
  const f = B.lerManifest();
  verdadeiro(f.length >= 20, 'colecao grande');
  for (const x of f) {
    igual(x.answer, x.answer.toLowerCase(), 'minusculo: ' + x.answer);
    verdadeiro(x.aliases.indexOf(x.answer) !== -1, 'answer nos aliases');
    verdadeiro(x.origem === 'projeto', 'origem');
    igual(x.urlObravelho, null, 'sem object url no manifest');
  }
});

teste('colecao sem manifest nao quebra', () => {
  const s = montarContexto(2);
  s.sembrar(2);
  rodar(s, ARQUIVOS);
  igual(s.Bandeiras.lerManifest().length, 0, 'vazio');
});

teste('pasta vira colecao e ignora o que nao' + ' e imagem', () => {
  const s = montarContexto(3);
  s.sembrar(3);
  const revogados = new Set();
  let n = 0;
  s.URL = {
    createObjectURL() { return 'blob:' + (++n); },
    revokeObjectURL(u) { revogados.add(u); }
  };
  rodar(s, ARQUIVOS);

  const arquivos = [
    { name: 'reino-unido.svg', size: 10, type: 'image/svg+xml' },
    { name: 'notas.txt', size: 10, type: 'text/plain' },
    { name: '.oculto.svg', size: 10, type: 'image/svg+xml' },
    { name: 'SUÍCA.png', size: 10, type: 'image/png' },
    { name: 'suica.png', size: 10, type: 'image/png' }
  ];
  const lista = s.Bandeiras.lerPasta(arquivos);

  igual(lista.length, 2, 'duplicada por resposta cai fora');
  igual(lista[0].answer, 'reino unido', 'primeira');
  igual(lista[1].answer, 'suica', 'normalizada');
  igual(lista[1].origem, 'pasta', 'origem');
  verdadeiro(!/notas/.test(lista.map(f => f.answer).join(' ')), 'txt fora');
  verdadeiro(!/oculto/.test(lista.map(f => f.answer).join(' ')), 'oculto fora');
  verdadeiro(lista.every(f => /^blob:/.test(f.urlObravelho)), 'object url');
});

teste('pasta com webkitRelativePath ignora arquivo de fora', () => {
  const s = montarContexto(4);
  s.sembrar(4);
  s.URL = { createObjectURL: () => 'blob:x', revokeObjectURL() {} };
  rodar(s, ARQUIVOS);
  const lista = s.Bandeiras.lerPasta([
    { name: 'a.svg', webkitRelativePath: 'bandeiras/a.svg' },
    { name: 'b.svg', webkitRelativePath: 'outro/b.svg' }
  ]);
  igual(lista.length, 1, 'so a raiz escolhida');
  igual(lista[0].answer, 'a', 'da raiz');
});

teste('revogar so' + ' mata a URL que saiu', () => {
  const s = montarContexto(5);
  s.sembrar(5);
  const revogados = new Set();
  s.URL = { createObjectURL: () => 'blob:x', revokeObjectURL: u => revogados.add(u) };
  rodar(s, ARQUIVOS);

  const antigas = [{ urlObravelho: 'blob:1' }, { urlObravelho: 'blob:2' }];
  const novas = [{ urlObravelho: 'blob:2' }, { urlObravelho: 'blob:3' }];
  s.Bandeiras.revogar(antigas, novas);

  falso(revogados.has('blob:2'), 'URL reaproveitada continua viva');
  verdadeiro(revogados.has('blob:1'), 'URL que saiu morre');
  falso(revogados.has('blob:3'), 'URL nova nunca foi revogada');
});

teste('revogar sem a lista nova descarta tudo', () => {
  const s = montarContexto(6);
  s.sembrar(6);
  const revogados = new Set();
  s.URL = { createObjectURL: () => 'blob:x', revokeObjectURL: u => revogados.add(u) };
  rodar(s, ARQUIVOS);

  s.Bandeiras.revogar([{ urlObravelho: 'blob:1' }, { urlObravelho: null }]);
  igual(revogados.size, 1, 'so a URL que existia');
  verdadeiro(revogados.has('blob:1'), 'morreu');
});

teste('embaralhar nao perde nem duplica nada', () => {
  const s = montarContexto(7);
  s.FLAG_MANIFEST = MANIFEST;
  s.URL = { createObjectURL: () => 'blob:x', revokeObjectURL() {} };
  rodar(s, ARQUIVOS);
  const base1 = s.Bandeiras.lerManifest();
  const uma = s.Bandeiras.embaralhar(base1);
  const outra = s.Bandeiras.embaralhar(base1);
  igual(uma.length, base1.length, 'mesmo tamanho');
  igual(new Set(uma.map(f => f.id)).size, base1.length, 'sem duplicata');
  igual(uma.map(f => f.id).sort().join(), base1.map(f => f.id).sort().join(), 'mesma colecao');
  falso(uma.map(f => f.id).join() === base1.map(f => f.id).join(), 'ordem mudou');
  falso(outra.map(f => f.id).join() === base1.map(f => f.id).join(), 'ordem mudou de novo');
});

/* ---------------------------------------------------------------- */
/* geometria / regras basicas                                         */
/* ---------------------------------------------------------------- */

teste('a arena aceita qualquer lado e tem raio coerente', () => {
  const { jogo } = arena();
  jogo.parar();
  jogo.definirTamanho(120);
  igual(jogo.estado.lado, 120, 'lado minimo');
  igual(jogo.estado.cx, 60, 'centro x');
  igual(jogo.estado.R, 120 * 0.455, 'raio do anel');
  verdadeiro(jogo.estado.raioJogador < jogo.estado.R, 'lutador fica dentro do anel');

  jogo.definirTamanho(600);
  igual(jogo.estado.lado, 600, 'lado grande');
  igual(jogo.estado.raioJogador, 600 * 0.455 - 600 * 0.075, 'folga do lutador');

  /* a folga existe para o BLOCO inteiro ficar dentro do anel, nao so o centro:
     a meia-diagonal de um lutador (--lutador = 62px no maior tamanho) e'
     ~37.8px, que tem de caber na folga ou os cantos furam o circulo. */
  const maiorBloco = Math.hypot(62 / 2, (62 * 0.7) / 2);
  const folga = jogo.estado.R - jogo.estado.raioJogador;
  verdadeiro(maiorBloco <= folga,
    'a maior bandeira cabe na folga (' + maiorBloco.toFixed(1) + ' <= ' + folga.toFixed(1) + ')');
});

teste('a CSS ancora o lutador e o anel no centro da arena', () => {
  const css = lidos['styles.css'];

  /* o motor escreve translate3d(x - cx, y - cy): o bloco precisa nascer
     ja centrado, senao o anel inteiro orbita em torno de outro ponto */
  const lutador = blocoCss(css, '.lutador');
  verdadeiro(lutador, 'existe a regra .lutador');
  verdadeiro(/left\s*:\s*50%/.test(lutador), '.lutador ancora em left:50%');
  verdadeiro(/top\s*:\s*50%/.test(lutador), '.lutador ancora em top:50%');
  verdadeiro(/margin\s*:[^;]*-\.5\)/.test(lutador), '.lutador se equilibra com margem negativa');

  const anel = blocoCss(css, '.arena-anel');
  verdadeiro(anel, 'existe a regra .arena-anel');
  /* O <svg> deixou de rodar: a rotacao passou para o <g>, com o centro escrito
     em unidades do viewBox. Se voltar um transform aqui, o anel passa a girar
     em torno de um ponto resolvido por CSS, que e' a origem do desalinhamento. */
  falso(/transform\s*:/.test(anel), '.arena-anel nao roda mais (a rotacao e\' do <g>)');
  falso(/transform-origin\s*:/.test(anel), '.arena-anel nao declara transform-origin');
});

teste('o anel gira em torno do centro do circulo das bandeiras', () => {
  const css = lidos['styles.css'];
  const html = lidos['index.html'];

  /* Existe um container orbital <g> dentro do <svg>, e o motor escreve nele um
     `rotate(ang 200 200)` — centro explicito, na mesma unidade do viewBox. */
  verdadeiro(/id="arena-giro"/.test(html), 'existe o <g id="arena-giro">');
  verdadeiro(/setAttribute\(\s*'transform'/.test(jogoSrc),
    'o motor escreve o atributo transform');
  verdadeiro(/'rotate\(' \+[\s\S]*?CFG\.centroSvg \+ ' ' \+ CFG\.centroSvg/.test(jogoSrc),
    'a rotacao leva o centro explicito, duas vezes');

  /* O centro tem de ser o mesmo 200 do viewBox, do <circle> e do inicio do
     <path> do anel. Se algum destes divergir, o eixo deixa de ser o centro
     geometrico do circulo das bandeiras. */
  const viewBox = /viewBox="0 0 (\d+) (\d+)"/.exec(html);
  verdadeiro(viewBox, 'o <svg> declara viewBox');
  igual(viewBox[1], viewBox[2], 'o viewBox e\' quadrado');
  const centro = Number(viewBox[1]) / 2;

  const cfgCentro = /centroSvg\s*:\s*(\d+)/.exec(jogoSrc);
  verdadeiro(cfgCentro, 'CFG.centroSvg existe');
  igual(Number(cfgCentro[1]), centro, 'CFG.centroSvg = viewBox / 2');

  verdadeiro(new RegExp('<circle[^>]*\\bcx="' + centro + '"[^>]*\\bcy="' + centro + '"').test(html) ||
             new RegExp('<circle[^>]*\\bcy="' + centro + '"[^>]*\\bcx="' + centro + '"').test(html),
    'o circulo das bandeiras esta centrado no mesmo ponto');
  /* O anel que gira tem de nascer no MESMO ponto do circulo onde as bandeiras
     flutuam. Se divergir, parece descentrado mesmo que a rotacao esteja certa. */
  const anelGiro = new RegExp('<circle[^>]*\\bclass="arena-anel-giro"[^>]*').exec(html);
  verdadeiro(anelGiro, 'existe o <circle> do anel que gira');
  verdadeiro(new RegExp('\\bcx="' + centro + '"').test(anelGiro[0]), 'anel que gira: cx no centro');
  verdadeiro(new RegExp('\\bcy="' + centro + '"').test(anelGiro[0]), 'anel que gira: cy no centro');

  /* E o raio do <circle> tem de casar com o raio que o motor usa. Esta era a
     lacuna: o teste so comparava CSS com motor e nunca olhava para o SVG. */
  const raioSvg = /<circle[^>]*\br="(\d+)"/.exec(html);
  verdadeiro(raioSvg, 'o circulo do anel declara r');
  const motor = /raioBorda\s*:\s*(\d+)\s*\/\s*(\d+)/.exec(jogoSrc);
  verdadeiro(motor, 'CFG.raioBorda existe no motor');
  igual(Number(motor[1]), Number(raioSvg[1]),
    'o r do SVG e\' o numerador de CFG.raioBorda');
  igual(Number(motor[2]), Number(viewBox[1]),
    'o denominador de CFG.raioBorda e\' o lado do viewBox');
});

teste('o espelho de CFG nao diverge do motor', () => {
  /* O CFG local desta suite reescreve as constantes de que os testes precisam.
     Sem este teste ele vira uma segunda fonte da verdade: alguém mexe no motor,
     os numeros daqui ficam para tras e os testes passam a descrever uma fisica
     que o jogo nao tem — foi assim que a `taxaFuga` morta sobreviveu aqui. */
  for (const chave of Object.keys(CFG)) {
    const noMotor = new RegExp('\\b' + chave + '\\s*:\\s*([\\d.]+)').exec(jogoSrc);
    verdadeiro(noMotor, 'CFG.' + chave + ' existe no motor');
    igual(Number(noMotor[1]), CFG[chave], 'CFG.' + chave + ' no espelho');
  }
});

teste('o raio do anel no CSS casa com CFG.raioBorda do motor', () => {
  const css = lidos['styles.css'];

  /* o mesmo raio tem de valer nos dois lados: o motor abre o portao em
     CFG.raioBorda e o CSS desenha o circulo visivel em --anel-raio */
  const motor = /raioBorda\s*:\s*(\d+)\s*\/\s*(\d+)/.exec(jogoSrc);
  verdadeiro(motor, 'CFG.raioBorda existe no motor');
  const cssRaio = /--anel-raio\s*:\s*([\d.]+)%/.exec(css);
  verdadeiro(cssRaio, '--anel-raio existe no CSS');
  igual(Number(cssRaio[1]), Number(motor[1]) / Number(motor[2]) * 100,
    'anel do CSS casa com CFG.raioBorda do motor');
});

teste('a abertura nasce no topo e gira no sentido do relogio', () => {
  const { jogo } = arena();
  igual(jogo.estado.abertura, -Math.PI / 2, 'topo');
  anda(jogo, 1000);
  const d1 = jogo.estado.abertura;
  verdadeiro(d1 > -Math.PI / 2, 'nao volta atras');
  anda(jogo, 1000);
  verdadeiro(jogo.estado.abertura > d1, 'continua girando');
  anda(jogo, 30000);
  verdadeiro(jogo.estado.abertura >= 0 && jogo.estado.abertura < Math.PI * 2, 'fica no intervalo');
});

teste('o anel e a seta andam com a abertura', () => {
  /* o container orbital e' o <g>: recebe o atributo transform do SVG, com o
     centro em unidades do viewBox (200 200), e nao um transform CSS em px */
  const el = {
    arena: { clientWidth: 400 },
    arenaGiro: { attrs: {}, setAttribute(n, v) { this.attrs[n] = v; }, getAttribute(n) { return this.attrs[n]; } },
    arenaAnel: { style: {} }
  };
  const s = montarContexto(8);
  s.FLAG_MANIFEST = MANIFEST;
  rodar(s, ARQUIVOS);
  const jogo = s.__criar(el);
  jogo.definirTamanho(400);

  jogo.preparar(s.Bandeiras.lerManifest());
  jogo.iniciar();
  const primeiro = el.arenaGiro.getAttribute('transform');
  anda(jogo, 1200);
  falso(el.arenaGiro.getAttribute('transform') === primeiro, 'o grupo orbital girou');
  verdadeiro(/^rotate\(-?[\d.]+ 200 200\)$/.test(el.arenaGiro.getAttribute('transform')),
    'rotacao com centro explicito: ' + el.arenaGiro.getAttribute('transform'));
  /* o <svg> nao leva transform CSS: era essa a origem do eixo trocado */
  igual(el.arenaAnel.style.transform, undefined, 'o <svg> nao recebeu transform CSS');
});

teste('o anel que gira nao tem como sair do seu centro', () => {
  const css = lidos['styles.css'];
  const html = lidos['index.html'];

  /* O anel e' levado pela rotacao do <g>, cujo centro esta escrito no proprio
     atributo. Se o anel tivesse um transform seu, ou se o CSS lhe inventasse
     um transform-origin em px, voltava a poder sair do centro — que era
     exactamente o defeito que este anel nao pode ter. */
  const dentro = /<g id="arena-giro">([\s\S]*?)<\/g>/.exec(html);
  verdadeiro(dentro, 'existe o <g id="arena-giro">');
  verdadeiro(/class="arena-anel-giro"/.test(dentro[1]), 'o anel que gira vive dentro do grupo');

  const anel = /<circle[^>]*\bclass="arena-anel-giro"[^>]*>/.exec(html);
  verdadeiro(anel, 'o anel e\' um <circle>');
  falso(/transform/.test(anel[0]), 'o anel nao tem transform proprio');
  falso(/\bstyle=/.test(anel[0]), 'o anel nao leva style inline');

  const regra = blocoCss(css, '.arena-anel-giro');
  verdadeiro(regra, 'existe a regra .arena-anel-giro');
  falso(/transform\s*:/.test(regra), '.arena-anel-giro nao declara transform');
  falso(/transform-origin\s*:/.test(regra), '.arena-anel-giro nao declara transform-origin');
  /* O portao e' a unica saida e tem de coincidir com o que a fisica aceita.
     Se o tracejado estivesse no CSS, ele ganharia do atributo que o motor
     escreve e voltaria a ser decoracao. */
  falso(/stroke-dasharray\s*:/.test(regra), 'o portao nao e' + ' fixo em CSS');
  falso(/stroke-dashoffset\s*:/.test(regra), 'o portao nao e' + ' fixo em CSS');
  verdadeiro(/stroke-linecap\s*:\s*butt/.test(regra), 'ponta seca, senao o topo arredonda e encolhe o portao');
});

teste('nenhum lutador nasce no centro nem fora do anel', () => {
  const { jogo } = arena();
  for (const l of jogo.estado.lutadores) {
    const d = Math.hypot(l.x - jogo.estado.cx, l.y - jogo.estado.cy);
    verdadeiro(d > 1, 'afastado do centro');
    verdadeiro(d <= jogo.estado.raioJogador + 1e-6, 'dentro do anel');
  }
});

teste('todo lutador fica dentro do anel depois de muito tempo', () => {
  const { jogo } = arena();
  anda(jogo, 20000);
  const e = jogo.estado;
  for (const l of e.lutadores) {
    if (l.escapando) continue;
    const dx = l.x - e.cx, dy = l.y - e.cy;
    const d = Math.hypot(dx, dy);

    /* ninguem atravessa o anel, nem no setor da abertura: atravessar e' o que
       dispara a fuga, e a fuga e' um evento, nao um estado */
    verdadeiro(d <= e.R + 1e-6, 'saiu do anel: ' + d);

    /* e so' da para fora de `raioJogador` DENTRO do setor da abertura. Fora
       dele o anel e' parede. E' este limite — e nao `raioJogador` para todo
       mundo — que faz a fuga existir. */
    let dif = (Math.atan2(dx, -dy) - e.abertura) % (Math.PI * 2);
    if (dif > Math.PI) dif -= Math.PI * 2;
    if (dif < -Math.PI) dif += Math.PI * 2;
    const limite = Math.abs(dif) <= CFG.aberturaMeiaLargura ? e.R : e.raioJogador;
    verdadeiro(d <= limite + 1e-6, 'estava fora do limite: ' + d + ' > ' + limite);
  }
});

teste('o motor nao' + ' escreve no DOM nada alem de <img>', () => {
  const CRIAR = /createElement\((['"])([^'"]+)\1\)/g;
  const usados = new Set();
  let m;
  while ((m = CRIAR.exec(jogoSrc))) usados.add(m[2]);
  const permitidos = new Set(['div', 'img', 'b', 'span']);
  for (const tag of usados) verdadeiro(permitidos.has(tag), 'cria elemento inesperado: ' + tag);

  /* innerHTML so' para limpar container */
  const inner = jogoSrc.match(/innerHTML\s*=\s*[^;]+/g) || [];
  for (const linha of inner) {
    verdadeiro(/innerHTML\s*=\s*''\s*$/.test(linha), 'innerHTML com conteudo: ' + linha.trim());
  }
});

/* ---------------------------------------------------------------- */
/* ondas                                                              */
/* ---------------------------------------------------------------- */

teste('a primeira onda enche o anel e ja' + ' roda', () => {
  const { jogo } = arena();
  igual(jogo.estado.onda, 1, 'onda 1');
  igual(jogo.estado.lutadores.length, CFG.lutadoresIniciais, 'lutadores');
  igual(jogo.estado.restam, CFG.lutadoresIniciais, 'restam');
  igual(jogo.estado.escaparam, 0, 'escaparam');
  igual(jogo.estado.campeao, null, 'sem campeao');
  igual(jogo.estado.fase, jogo.FASE.RODANDO, 'rodando');
  igual(jogo.estado.todas.length, base.flags.length, 'colecao inteira');
});

teste('as bandeiras da onda sao da colecao, sem repetir', () => {
  const { jogo } = arena();
  const ids = jogo.estado.lutadores.map(l => l.flag.id);
  igual(new Set(ids).size, ids.length, 'sem repetida');
  for (const l of jogo.estado.lutadores) {
    verdadeiro(base.flags.some(f => f.id === l.flag.id), 'nao veio da colecao');
  }
});

teste('a colecao e' + ' curta usa quantas tem', () => {
  const curta = [
    { id: 'a', answer: 'a', aliases: ['a'], src: 'flags/a.svg' },
    { id: 'b', answer: 'b', aliases: ['b'], src: 'flags/b.svg' }
  ];
  const { jogo } = arena(curta);
  igual(jogo.estado.lutadores.length, 2, 'duas bandeiras');
  igual(jogo.estado.restam, 2, 'restam 2');
});

teste('reiniciar volta para a onda 1', () => {
  const { jogo } = arena();
  anda(jogo, 4000);
  jogo.reiniciar();
  igual(jogo.estado.onda, 1, 'onda 1');
  igual(jogo.estado.campeao, null, 'campeao limpo');
  igual(jogo.estado.lutadores.length, CFG.lutadoresIniciais, 'lutadores de novo');
  igual(jogo.estado.fase, jogo.FASE.RODANDO, 'rodando');
});

/* ---------------------------------------------------------------- */
/* fuga                                                               */
/* ---------------------------------------------------------------- */

teste('a onda fecha na primeira fuga e as contagens batem', () => {
  const { jogo } = arena();
  let gasto = 0;
  while (jogo.estado.fase === jogo.FASE.RODANDO && gasto < 600000) {
    anda(jogo, 100);
    gasto += 100;
    verdadeiro(jogo.estado.restam >= 1, 'restam zerou');
    igual(jogo.estado.escaparam + jogo.estado.restam, CFG.lutadoresIniciais, 'soma das contagens');
  }
  verdadeiro(jogo.estado.fase === jogo.FASE.VITORIA, 'a onda fechou');
  igual(jogo.estado.escaparam, 1, 'so a primeira escapou');
  igual(jogo.estado.restam, CFG.lutadoresIniciais - 1, 'as outras seguem na arena');
});

teste('a onda sempre termina com exatamente uma fuga', () => {
  for (let semente = 1; semente <= 12; semente++) {
    const { jogo } = arenaDe(null, semente);
    verdadeiro(ateVitoria(jogo), 'convergiu com a semente ' + semente);
    igual(jogo.estado.escaparam, 1, 'uma fuga (semente ' + semente + ')');
    igual(jogo.estado.lutadores.filter(l => !l.escapando).length, CFG.lutadoresIniciais - 1, 'as demais ficam (semente ' + semente + ')');
  }
});

teste('bandeira fora do setor da abertura bate no anel e nao escapa', () => {
  const { jogo } = arena();
  const alvo = jogo.estado.lutadores[0];
  const e = jogo.estado;

  /* portao virado para o lado oposto, e a bandeira empurrada para cima */
  e.abertura = Math.PI;
  alvo.x = e.cx;
  alvo.y = e.cy - e.raioJogador;
  alvo.rumo = -Math.PI / 2;
  alvo.vx = 0;
  alvo.vy = -80;

  anda(jogo, 200);
  falso(alvo.escapando, 'nao atravessa parede');
  const d = Math.hypot(alvo.x - e.cx, alvo.y - e.cy);
  verdadeiro(d <= e.raioJogador + 1e-6, 'o anel devolveu para dentro: ' + d);
});

teste('o anel solido tambem trava quem bate pelo lado de dentro', () => {
  /* espelhar a prova de cima: a mesma bandeira, agora com a abertura virada
     para ela, tem de sair. Sem esta dupla, "bate no anel" e "nao escapa" podia
     ser so' porque a bandeira nunca chegou a nada. */
  const { jogo } = arena();
  const alvo = jogo.estado.lutadores[0];
  const e = jogo.estado;

  enfileirarNaSaida(jogo, alvo, { vel: 80 });
  anda(jogo, 600);

  verdadeiro(alvo.escapando, 'com o portao virado para ela, sai');
  igual(jogo.estado.escaparam, 1, 'contou a fuga');
  igual(jogo.estado.restam, CFG.lutadoresIniciais - 1, 'contagem coerente');
  igual(jogo.estado.restam + jogo.estado.lutadores.filter(l => l.escapando).length,
    CFG.lutadoresIniciais, 'somando quem esta saindo da tela');
});

teste('quem escapa sai do DOM depois da animacao', () => {
  const { jogo } = arena();
  const alvo = enfileirarNaSaida(jogo, jogo.estado.lutadores[0], { vel: 80 });
  anda(jogo, 600);

  verdadeiro(alvo.escapando, 'escapando');
  verdadeiro(jogo.estado.lutadores.indexOf(alvo) !== -1, 'ainda no array durante a animacao');
  anda(jogo, 900);
  igual(jogo.estado.lutadores.indexOf(alvo), -1, 'saiu do array');
  falso(alvo.el.parentNode, 'saiu do DOM');
});

teste('bandeira escapando fica parada fora do anel', () => {
  const { jogo } = arena();
  const alvo = enfileirarNaSaida(jogo, jogo.estado.lutadores[0], { vel: 80 });
  anda(jogo, 600);
  verdadeiro(alvo.escapando, 'escapando');

  const x = alvo.x, y = alvo.y;
  anda(jogo, 2000);
  igual(alvo.x, x, 'nao volta a andar depois de sair');
  igual(alvo.y, y, 'nao volta a andar depois de sair');
});

teste('so a primeira a cruzar a abertura escapa; a segunda encontra parede', () => {
  const { jogo } = arena();
  jogo.parar();
  const flags = jogo.estado.todas.slice(0, 2);
  jogo.preparar(flags);
  jogo.iniciar();

  const [a, b] = jogo.estado.lutadores;
  /* as duas na fila, com o portao virado para elas, nao lado a lado */
  a.x = jogo.estado.cx; a.y = jogo.estado.cy - jogo.estado.raioJogador * 0.2;
  a.vx = 0; a.vy = -80;
  b.x = jogo.estado.cx; b.y = jogo.estado.cy - jogo.estado.raioJogador * 0.6;
  b.vx = 0; b.vy = -20;
  jogo.estado.abertura = 0;
  anda(jogo, 6000);

  verdadeiro(ateVitoria(jogo), 'a onda fecha');
  igual(jogo.estado.fase, jogo.FASE.VITORIA, 'fechou na primeira fuga');
  igual(jogo.estado.escaparam, 1, 'so uma escapou');
  igual(jogo.estado.lutadores.filter(l => !l.escapando).length, 1, 'a outra segue na arena');
});

teste('duas bandeiras nao vencem a corrida no mesmo quadro', () => {
  /* as duas atravessam o anel no mesmo instante: a segunda tem de ser barrada,
     porque depois da primeira fuga a abertura vira parede */
  const { jogo } = arena();
  jogo.parar();
  jogo.preparar(jogo.estado.todas.slice(0, 2));
  jogo.iniciar();
  const [a, b] = jogo.estado.lutadores;
  const e = jogo.estado;

  e.abertura = 0;
  a.x = e.cx + 0.0001; a.y = e.cy - e.R + 2; a.vx = 0; a.vy = -60;
  b.x = e.cx - 0.0001; b.y = e.cy - e.R + 2; b.vx = 0; b.vy = -60;
  anda(jogo, 1000);

  const fogem = [a, b].filter(l => l.escapando).length;
  igual(fogem, 1, 'so uma escapou no mesmo instante');
  igual(jogo.estado.restam, 1, 'restam 1 logo apos a fuga');
});

teste('a coroa so fecha depois que a fuga saiu do DOM', () => {
  /* enquanto a vencedora ainda voa para fora, a onda nao pode virar vitoria */
  const { jogo } = arena();
  const alvos = jogo.estado.lutadores;
  enfileirarNaSaida(jogo, alvos[0], { vel: 80 });
  anda(jogo, 600);

  const escapando = alvos.filter(l => l.escapando);
  verdadeiro(escapando.length >= 1, 'alguem fugiu: ' + escapando.length);
  igual(jogo.estado.fase, jogo.FASE.RODANDO, 'ainda nao coroou');
  igual(jogo.estado.campeao, null, 'sem campeao antes da hora');

  anda(jogo, 900);
  igual(jogo.estado.fase, jogo.FASE.VITORIA, 'coroou depois que a fugitiva saiu');
  igual(jogo.estado.lutadores.filter(l => l.escapando).length, 0, 'ninguem escapando no fim');
  igual(jogo.estado.campeao.id, alvos[0] ? escapando[0].flag.id : '', 'a campea e a que escapou');
  igual(jogo.estado.restam, CFG.lutadoresIniciais - 1, 'as outras seguem na arena');
});

teste('as bandeiras que escapam viram fantasma e somem do anel', () => {
  const s = arena();
  const jogo = s.jogo;
  const el = { arena: { clientWidth: 400 }, fantasmasEscaparam: criarElemento('div') };
  const j2 = s.sandbox.__criar(el);
  j2.definirTamanho(400);
  j2.preparar(s.flags);
  j2.iniciar();

  const alvo = enfileirarNaSaida(j2, j2.estado.lutadores[0], { vel: 80 });
  anda(j2, 600);
  igual(el.fantasmasEscaparam.children.length, 1, 'um fantasma');
  igual(el.fantasmasEscaparam.children[0].tagName, 'IMG', 'fantasma e' + ' imagem');
  anda(j2, 900);
  igual(j2.estado.lutadores.indexOf(alvo), -1, 'saiu da arena');
  verdadeiro(jogo.estado.lutadores.length === CFG.lutadoresIniciais, 'a outra arena segue com ' + jogo.estado.lutadores.length);
  verdadeiro(jogo.estado.fase === jogo.FASE.RODANDO, 'a outra arena segue rodando');
});

teste('o mural de fantasmas nao cresce sem limite', () => {
  const s = arena();
  const el = { arena: { clientWidth: 400 }, fantasmasEscaparam: criarElemento('div') };
  const j2 = s.sandbox.__criar(el);
  j2.definirTamanho(400);
  j2.preparar(s.flags);
  j2.iniciar();
  verdadeiro(ateVitoria(j2), 'convergiu');
  verdadeiro(el.fantasmasEscaparam.children.length <= 40, 'mural limitado: ' + el.fantasmasEscaparam.children.length);
  igual(el.fantasmasEscaparam.children.length, j2.estado.escaparam, 'um fantasma por fuga');
});

/* ---------------------------------------------------------------- */
/* vitoria                                                            */
/* ---------------------------------------------------------------- */

teste('a coroa de vitoria mostra a bandeira campea e some na onda nova', () => {
  const s = arena();
  const coroa = criarElemento('div');
  const icone = criarElemento('div');
  const nome = criarElemento('div');
  const legenda = criarElemento('div');
  const el = { arena: { clientWidth: 400 }, coroa, coroaIcone: icone, coroaNome: nome, coroaLegenda: legenda };

  const jogo = s.sandbox.__criar(el);
  jogo.definirTamanho(400);
  jogo.preparar(s.flags);
  jogo.iniciar();
  verdadeiro(coroa.hidden, 'a coroa comeca escondida');

  verdadeiro(ateVitoria(jogo), 'convergiu');
  falso(coroa.hidden, 'a coroa aparece na vitoria');

  const campea = jogo.estado.campeao;
  verdadeiro(campea, 'campeao definido');
  igual(nome.textContent, s.Bandeiras.exibir(campea.answer), 'o nome e' + ' o da campea, com inicial maiuscula');
  const img = icone.children[0];
  verdadeiro(img && img.tagName === 'IMG', 'a coroa mostra a bandeira como <img>');
  igual(img.src, campea.src, 'a imagem e' + ' a da campea');
  verdadeiro(legenda.textContent.indexOf('vence a rodada') !== -1, 'a legenda diz que venceu: ' + legenda.textContent);
  igual(coroa.atributos['data-tipo'], 'vencedora', 'tipo do painel');

  anda(jogo, CFG.duracaoCoroa + 100);
  verdadeiro(coroa.hidden, 'a coroa some quando a onda nova arranca');
});

/* ---------------------------------------------------------------- */
/* mural das vencedoras                                              */
/* ---------------------------------------------------------------- */

/* O motor desenha o mural sozinho, entao o teste monta a arena com os mesmos
   elementos que o index.html da: sem eles o motor simplesmente nao tem onde
   pintar e o teste passaria a medir nada. */
function arenaComMural(base) {
  const mural = {
    arena: { clientWidth: 400 },
    vencedorasLista: criarElemento('div'),
    vencedorasVazia: criarElemento('span'),
    vencedorasTotal: criarElemento('b')
  };
  const jogo = base.sandbox.__criar(mural);
  jogo.definirTamanho(400);
  jogo.preparar(base.flags);
  jogo.iniciar();
  return { jogo, mural };
}

function linhasDoMural(lista) {
  return lista.children.filter(c => c.classList.contains('vencedora'));
}

teste('o mural das vencedoras comeca vazio e guarda quem venceu cada onda', () => {
  const base = arena();
  const { jogo, mural } = arenaComMural(base);

  igual(linhasDoMural(mural.vencedorasLista).length, 0, 'mural vazio na largada');
  falso(mural.vencedorasVazia.hidden, 'o aviso de "nenhuma ainda" aparece');

  for (let i = 0; i < 3; i++) {
    verdadeiro(ateVitoria(jogo), 'onda ' + (i + 1) + ' fechou');
    const ultima = jogo.estado.vencidas[jogo.estado.vencidas.length - 1];
    igual(jogo.estado.vencidas.length, i + 1, 'uma entrada por onda coroada');
    igual(ultima.onda, i + 1, 'a entrada guarda o numero da onda');
    igual(ultima.flag.id, jogo.estado.campeao.id, 'a entrada e' + ' a campea daquele momento');
    verdadeiro(mural.vencedorasVazia.hidden, 'depois de coroar o aviso de vazio some');
    anda(jogo, CFG.duracaoCoroa + 100);
  }
});

teste('quem ganha duas ondas vira uma linha so, com o placado', () => {
  const base = arena();
  const { jogo, mural } = arenaComMural(base);

  for (let i = 0; i < 4; i++) {
    verdadeiro(ateVitoria(jogo), 'onda ' + (i + 1) + ' fechou');
    anda(jogo, CFG.duracaoCoroa + 100);
  }

  const distintas = new Set(jogo.estado.vencidas.map(v => v.flag.id)).size;
  const linhas = linhasDoMural(mural.vencedorasLista);
  igual(linhas.length, distintas, 'uma linha por BANDEIRA, nao por vitoria');
  verdadeiro(distintas <= 4, 'sao poucas linhas para testar o agrupamento');

  /* os placados somam as ondas coroadas: e' o que impede a linha de mentir */
  let soma = 0;
  for (const c of linhas) {
    const x = c.children.find(n => n.classList.contains('vencedora-vezes'));
    soma += x ? Number(x.textContent.slice(1)) : 1;
  }
  igual(soma, jogo.estado.vencidas.length, 'placados somam as ondas coroadas');
  igual(mural.vencedorasTotal.textContent, String(jogo.estado.vencidas.length), 'total no rotulo');
});

teste('a linha mais recente e a da ultima onda, e traz a bandeira', () => {
  const base = arena();
  const { jogo, mural } = arenaComMural(base);

  verdadeiro(ateVitoria(jogo), 'onda 1 fechou');
  anda(jogo, CFG.duracaoCoroa + 100);
  verdadeiro(ateVitoria(jogo), 'onda 2 fechou');

  const ultima = jogo.estado.vencidas[jogo.estado.vencidas.length - 1];
  const primeira = mural.vencedorasLista.children[0];
  verdadeiro(primeira.classList.contains('vencedora--recente'), 'a ultima vencedora e' + ' a destacada');
  const img = primeira.querySelector('img');
  verdadeiro(img, 'a linha carrega a bandeira');
  igual(img.src, ultima.flag.src, 'e' + ' a bandeira da ultima onda');

  /* o mural mostra o mesmo nome que a coroa: inicial em maiuscula nas duas */
  const rotulo = primeira.children.find(n => n.classList.contains('vencedora-nome'));
  igual(rotulo.textContent, base.Bandeiras.exibir(ultima.flag.answer), 'rotulo em forma de exibicao');
  igual(img.alt, rotulo.textContent, 'alt e rotulo concordam');

  /* o mural e' historico: quem ganhou a onda 1 nao pode sumir quando a 2 acaba */
  const campea1 = jogo.estado.vencidas[0].flag.src;
  const aindaEsta = mural.vencedorasLista.children.some(c => {
    const i = c.querySelector('img');
    return i && i.src === campea1;
  });
  verdadeiro(aindaEsta, 'a campea da primeira onda continua no mural');
});

teste('o mural corta o que nao cabe e conta o resto em +N', () => {
  const base = arena();
  const { jogo, mural } = arenaComMural(base);

  /* enche o mural com uma entrada por bandeira. O motor redesenha tudo a cada
     coroa, entao a onda seguinte ja formata a lista cheia de verdade. */
  base.flags.slice(0, CFG.vencedorasVisiveis + 3).forEach((f, i) => {
    jogo.estado.vencidas.push({ onda: i + 1, flag: f });
  });
  verdadeiro(ateVitoria(jogo), 'a onda fecha e redesenha o mural');

  const distintas = new Set(jogo.estado.vencidas.map(v => v.flag.id)).size;
  verdadeiro(distintas > CFG.vencedorasVisiveis, 'o teste precisa de mais bandeiras que a faixa');

  const linhas = linhasDoMural(mural.vencedorasLista);
  igual(linhas.length, CFG.vencedorasVisiveis, 'so as que cabem na faixa');
  igual(mural.vencedorasLista.children.length, CFG.vencedorasVisiveis + 1, 'mais o contador do resto');

  const resto = mural.vencedorasLista.children[CFG.vencedorasVisiveis];
  verdadeiro(resto.classList.contains('vencedoras-resto'), 'o resto e' + ' um contador');
  igual(resto.textContent, '+' + (distintas - CFG.vencedorasVisiveis), 'quantas ficaram de fora');
  verdadeiro(resto.title.length > 0, 'o resto diz quem ficou de fora');
});

teste('reiniciar a arena limpa o mural junto com a campea', () => {
  const base = arena();
  const { jogo, mural } = arenaComMural(base);

  verdadeiro(ateVitoria(jogo), 'a onda fechou');
  verdadeiro(jogo.estado.vencidas.length > 0, 'o mural tem historico');

  jogo.reiniciar();
  igual(jogo.estado.onda, 1, 'voltou a onda 1');
  igual(jogo.estado.vencidas.length, 0, 'placar limpo');
  igual(linhasDoMural(mural.vencedorasLista).length, 0, 'mural limpo na tela');
  falso(mural.vencedorasVazia.hidden, 'o aviso de vazio volta');
});

teste('o mural vive no cabecalho e o app sabe falar com ele', () => {
  const html = lidos['index.html'];
  const topo = /<header class="topo">([\s\S]*?)<\/header>/.exec(html);
  verdadeiro(topo, 'existe o cabecalho');
  verdadeiro(/id="vencedoras"/.test(topo[1]), 'o mural esta no cabecalho');
  verdadeiro(/id="vencedoras-lista"/.test(html), 'existe a lista do mural');
  verdadeiro(/id="vencedoras-vazia"/.test(html), 'existe o aviso de mural vazio');
  verdadeiro(/id="vencedoras-total"/.test(html), 'existe o total de ondas');

  /* o motor desenha o mural sozinho, entao o app so' entrega os elementos */
  for (const id of ['vencedoras-lista', 'vencedoras-vazia', 'vencedoras-total']) {
    verdadeiro(lidos['js/app.js'].indexOf(id) !== -1, 'app.js liga ' + id);
  }

  /* o mural nao pode engolir o cabecalho: a lista e' a unica parte que encolhe */
  const lista = blocoCss(lidos['styles.css'], '.vencedoras-lista');
  verdadeiro(lista, 'existe a regra .vencedoras-lista');
  verdadeiro(/overflow\s*:\s*hidden/.test(lista), 'a lista e' + ' a parte que corta');
  verdadeiro(/min-width\s*:\s*0/.test(lista), 'a lista pode encolher dentro do flex');
});

teste('a parede de vencedoras enche sozinha durante a partida', () => {
  const s = sandboxDoApp();
  const lista = s.__porId.get('vencedoras-lista');
  const vazia = s.__porId.get('vencedoras-vazia');

  igual(lista.children.length, 0, 'mural vazio no boot');
  falso(vazia.hidden, 'o aviso de "nenhuma ainda" aparece no boot');

  const jogo = s.__jogo;
  s.__porId.get('btn-iniciar').click();
  for (let i = 0; i < 2; i++) {
    verdadeiro(ateVitoria(jogo), 'onda ' + (i + 1) + ' fechou');
    anda(jogo, CFG.duracaoCoroa + 100);
  }

  verdadeiro(lista.children.length > 0, 'o mural ganhou linha');
  verdadeiro(vazia.hidden, 'o aviso de vazio some');
  igual(s.__porId.get('vencedoras-total').textContent, '2', 'total de ondas coroadas');

  /* trocar de colecao nao pode deixar vinculo do mural antigo */
  s.escolherPasta([{ name: 'a.svg', size: 1, type: 'image/svg+xml' }]);
  igual(lista.children.length, 0, 'mural limpo com a colecao nova');
  igual(s.__porId.get('vencedoras-total').textContent, '', 'contagem zerada com a colecao');
});

/* ---------------------------------------------------------------- */
/* ondas seguintes                                                    */
/* ---------------------------------------------------------------- */

teste('apos a coroa entra uma onda nova com a campea', () => {
  const { jogo } = arena();
  verdadeiro(ateVitoria(jogo), 'primeira onda fechou');
  const campea = jogo.estado.campeao;

  anda(jogo, CFG.duracaoCoroa + 100);
  igual(jogo.estado.fase, jogo.FASE.RODANDO, 'voltou a rodar');
  igual(jogo.estado.onda, 2, 'onda 2');
  igual(jogo.estado.lutadores.length, CFG.lutadoresIniciais, 'lutadores de novo');
  igual(jogo.estado.escaparam, 0, 'fugas zeradas');

  const naOnda = jogo.estado.lutadores.find(l => l.flag.id === campea.id);
  verdadeiro(naOnda, 'a campea voltou');
  verdadeiro(naOnda.campeao, 'marcada como campea');
  verdadeiro(naOnda.el.classList.contains('lutador--campeao'), 'classe de campea');
  verdadeiro(naOnda.el.title.includes('campeã'), 'titulo diz campeã');
});

teste('a campea volta sempre na onda seguinte', () => {
  const { jogo } = arena();
  const vistas = [];
  for (let i = 0; i < 3; i++) {
    verdadeiro(ateVitoria(jogo), 'onda ' + (i + 1) + ' fechou');
    const campea = jogo.estado.campeao;
    verdadeiro(campea, 'campeao na onda ' + (i + 1));
    verdadeiro(jogo.estado.todas.some(f => f.id === campea.id), 'a campea veio da colecao');

    anda(jogo, CFG.duracaoCoroa + 100);
    igual(jogo.estado.fase, jogo.FASE.RODANDO, 'onda ' + (i + 2) + ' comecou');
    /* a vencedora da onda anterior entra na nova, sempre na primeira posicao */
    igual(jogo.estado.lutadores[0].flag.id, campea.id, 'a campea da onda ' + (i + 1) + ' volta');
    igual(jogo.estado.restam, CFG.lutadoresIniciais, 'a onda nova enche o ringue');
  }
  igual(jogo.estado.onda, 4, 'quatro ondas depois');
});

teste('a colecao de uma unica bandeira escapa e fica na vitoria', () => {
  const s = arena([{ id: 'so', answer: 'so', aliases: ['so'], src: 'flags/so.svg' }]);
  igual(s.jogo.estado.lutadores.length, 1, 'um lutador');
  enfileirarNaSaida(s.jogo, s.jogo.estado.lutadores[0], { vel: 80 });
  anda(s.jogo, 1500);
  igual(s.jogo.estado.fase, s.jogo.FASE.VITORIA, 'coroado ao escapar');
  igual(s.jogo.estado.campeao.id, 'so', 'campea');
  anda(s.jogo, CFG.duracaoCoroa * 3);
  igual(s.jogo.estado.fase, s.jogo.FASE.VITORIA, 'continua parado na vitoria');
  igual(s.jogo.estado.onda, 1, 'sem onda nova');
});

teste('varias ondas seguidas mantem as contagens coerentes', () => {
  const { jogo } = arena();
  for (let i = 0; i < 4; i++) {
    verdadeiro(ateVitoria(jogo), 'onda ' + (i + 1));
    igual(jogo.estado.escaparam, 1, 'escapou 1');
    igual(jogo.estado.restam, CFG.lutadoresIniciais - 1, 'restam ' + (CFG.lutadoresIniciais - 1));
    anda(jogo, CFG.duracaoCoroa + 100);
  }
});

teste('a mesma semente produz a mesma partida', () => {
  const rodar1 = () => {
    const { jogo } = arenaDe(null, 42);
    verdadeiro(ateVitoria(jogo), 'convergiu');
    const ids = jogo.estado.lutadores.map(l => l.flag.id);
    return { campeao: jogo.estado.campeao.id, ids: ids.join('|'), onda: jogo.estado.onda };
  };
  const a = rodar1();
  const b = rodar1();
  igual(a.campeao, b.campeao, 'mesmo campeao');
  igual(a.ids, b.ids, 'mesmas bandeiras');
  igual(a.onda, b.onda, 'mesma onda');
});

teste('parar interrompe a arena', () => {
  const { jogo } = arena();
  const antes = jogo.estado.lutadores.map(l => ({ x: l.x, y: l.y }));
  jogo.parar();
  anda(jogo, 3000);
  igual(jogo.estado.fase, jogo.FASE.PRONTO, 'fase parada');
  for (let i = 0; i < antes.length; i++) {
    igual(jogo.estado.lutadores[i].x, antes[i].x, 'ninguem andou');
    igual(jogo.estado.lutadores[i].y, antes[i].y, 'ninguem andou');
  }
});

/* ---------------------------------------------------------------- */
/* app.js: boot, pasta e revogacao                                    */
/* ---------------------------------------------------------------- */

function sandboxDoApp() {
  const s = montarContexto(11);
  s.sembrar(11);

  /* a tela que app.js procura por id */
  const porId = new Map();

  /* Todo elemento ganha um gravador generico de ouvintes, para que um teste
     possa disparar `input` de um slider ou `click` de um botao sem o sandbox
     precisar conhecer o nome de cada um: `s.__ouvintes['cfg-anel'].input()`.
     Um gravador por id e por evento — sobrescreve, porque nenhum elemento da
     tela real tem dois ouvintes do mesmo evento para o mesmo efeito. */
  const ouvintes = {};
  for (const id of IDS_DA_TELA) {
    const no = criarElemento('div');
    ouvintes[id] = {};
    no.addEventListener = (nome, fn) => { ouvintes[id][nome] = fn; };
    porId.set(id, no);
  }
  porId.get('arena').clientWidth = 400;
  porId.get('arena').style = {};

  const input = porId.get('input-pasta');
  input.value = '';
  input.files = [];
  input.click = function () {};

  porId.get('btn-reiniciar').click = function () {
    if (ouvintes['btn-reiniciar'].click) ouvintes['btn-reiniciar'].click();
  };
  porId.get('btn-iniciar').click = function () {
    if (ouvintes['btn-iniciar'].click) ouvintes['btn-iniciar'].click();
  };

  /* app.js escreve as custom properties em document.documentElement — sem este
     no o `--anel-raio` e o `--arena-escala` seriam descartados em silencio e os
     testes de cena nao teriam onde olhar. */
  s.document.documentElement = criarElemento('html');
  s.document.documentElement.style = {};
  s.document.getElementById = (id) => porId.get(id) || null;

  /* app.js tambem escuta `keydown` no document (o Escape fecha o painel) */
  ouvintes['#document'] = { addEventListener: null };
  s.document.addEventListener = (nome, fn) => { ouvintes['#document'].addEventListener = fn; };

  s.revogados = new Set();
  s.nURL = 0;
  s.URL = {
    createObjectURL: () => 'blob:' + (++s.nURL),
    revokeObjectURL: u => s.revogados.add(u)
  };

  /* simula o "carregar pasta" escolhendo arquivos */
  s.escolherPasta = (arquivos, raiz = 'bandeiras') => {
    const comCaminho = arquivos.map(f => Object.assign({ webkitRelativePath: raiz + '/' + f.name }, f));
    input.files = comCaminho;
    if (ouvintes['input-pasta'].change) ouvintes['input-pasta'].change();
    input.value = '';
  };

  s.FLAG_MANIFEST = MANIFEST;
  rodar(s, ARQUIVOS);
  s.__criar = (el) => { const j = s.FlagQuiz.criarJogo(el); j.__sb = s; return j; };

  /* captura o jogo que o app cria, sem tocar no codigo de producao */
  const criarJogo = s.FlagQuiz.criarJogo;
  s.__jogo = null;
  s.FlagQuiz.criarJogo = function (el) {
    const j = criarJogo(el);
    j.__sb = s;
    s.__jogo = j;
    return j;
  };

  vm.runInContext(lidos['js/app.js'], s, { filename: 'js/app.js' });
  s.__porId = porId;
  s.__ouvintes = ouvintes;
  if (s.__jogo) s.__jogo.__sb = s;
  return s;
}

teste('o boot monta a arena parada e o Iniciar comeca a batalha', () => {
  const s = sandboxDoApp();
  verdadeiro(s.__jogo, 'o app criou um jogo');
  igual(s.__jogo.estado.onda, 1, 'onda 1');
  igual(s.__jogo.estado.fase, s.__jogo.FASE.PRONTO, 'parada, esperando o Iniciar');
  falso(s.__porId.get('iniciar').hidden, 'o botao Iniciar aparece');
  verdadeiro(s.__porId.get('lutadores').children.length > 0, 'lutadores no DOM');
  igual(s.__porId.get('contador-restam').textContent, String(CFG.lutadoresIniciais), 'contador de resto');
  igual(s.__porId.get('contador-escaparam').textContent, '0', 'contador de escapadas');
  igual(s.__porId.get('onda').textContent, '1', 'onda na tela');

  /* parada de verdade: o tempo passa e ninguem sai do lugar */
  const antes = s.__jogo.estado.lutadores.map(l => l.x + ',' + l.y).join('|');
  anda(s.__jogo, 3000);
  igual(s.__jogo.estado.lutadores.map(l => l.x + ',' + l.y).join('|'), antes, 'nada se mexe antes do Iniciar');

  s.__porId.get('btn-iniciar').click();
  igual(s.__jogo.estado.fase, s.__jogo.FASE.RODANDO, 'rodando depois do Iniciar');
  verdadeiro(s.__porId.get('iniciar').hidden, 'o botao some ao iniciar');
  anda(s.__jogo, 500);
  verdadeiro(s.__jogo.estado.lutadores.map(l => l.x + ',' + l.y).join('|') !== antes, 'agora se mexem');
});

teste('toda bandeira tem imagem e posicao valida', () => {
  const s = sandboxDoApp();
  const jogo = s.__jogo;
  const alvos = s.__porId.get('lutadores').children;
  verdadeiro(alvos.length >= CFG.lutadoresIniciais, 'todos os lutadores no DOM');
  for (const no of alvos) {
    const img = no.querySelector('img');
    verdadeiro(img, 'cada lutador tem <img>');
    verdadeiro(typeof img.src === 'string' && img.src.length > 0, 'img com src');
    verdadeiro(no.atributos['data-id'], 'lutador com data-id');
  }
  igual(jogo.estado.lutadores.length, alvos.length, 'DOM e estado batem');

  /* a posicao so' vira transform depois do primeiro quadro pintado */
  anda(jogo, 100);
  for (const no of alvos) {
    verdadeiro(no.style.transform.indexOf('translate3d') === 0, 'posicao no transform: ' + no.style.transform);
    falso(/\bNaN\b/.test(no.style.transform), 'sem NaN no transform: ' + no.style.transform);
  }
});

teste('trocar de pasta troca a colecao e revoga as URLs velha', () => {
  const s = sandboxDoApp();
  const jogo = s.__jogo;
  const antes = jogo.estado.todas.map(f => f.id);
  verdadeiro(antes.length > 5, 'manifest carregado antes');

  s.escolherPasta([
    { name: 'reino-unido.svg', size: 10, type: 'image/svg+xml' },
    { name: 'suica.png', size: 10, type: 'image/png' },
    { name: 'leia-me.txt', size: 10, type: 'text/plain' }
  ]);

  const depois = jogo.estado.todas.map(f => f.id);
  igual(depois.length, 2, 'so as duas imagens');
  verdadeiro(depois.indexOf('reino-unido') !== -1, 'tem reino unido');
  verdadeiro(depois.indexOf('suica') !== -1, 'tem suica');
  falso(depois.indexOf('notas') !== -1, 'txt fora');

  /* o manifest do projeto nao usa object URL, entao nao ha blob a revogar;
     quem tem blob e' a pasta anterior, vista no teste seguinte */
  igual(s.revogados.size, 0, 'manifest nao tinha blob para revogar');
  for (const f of jogo.estado.todas) {
    verdadeiro(f.origem === 'pasta', 'marcada como da pasta');
    verdadeiro(String(f.urlObravelho).indexOf('blob:') === 0, 'URL de objeto: ' + f.urlObravelho);
  }
  igual(jogo.estado.lutadores.length, 2, 'o anel encheu com a colecao nova');
});

teste('trocar de pasta de novo nao' + ' quebra', () => {
  const s = sandboxDoApp();
  s.escolherPasta([{ name: 'a.svg', size: 1, type: 'image/svg+xml' }]);
  const blobA = s.__jogo.estado.todas[0].urlObravelho;
  igual(s.__jogo.estado.todas[0].id, 'a', 'primeira pasta');

  s.escolherPasta([{ name: 'b.svg', size: 1, type: 'image/svg+xml' }]);
  const blobB = s.__jogo.estado.todas[0].urlObravelho;
  igual(s.__jogo.estado.todas.length, 1, 'ultima pasta vale');
  igual(s.__jogo.estado.todas[0].id, 'b', 'e a ultima');
  verdadeiro(s.revogados.has(blobA), 'a URL da primeira pasta foi revogada');
  falso(s.revogados.has(blobB), 'a URL da ultima pasta continua viva');
});

teste('o aviso de erro aparece quando a pasta nao' + ' traz bandeiras', () => {
  const s = sandboxDoApp();
  s.escolherPasta([{ name: 'leia-me.txt', size: 1, type: 'text/plain' }]);
  const aviso = s.__porId.get('aviso');
  falso(aviso.hidden, 'aviso visivel');
  igual(s.__jogo.estado.todas.length, MANIFEST.length, 'colecao do projeto mantida');
});

teste('change sem arquivos nao explode', () => {
  const s = sandboxDoApp();
  const jogo = s.__jogo;
  const antes = jogo.estado.todas.length;
  s.escolherPasta([]);
  igual(jogo.estado.todas.length, antes, 'colecao intacta');
  igual(jogo.estado.fase, jogo.FASE.PRONTO, 'continua esperando o Iniciar');
});

teste('o botao de reiniciar volta a onda 1', () => {
  const s = sandboxDoApp();
  s.__porId.get('btn-iniciar').click();
  anda(s.__jogo, 6000);
  s.__porId.get('btn-reiniciar').click();
  igual(s.__jogo.estado.onda, 1, 'onda 1');
  igual(s.__jogo.estado.campeao, null, 'campeao limpo');
  igual(s.__jogo.estado.fase, s.__jogo.FASE.PRONTO, 'volta a esperar o Iniciar');
  falso(s.__porId.get('iniciar').hidden, 'o botao Iniciar volta');
});

teste('a colecao curta avisa que a arena fica curta', () => {
  const s = sandboxDoApp();
  s.escolherPasta([{ name: 'a.svg', size: 1, type: 'image/svg+xml' }]);
  const cfg = s.__porId.get('config-info');
  verdadeiro(cfg.textContent.indexOf('1 bandeira') === 0, 'contagem na tela: ' + cfg.textContent);
  verdadeiro(cfg.textContent.indexOf('pasta') !== -1, 'origem na tela');
  igual(s.__jogo.estado.lutadores.length, 1, 'uma lutadora');
  igual(s.__jogo.estado.fase, s.__jogo.FASE.PRONTO, 'so ela, esperando o Iniciar');
});

teste('o aviso do file:// aparece quando abre local', () => {
  const s = sandboxDoApp();
  falso(s.__porId.get('aviso').hidden, 'aviso do file://');
  verdadeiro(s.__porId.get('aviso').textContent.length > 0, 'com texto');
});

/* ---------------------------------------------------------------- */
/* o portao desenhado bate com o portao da fisica                   */
/* ---------------------------------------------------------------- */

teste('o portao desenhado tem o mesmo tamanho angular da regra', () => {
  const anel = anelDeR(182);
  arenaDe(null, 1, { arenaAnelGiro: anel });

  const perimetro = 2 * Math.PI * 182;
  const [arco, folga] = anel.getAttribute('stroke-dasharray').split(/\s+/).map(Number);
  perto(arco + folga, perimetro, 1e-3, 'o tracejado cobre o perimetro todo');
  /* o folgo tem de ser o arco correspondente a 2x a meia-abertura */
  const esperado = 2 * CFG.aberturaMeiaLargura * 182;
  perto(folga, esperado, 1e-3, 'o folgo e' + ' o angulo da regra');
});

teste('o folgo do portao fica centrado no topo, onde esta a seta', () => {
  /* se o offset escorregasse meio arco, o desenho marcava a fresta noutro
     sitio e a bandeira atravessava parede — ou, pior, a fresta desenhada
     ficava onde nao ha' saida */
  const anel = anelDeR(182);
  arenaDe(null, 1, { arenaAnelGiro: anel });

  const perimetro = 2 * Math.PI * 182;
  const [arco, folga] = anel.getAttribute('stroke-dasharray').split(/\s+/).map(Number);
  const offset = Number(anel.getAttribute('stroke-dashoffset'));

  /* o folga comeca em `arco - offset` e acaba `folga` depois; em espaco de
     perimetro, o topo do <g> esta' em 3/4 da volta */
  const inicioFolga = (arco - offset) % perimetro;
  const centroFolga = (inicioFolga + folga / 2) % perimetro;
  const topo = perimetro * 0.75;
  const dif = Math.abs(((centroFolga - topo + perimetro / 2) % perimetro) - perimetro / 2);
  perto(dif, 0, 1e-6, 'o centro do folgo e' + ' o topo');
});

teste('o tracejado sobrevive a mudar o raio do anel', () => {
  /* o r e' lido do elemento, nao copiado do CFG: se o desenho mudar de
     tamanho, o portao tem de mudar com ele */
  const anel = anelDeR(182);
  const { jogo } = arenaDe(null, 1, { arenaAnelGiro: anel });
  const grande = anel.getAttribute('stroke-dasharray');

  anel.setAttribute('r', '91');
  jogo.definirTamanho(400);
  const pequeno = anel.getAttribute('stroke-dasharray');

  falso(grande === pequeno, 'o portao acompanhou o raio');
  const [a1, f1] = grande.split(/\s+/).map(Number);
  const [a2, f2] = pequeno.split(/\s+/).map(Number);
  perto((a1 + f1) / (a2 + f2), 2, 1e-6, 'o perimetro dobrou ao dobrar o raio');
});

/* ---------------------------------------------------------------- */
/* modos de jogo, obstaculos, mural vertical e Ajustes em aba         */
/* ---------------------------------------------------------------- */

/* Fecha a onda atual: poe a primeira bandeira que ainda esta na arena em fila
   para a abertura e deixa o tempo correr ate' a fuga sair do DOM. */
function fecharOnda(jogo) {
  const alvo = jogo.estado.lutadores.find(l => !l.escapando);
  enfileirarNaSaida(jogo, alvo, { vel: 80 });
  anda(jogo, 1500);
  return alvo.flag;
}

function arenaPequena(n) {
  const s = arena(MANIFEST.slice(0, n));
  const fins = [];
  s.jogo.on('fim', d => fins.push(d));
  s.fins = fins;
  return s;
}

teste('modo "quem escapa vence": a que escapa e' + ' coroada e volta na rodada seguinte', () => {
  const { jogo } = arena();
  igual(jogo.CFG.modo, 'vencedora', 'e o modo padrao');
  const escapou = fecharOnda(jogo);
  igual(jogo.estado.fase, jogo.FASE.VITORIA, 'rodada fechada');
  igual(jogo.estado.campeao.id, escapou.id, 'a que escapou e a vencedora');
  igual(jogo.estado.vencidas.length, 1, 'entrou no mural');
  anda(jogo, CFG.duracaoCoroa + 100);
  igual(jogo.estado.lutadores[0].flag.id, escapou.id, 'volta defendendo o titulo');
});

teste('modo "quem escapa e eliminada": nao ha campea e a eliminada sai da rodada seguinte', () => {
  const { jogo } = arena();
  jogo.CFG.modo = 'eliminacao';
  jogo.CFG.vencedorasVoltam = false;
  const escapou = fecharOnda(jogo);
  igual(jogo.estado.campeao, null, 'ninguem defende titulo na eliminacao');
  igual(jogo.estado.vencidas[0].modo, 'eliminacao', 'o mural registra como eliminada');
  anda(jogo, CFG.duracaoCoroa + 100);
  igual(jogo.estado.fase, jogo.FASE.RODANDO, 'rodada nova');
  falso(jogo.estado.lutadores.some(l => l.flag.id === escapou.id), 'a eliminada nao volta');
});

teste('eliminacao sem repeticao: a ultima que sobra e a campea', () => {
  const s = arenaPequena(3);
  const { jogo } = s;
  jogo.CFG.modo = 'eliminacao';
  jogo.CFG.vencedorasVoltam = false;
  const e1 = fecharOnda(jogo);
  anda(jogo, CFG.duracaoCoroa + 100);
  const e2 = fecharOnda(jogo);
  anda(jogo, CFG.duracaoCoroa + 100);

  igual(s.fins.length, 1, 'avisou o fim uma vez');
  igual(s.fins[0].motivo, 'bandeiras', 'acabaram as bandeiras');
  igual(s.fins[0].tipo, 'campea', 'a que sobrou e campea');
  const ids = [e1.id, e2.id, s.fins[0].flag.id].sort();
  igual(new Set(ids).size, 3, 'as tres sao diferentes: duas eliminadas e uma campea');
  igual(jogo.estado.onda, 2, 'nao comecou uma terceira rodada');
});

teste('vencedora sem repeticao: a ultima que sobra e a derrotada', () => {
  const s = arenaPequena(3);
  const { jogo } = s;
  jogo.CFG.vencedorasVoltam = false;
  const v1 = fecharOnda(jogo);
  anda(jogo, CFG.duracaoCoroa + 100);
  const v2 = fecharOnda(jogo);
  anda(jogo, CFG.duracaoCoroa + 100);

  igual(s.fins.length, 1, 'avisou o fim uma vez');
  igual(s.fins[0].tipo, 'derrotada', 'a que sobrou nunca escapou');
  verdadeiro(s.fins[0].flag.id !== v1.id && s.fins[0].flag.id !== v2.id, 'nao e nenhuma das vencedoras');
});

teste('o painel final mostra o tipo e a legenda certos', () => {
  const s = arena(MANIFEST.slice(0, 2));
  const coroa = criarElemento('div');
  const legenda = criarElemento('div');
  const nome = criarElemento('div');
  const jogo = s.sandbox.__criar({ arena: { clientWidth: 400 }, coroa, coroaLegenda: legenda, coroaNome: nome, coroaIcone: criarElemento('div') });
  jogo.definirTamanho(400);
  jogo.preparar(s.flags.slice(0, 2));
  jogo.CFG.modo = 'eliminacao';
  jogo.CFG.vencedorasVoltam = false;
  jogo.iniciar();
  fecharOnda(jogo);
  igual(coroa.atributos['data-tipo'], 'eliminada', 'durante a rodada: eliminada');
  verdadeiro(legenda.textContent.indexOf('eliminada') !== -1, 'legenda: ' + legenda.textContent);
  anda(jogo, CFG.duracaoCoroa + 100);
  igual(coroa.atributos['data-tipo'], 'campea', 'no fim: campea');
  verdadeiro(legenda.textContent.indexOf('sobreviveu') !== -1, 'legenda: ' + legenda.textContent);
});

teste('o titulo do mural muda com o modo', () => {
  const s = arena();
  const titulo = criarElemento('span');
  const jogo = s.sandbox.__criar({ arena: { clientWidth: 400 }, vencedorasTitulo: titulo, vencedorasLista: criarElemento('div') });
  jogo.definirTamanho(400);
  jogo.preparar(s.flags);
  jogo.repintarMural();
  igual(titulo.textContent, 'vencedoras', 'padrao');
  jogo.CFG.modo = 'eliminacao';
  jogo.repintarMural();
  igual(titulo.textContent, 'eliminadas', 'eliminacao');
});

/* ---------- Iniciar ---------- */

teste('pronto() monta a arena parada e comecar() so inicia a partir dela', () => {
  const { jogo } = arena();
  jogo.pronto();
  igual(jogo.estado.fase, jogo.FASE.PRONTO, 'parada');
  igual(jogo.estado.lutadores.length, CFG.lutadoresIniciais, 'bandeiras montadas');
  const antes = jogo.estado.lutadores.map(l => l.x).join();
  anda(jogo, 2000);
  igual(jogo.estado.lutadores.map(l => l.x).join(), antes, 'ninguem anda antes de comecar');
  jogo.comecar();
  igual(jogo.estado.fase, jogo.FASE.RODANDO, 'rodando');
  anda(jogo, 300);
  verdadeiro(jogo.estado.lutadores.map(l => l.x).join() !== antes, 'agora andam');
});

teste('reiniciar(true) volta ao estado de espera', () => {
  const { jogo } = arena();
  fecharOnda(jogo);
  jogo.reiniciar(true);
  igual(jogo.estado.fase, jogo.FASE.PRONTO, 'esperando');
  igual(jogo.estado.onda, 1, 'onda 1');
  igual(jogo.estado.vencidas.length, 0, 'mural limpo');
});

/* ---------- obstaculos ---------- */

function comObstaculo(tipo, colecao) {
  const s = arena(colecao);
  const { jogo } = s;
  jogo.CFG.obstaculo = tipo;
  jogo.definirTamanho(400);
  return s;
}

teste('obstaculos: "nenhum" e o padrao e cada tipo monta a quantidade certa', () => {
  const { jogo } = arena();
  igual(jogo.CFG.obstaculo, 'nenhum', 'padrao');
  igual(jogo.estado.obstaculos.length, 0, 'nada na arena');
  const esperado = { pino: 1, 'tres-pinos': 3, hexagono: 7, barra: 1, cruz: 2, 'tres-cruzes': 6 };
  for (const tipo of Object.keys(esperado)) {
    jogo.CFG.obstaculo = tipo;
    jogo.definirTamanho(400);
    igual(jogo.estado.obstaculos.length, esperado[tipo], tipo);
  }
  jogo.CFG.obstaculo = 'nenhum';
  jogo.definirTamanho(400);
  igual(jogo.estado.obstaculos.length, 0, 'voltar a nenhum limpa');
});

teste('obstaculos: a bandeira rebate no pino e nunca o atravessa', () => {
  const { jogo } = comObstaculo('pino', MANIFEST.slice(0, 2));
  const e = jogo.estado;
  const [a, b] = e.lutadores;
  /* a vem da esquerda rumo ao pino central; b fica parada longe, no canto */
  a.x = e.cx - e.raioJogador * 0.8; a.y = e.cy; a.vx = 90; a.vy = 0;
  b.x = e.cx + e.raioJogador * 0.7; b.y = e.cy + e.raioJogador * 0.5; b.vx = 0; b.vy = 0;
  const rf = e.lado * jogo.CFG.diametroLutador / 2;
  const pino = e.obstaculos[0];
  let refletiu = false;
  for (let i = 0; i < 80; i++) {
    anda(jogo, 16);
    const d = Math.hypot(a.x - (e.cx + pino.x), a.y - (e.cy + pino.y));
    verdadeiro(d >= pino.r + rf - 1e-6, 'penetrou o pino: ' + d);
    if (a.vx < 0) refletiu = true;
  }
  verdadeiro(refletiu, 'a velocidade foi refletida');
});

teste('obstaculos: a barra gira e empurra pela superficie em movimento', () => {
  const { jogo } = comObstaculo('barra', MANIFEST.slice(0, 2));
  const e = jogo.estado;
  const ang0 = e.obstaculos[0].ang;
  anda(jogo, 1000);
  verdadeiro(Math.abs(e.obstaculos[0].ang - ang0) > 0.5, 'o angulo mudou: ' + (e.obstaculos[0].ang - ang0));
  /* nenhuma bandeira fica dentro da capsula */
  const rf = e.lado * jogo.CFG.diametroLutador / 2;
  for (let i = 0; i < 120; i++) {
    anda(jogo, 16);
    for (const l of e.lutadores) {
      if (l.escapando) continue;
      const o = e.obstaculos[0];
      const ux = Math.cos(o.ang), uy = Math.sin(o.ang);
      let t = (l.x - e.cx) * ux + (l.y - e.cy) * uy;
      t = Math.max(-o.meia, Math.min(o.meia, t));
      const d = Math.hypot(l.x - (e.cx + ux * t), l.y - (e.cy + uy * t));
      verdadeiro(d >= o.r + rf - 1e-3, 'bandeira dentro da barra: ' + d);
    }
  }
});

teste('obstaculos: ninguem nasce dentro de um obstaculo', () => {
  for (const tipo of ['pino', 'tres-pinos', 'hexagono', 'barra', 'cruz', 'tres-cruzes']) {
    const s = arena();
    s.jogo.CFG.obstaculo = tipo;
    s.jogo.definirTamanho(400);
    s.jogo.pronto();
    const e = s.jogo.estado;
    const rf = e.lado * s.jogo.CFG.diametroLutador / 2;
    for (const l of e.lutadores) {
      for (const o of e.obstaculos) {
        let qx = e.cx + o.x, qy = e.cy + o.y;
        if (o.t === 'barra') {
          const ux = Math.cos(o.ang), uy = Math.sin(o.ang);
          const t = Math.max(-o.meia, Math.min(o.meia, (l.x - qx) * ux + (l.y - qy) * uy));
          qx += ux * t; qy += uy * t;
        }
        verdadeiro(Math.hypot(l.x - qx, l.y - qy) >= o.r + rf - 1e-6, tipo + ': nasceu dentro do obstaculo');
      }
    }
  }
});

teste('obstaculos nao impedem a onda de terminar', () => {
  for (const tipo of ['tres-pinos', 'cruz', 'tres-cruzes']) {
    const s = arena();
    s.jogo.CFG.obstaculo = tipo;
    s.jogo.definirTamanho(400);
    s.jogo.pronto();
    s.jogo.comecar();
    verdadeiro(ateVitoria(s.jogo), tipo + ': a onda fecha');
  }
});

/* ---------- modo "ultima na arena vence" ---------- */

teste('modo "ultima na arena vence": varias escapam e a ultima que sobra vence a rodada', () => {
  const { jogo } = arena();
  jogo.CFG.modo = 'ultima';
  verdadeiro(ateVitoria(jogo), 'a rodada fechou');
  igual(jogo.estado.escaparam, CFG.lutadoresIniciais - 1, 'todas menos uma escaparam');
  igual(jogo.estado.restam, 1, 'sobrou uma');
  const sobrevivente = jogo.estado.lutadores.find(l => !l.escapando);
  verdadeiro(sobrevivente, 'ha uma sobrevivente na arena');
  igual(jogo.estado.campeao.id, sobrevivente.flag.id, 'a vencedora e a que sobrou, nao a primeira que escapou');
  igual(jogo.estado.vencidas.length, 1, 'entrou no mural');
  igual(jogo.estado.vencidas[0].modo, 'ultima', 'registrada como vencedora do modo ultima');
});

teste('modo "ultima": a abertura so fecha quando sobra uma (a ultima nao consegue fugir)', () => {
  const { jogo } = arena(MANIFEST.slice(0, 2));
  jogo.CFG.modo = 'ultima';
  const [a, b] = jogo.estado.lutadores;
  const e = jogo.estado;
  e.abertura = 0;
  a.x = e.cx; a.y = e.cy - e.raioJogador * 0.2; a.vx = 0; a.vy = -80;
  b.x = e.cx; b.y = e.cy - e.raioJogador * 0.6; b.vx = 0; b.vy = -20;
  verdadeiro(ateVitoria(jogo), 'a rodada fecha');
  igual(jogo.estado.escaparam, 1, 'so uma escapou');
  igual(jogo.estado.lutadores.filter(l => !l.escapando).length, 1, 'a outra venceu');
});

teste('modo "ultima" sem repeticao: na ultima rodada restam duas e quem nao vence e a perdedora', () => {
  const s = arenaPequena(3);
  const { jogo } = s;
  jogo.CFG.modo = 'ultima';
  jogo.CFG.vencedorasVoltam = false;

  verdadeiro(ateVitoria(jogo), 'rodada 1 fechou');
  igual(jogo.estado.escaparam, 2, 'rodada 1: duas escaparam, uma venceu');
  const v1 = jogo.estado.campeao;
  anda(jogo, CFG.duracaoCoroa + 100);

  igual(jogo.estado.onda, 2, 'rodada 2 comecou');
  igual(jogo.estado.lutadores.length, 2, 'rodada final: so duas bandeiras que ainda nao venceram');
  falso(jogo.estado.lutadores.some(l => l.flag.id === v1.id), 'a vencedora da rodada 1 nao volta');

  verdadeiro(ateVitoria(jogo), 'rodada 2 fechou');
  const v2 = jogo.estado.campeao;
  verdadeiro(v2.id !== v1.id, 'a vencedora da rodada 2 e outra');
  anda(jogo, CFG.duracaoCoroa + 100);

  igual(s.fins.length, 1, 'o jogo acabou uma unica vez');
  igual(s.fins[0].motivo, 'bandeiras', 'acabaram as que nao venceram');
  igual(s.fins[0].tipo, 'derrotada', 'a que sobrou e a perdedora do jogo');
  const todas = [v1.id, v2.id, s.fins[0].flag.id].sort();
  igual(new Set(todas).size, 3, 'duas vencedoras diferentes e uma perdedora');
  igual(jogo.estado.onda, 2, 'nao comecou uma rodada 3');
});

teste('o esquema oferece os tres modos e o app descreve o novo', () => {
  const sb = montarContexto(1);
  rodar(sb, ['js/config.js']);
  const modos = sb.Config.campo('modo').opcoes.map(o => o.valor);
  igual(modos.join(), 'vencedora,eliminacao,ultima', 'tres modos');
  igual(sb.Config.normalizar({ modo: 'ultima' }).modo, 'ultima', 'o valor novo e aceito');
  verdadeiro(/value="ultima"/.test(lidos['index.html']), 'a opcao esta no HTML');
});

/* ---------- escolher as bandeiras da partida ---------- */

teste('com bandeiras escolhidas, so elas disputam, todas juntas, em toda rodada', () => {
  const { jogo } = arena();
  const escolhidas = ['brasil', 'argentina', 'estados-unidos', 'franca', 'espanha', 'mexico'];
  jogo.definirSelecao(escolhidas);
  jogo.pronto();
  const chave = () => jogo.estado.lutadores.map(l => l.flag.id).sort().join();
  igual(chave(), escolhidas.slice().sort().join(), 'a arena tem exatamente as escolhidas');
  igual(jogo.estado.lutadores.length, 6, 'seis bandeiras, nao as 16 do sorteio');

  jogo.comecar();
  for (let r = 0; r < 3; r++) {
    fecharOnda(jogo);
    ateProximaRodada(jogo);
    igual(chave(), escolhidas.slice().sort().join(), 'rodada ' + (r + 2) + ': as mesmas seis');
  }
});

teste('escolhidas sem repeticao: o grupo encolhe e o jogo acaba so com elas', () => {
  const s = arena();
  const { jogo } = s;
  const fins = [];
  jogo.on('fim', d => fins.push(d));
  const escolhidas = ['brasil', 'argentina', 'franca'];
  jogo.definirSelecao(escolhidas);
  jogo.CFG.vencedorasVoltam = false;
  jogo.pronto();
  jogo.comecar();
  fecharOnda(jogo); ateProximaRodada(jogo);
  igual(jogo.estado.lutadores.length, 2, 'depois da primeira vencedora restam duas');
  fecharOnda(jogo);
  anda(jogo, CFG.duracaoCoroa + 100);
  igual(fins.length, 1, 'terminou');
  verdadeiro(escolhidas.includes(fins[0].flag.id), 'a derrotada e uma das escolhidas');
});

teste('menos de duas escolhidas, ou nenhuma, volta ao sorteio de sempre', () => {
  const { jogo } = arena();
  jogo.definirSelecao(['brasil']);
  jogo.pronto();
  igual(jogo.estado.lutadores.length, CFG.lutadoresIniciais, 'uma so nao vale: sorteia');
  jogo.definirSelecao([]);
  jogo.pronto();
  igual(jogo.estado.lutadores.length, CFG.lutadoresIniciais, 'nenhuma: sorteia');
  jogo.definirSelecao(null);
  jogo.pronto();
  igual(jogo.estado.lutadores.length, CFG.lutadoresIniciais, 'null: sorteia');
});

teste('mudar a escolha no meio da partida so vale na proxima', () => {
  const { jogo } = arena();
  const antes = jogo.estado.lutadores.map(l => l.flag.id).sort().join();
  jogo.definirSelecao(['brasil', 'franca']);
  igual(jogo.estado.lutadores.map(l => l.flag.id).sort().join(), antes, 'a partida em curso segue com as suas');
  jogo.reiniciar(true);
  igual(jogo.estado.lutadores.map(l => l.flag.id).sort().join(), 'brasil,franca', 'a nova partida usa a escolha');
});

teste('a tela de escolha lista a colecao, marca, filtra e alimenta o jogo', () => {
  const s = sandboxDoApp();
  const grade = s.__porId.get('selecao-grade');
  igual(grade.children.length, MANIFEST.length, 'uma caixa por bandeira');
  const primeira = grade.children[0];
  const nomes = grade.children.map(c => c.children[2].textContent);
  verdadeiro(nomes.includes('Estados Unidos'), 'nomes com a grafia certa');

  /* marca seis, como a caixa faria (o ouvinte e' um so', na grade) */
  const ids = ['brasil', 'argentina', 'estados-unidos', 'franca', 'espanha', 'mexico'];
  for (const id of ids) {
    s.__ouvintes['selecao-grade'].change({ target: { dataset: { id }, checked: true } });
  }
  igual(s.__porId.get('config-info').textContent, '6 de ' + MANIFEST.length + ' bandeiras escolhidas', 'rodape diz quantas');
  igual(s.__jogo.estado.lutadores.length, 6, 'a arena parada ja se refez com as seis');
  igual(s.__jogo.estado.lutadores.map(l => l.flag.id).sort().join(), ids.slice().sort().join(), 'sao as escolhidas');

  s.__porId.get('btn-iniciar').click();
  igual(s.__jogo.estado.fase, s.__jogo.FASE.RODANDO, 'inicia com elas');
  igual(s.__porId.get('contador-restam').textContent, '6', 'restam 6');

  /* desmarcar tudo volta ao sorteio */
  s.__ouvintes['btn-selecao-nenhuma'].click();
  s.__porId.get('btn-reiniciar').click();
  igual(s.__jogo.estado.lutadores.length, CFG.lutadoresIniciais, 'sem escolha, sorteia de novo');
});

/* ---------- as bandeiras do comeco sao as mesmas ate' o fim ---------- */

/* Espera a proxima rodada COMECAR e para na hora. Um `anda` de tempo fixo nao serve:
   uma bandeira pode escapar sozinha logo no inicio e a rodada seguinte ja' teria
   fechado quando o teste olhasse. */
function ateProximaRodada(jogo) {
  const onda = jogo.estado.onda;
  for (let i = 0; i < 2000; i++) {
    anda(jogo, 50);
    if (jogo.estado.onda > onda && jogo.estado.fase === jogo.FASE.RODANDO) return;
  }
  throw new Error('a proxima rodada nao comecou');
}

teste('nenhuma bandeira nova entra depois do comeco: so jogam as que iniciaram a partida', () => {
  const { jogo } = arena();                         /* 47 bandeiras na colecao, 16 por partida */
  jogo.CFG.vencedorasVoltam = false;
  const inicio = new Set(jogo.estado.lutadores.map(l => l.flag.id));
  igual(inicio.size, CFG.lutadoresIniciais, 'comecaram 16');

  let anterior = CFG.lutadoresIniciais;
  for (let r = 0; r < 4; r++) {
    fecharOnda(jogo);
    ateProximaRodada(jogo);
    const ids = jogo.estado.lutadores.map(l => l.flag.id);
    verdadeiro(ids.every(id => inicio.has(id)), 'rodada ' + (r + 2) + ': entrou bandeira que nao era do comeco');
    anterior -= 1;
    igual(ids.length, anterior, 'rodada ' + (r + 2) + ': joga todas as que ainda nao foram marcadas');
  }
});

teste('com as vencedoras voltando, as mesmas 16 jogam todas as rodadas', () => {
  const { jogo } = arena();
  const chave = () => jogo.estado.lutadores.map(l => l.flag.id).sort().join();
  const inicio = chave();
  for (let r = 0; r < 3; r++) {
    fecharOnda(jogo);
    ateProximaRodada(jogo);
    igual(chave(), inicio, 'rodada ' + (r + 2) + ': o mesmo grupo');
  }
});

teste('uma partida nova sorteia outras bandeiras', () => {
  const { jogo } = arena();
  const chave = () => jogo.estado.lutadores.map(l => l.flag.id).sort().join();
  const primeira = chave();
  jogo.reiniciar(true);
  verdadeiro(chave() !== primeira, 'o grupo mudou ao reiniciar');
  const segunda = chave();
  jogo.pronto();
  verdadeiro(chave() !== segunda, 'o grupo muda a cada pronto()');
});

/* ---------- preset da eliminacao e aviso que encurta ---------- */

teste('escolher "quem escapa e eliminada" traz os ajustes proprios do modo', () => {
  const s = arena();
  const C = s.sandbox.Config;
  const padrao = C.padroes();
  const r = C.aplicarPreset(Object.assign({}, padrao, { modo: 'eliminacao', volume: 80 }), 'eliminacao');
  igual(r.velocidade, 0.25, 'velocidade');
  igual(r.rotacao, 0.39, 'rotacao do anel');
  igual(r.abertura, 25, 'tamanho da abertura');
  igual(r.arena, 1.2, 'tamanho do circulo');
  igual(r.anel, 45.5, 'raio do anel');
  igual(r.tamanhoBandeira, 0.65, 'tamanho das bandeiras');
  igual(r.volume, 80, 'o que nao e do preset fica como estava');
  igual(r.modo, 'eliminacao', 'o modo continua escolhido');

  /* todos os valores do preset cabem nos intervalos dos sliders */
  for (const k of Object.keys(C.PRESETS.eliminacao)) {
    const campo = C.campo(k);
    verdadeiro(C.PRESETS.eliminacao[k] >= campo.min && C.PRESETS.eliminacao[k] <= campo.max, k + ' dentro do intervalo');
  }

  const v = C.aplicarPreset(Object.assign({}, padrao, { modo: 'vencedora', velocidade: 2 }), 'vencedora');
  igual(v.velocidade, 2, 'o outro modo nao mexe em nada');
});

teste('o aviso de quem escapou encurta ao longo da eliminacao e nao muda no outro modo', () => {
  const { jogo } = arena();
  const base = jogo.CFG.duracaoCoroa;
  const min = jogo.CFG.duracaoCoroaMin;
  igual(jogo.duracaoCoroa(), base, 'modo vencedora: sempre a duracao cheia');

  jogo.CFG.modo = 'eliminacao';
  jogo.CFG.vencedorasVoltam = false;
  const total = jogo.estado.todas.length;
  let anterior = jogo.duracaoCoroa();
  verdadeiro(anterior <= base && anterior >= base - 100, 'no comeco quase a duracao cheia: ' + anterior);

  /* marca bandeiras como eliminadas, uma a uma: o aviso so' pode encurtar */
  for (let i = 0; i < total - 2; i++) {
    jogo.estado.vencidas.push({ onda: i + 1, flag: jogo.estado.todas[i], modo: 'eliminacao' });
    const d = jogo.duracaoCoroa();
    verdadeiro(d <= anterior, 'nao pode aumentar: ' + d + ' > ' + anterior);
    verdadeiro(d >= min, 'nao passa do piso: ' + d);
    anterior = d;
  }
  verdadeiro(anterior < base / 2, 'perto do fim e bem mais curto que o inicio: ' + anterior);

  /* com as vencedoras voltando ninguem sai, entao nada encurta */
  jogo.CFG.vencedorasVoltam = true;
  igual(jogo.duracaoCoroa(), base, 'sem eliminacao real a duracao fica cheia');
});

/* ---------- temas visuais ---------- */

teste('todo tema do esquema tem um bloco de CSS que define o mesmo conjunto de cores', () => {
  const sb = montarContexto(1);
  rodar(sb, ['js/config.js']);
  const temas = sb.Config.campo('tema').opcoes.map(o => o.valor);
  igual(sb.Config.campo('tema').padrao, 'noite', 'o padrao e o Noite');
  verdadeiro(temas.length >= 4, 'ha varios temas para escolher');

  const css = lidos['styles.css'].replace(/\/\*[\s\S]*?\*\//g, '');
  /* o :root (Noite) define os tokens; o que e' de layout nao e' tema */
  const raiz = /(^|\})\s*:root\s*\{([^}]*)\}/.exec(css)[2];
  const LAYOUT = ['--anel-raio', '--anel-diametro', '--arena-escala', '--bandeira-escala', '--bandeira-prop',
    '--bandeira-raio', '--arena-base', '--arena-max'];
  const tokens = [...raiz.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]).filter(t => !LAYOUT.includes(t));
  verdadeiro(tokens.length >= 25, 'o :root tem os tokens de tema: ' + tokens.length);

  for (const t of temas) {
    if (t === 'noite') continue;
    const m = new RegExp(':root\\[data-tema="' + t + '"\\]\\s*\\{([^}]*)\\}').exec(css);
    verdadeiro(m, 'sem bloco CSS para o tema ' + t);
    const definidos = [...m[1].matchAll(/(--[\w-]+)\s*:/g)].map(x => x[1]);
    for (const tk of tokens) verdadeiro(definidos.includes(tk), 'tema ' + t + ' nao define ' + tk);
    for (const d of definidos) verdadeiro(tokens.includes(d), 'tema ' + t + ' define token que o :root nao tem: ' + d);
  }
  /* e todo bloco de tema do CSS esta' no esquema (sem tema orfao) */
  for (const m of css.matchAll(/:root\[data-tema="([\w-]+)"\]/g)) {
    verdadeiro(temas.includes(m[1]), 'bloco de CSS sem opcao no esquema: ' + m[1]);
  }
});

teste('o CSS nao escreve cor de tema a mao fora dos tokens', () => {
  /* as cores que variam por tema ja foram trocadas por var(): se alguma dessas
     voltar a aparecer fora do :root e dos blocos de tema, um tema deixa de
     valer naquele pedaco da tela */
  const css = lidos['styles.css'].replace(/\/\*[\s\S]*?\*\//g, '');
  const semTokens = css
    .replace(/(^|\})\s*:root(\[data-tema="[\w-]+"\])?\s*\{[^}]*\}/g, '$1');
  for (const cor of ['#14203a', 'rgba(10, 16, 32', 'rgba(4, 8, 18', '#475a85', '#7f95c8', '#7dd3fc', '#03121f', 'rgba(28, 18, 6']) {
    falso(semTokens.includes(cor), 'cor de tema escrita a mao: ' + cor);
  }
});

teste('Config aplica o tema no <html> e cai no Noite se o valor for invalido', () => {
  const sb = montarContexto(1);
  rodar(sb, ['js/config.js']);
  const raiz = criarElemento('html'); raiz.style = {};
  sb.Config.aplicarNoCena({ tema: 'neon' }, { raiz });
  igual(raiz.atributos['data-tema'], 'neon', 'tema aplicado');
  sb.Config.aplicarNoCena({ tema: 'claro' }, { raiz });
  igual(raiz.atributos['data-tema'], 'claro', 'troca de tema');
  sb.Config.aplicarNoCena({ tema: 'inexistente' }, { raiz });
  igual(raiz.atributos['data-tema'], 'noite', 'valor invalido vira o padrao');
  igual(sb.Config.normalizar({}).tema, 'noite', 'padrao');
});

/* ---------- efeito do anel ---------- */

teste('Config aplica o efeito do anel no <html> e cai em Nenhum se o valor for invalido', () => {
  const sb = montarContexto(1);
  rodar(sb, ['js/config.js']);
  const raiz = criarElemento('html'); raiz.style = {};
  sb.Config.aplicarNoCena({ efeitoAnel: 'brilho' }, { raiz });
  igual(raiz.atributos['data-efeito-anel'], 'brilho', 'efeito aplicado');
  sb.Config.aplicarNoCena({ efeitoAnel: 'cor' }, { raiz });
  igual(raiz.atributos['data-efeito-anel'], 'cor', 'troca de efeito');
  sb.Config.aplicarNoCena({ efeitoAnel: 'inexistente' }, { raiz });
  igual(raiz.atributos['data-efeito-anel'], 'nenhum', 'valor invalido vira o padrao');
  igual(sb.Config.normalizar({}).efeitoAnel, 'nenhum', 'padrao');
});

teste('cada efeito do anel tem desenho proprio e nenhum encosta no anel que gira', () => {
  const sb = montarContexto(1);
  rodar(sb, ['js/config.js']);
  const campo = sb.Config.campo('efeitoAnel');
  const efeitos = campo.opcoes.map(o => o.valor);
  igual(efeitos[0], 'nenhum', 'Nenhum e a primeira opcao');
  igual(campo.padrao, 'nenhum', 'Nenhum e o padrao');

  const css = lidos['styles.css'].replace(/\/\*[\s\S]*?\*\//g, '');
  for (const e of efeitos) {
    if (e === 'nenhum') continue;
    verdadeiro(css.indexOf(':root[data-efeito-anel="' + e + '"]') !== -1, 'sem regra para o efeito ' + e);
    /* o desenho vive nos pseudo-elementos do .arena, nunca no <svg> do anel */
    verdadeiro(new RegExp(':root\\[data-efeito-anel="' + e + '"\\][^{]*\\.arena::').test(css),
      'o efeito ' + e + ' nao desenha nos pseudo-elementos do .arena');
  }
  /* Nenhum nao pinta nada: nenhuma regra casa quando o valor e o padrao */
  verdadeiro(css.indexOf(':root[data-efeito-anel="nenhum"]') === -1, 'Nenhum nao deve ter regra no CSS');

  /* o efeito e' so' desenho: o anel que gira e a moldura continuam sem transform */
  falso(/transform\s*:/.test(blocoCss(lidos['styles.css'], '.arena-anel-giro')), 'o anel que gira nao ganhou transform');
  falso(/transform\s*:/.test(blocoCss(lidos['styles.css'], '.arena-anel')), 'o <svg> do anel nao ganhou transform');
});

teste('as duas paginas aplicam o tema e o efeito do anel salvos antes de pintar', () => {
  for (const arq of ['index.html', 'ajustes.html']) {
    const html = fs.readFileSync(path.join(raiz, arq), 'utf8');
    const cab = html.slice(0, html.indexOf('</head>'));
    verdadeiro(/localStorage\.getItem\('flag-arena:config:v2'\)/.test(cab), arq + ': le o tema no <head>');
    verdadeiro(/data-tema/.test(cab), arq + ': escreve data-tema no <head>');
    verdadeiro(/data-efeito-anel/.test(cab), arq + ': escreve data-efeito-anel no <head>');
  }
  const sb = montarContexto(1);
  rodar(sb, ['js/config.js']);
  verdadeiro(fs.readFileSync(path.join(raiz, 'index.html'), 'utf8').indexOf("'" + sb.Config.CHAVE + "'") !== -1,
    'a chave do <head> e a mesma de Config.CHAVE');
});

/* ---------- mural vertical ---------- */

teste('mural vertical mostra todas as vencedoras; horizontal corta em 8 e mostra +N', () => {
  const base = arena();
  const { jogo, mural } = arenaComMural(base);
  const flags = base.flags.slice(0, 14);
  flags.forEach((f, i) => jogo.estado.vencidas.push({ onda: i + 1, flag: f }));

  jogo.repintarMural();
  igual(linhasDoMural(mural.vencedorasLista).length, CFG.vencedorasVisiveis, 'horizontal: limite de 8');
  verdadeiro(mural.vencedorasLista.children.some(c => c.classList.contains('vencedoras-resto')), 'horizontal: +N');

  jogo.CFG.vencedorasVisiveis = 100000;           /* o que Config escreve no modo vertical */
  jogo.repintarMural();
  igual(linhasDoMural(mural.vencedorasLista).length, 14, 'vertical: todas as 14');
  falso(mural.vencedorasLista.children.some(c => c.classList.contains('vencedoras-resto')), 'vertical: sem +N');
});

/* ---------- Config: modo, obstaculo e posicao do mural ---------- */

teste('Config aplica modo, obstaculo e posicao do mural no motor e na cena', () => {
  const s = arena();
  const C = s.sandbox.Config;
  const motor = s.jogo;
  C.aplicarNoMotor({ modo: 'eliminacao', obstaculo: 'cruz', muralPosicao: 'vertical' }, motor);
  igual(motor.CFG.modo, 'eliminacao', 'modo');
  igual(motor.CFG.obstaculo, 'cruz', 'obstaculo');
  verdadeiro(motor.CFG.vencedorasVisiveis >= 1000, 'vertical sem corte');
  C.aplicarNoMotor({ muralPosicao: 'horizontal' }, motor);
  igual(motor.CFG.vencedorasVisiveis, 8, 'horizontal volta ao limite');

  const raiz = criarElemento('html'); raiz.style = {};
  C.aplicarNoCena({ muralPosicao: 'vertical' }, { raiz });
  verdadeiro(raiz.classList.contains('mural-vertical'), 'classe do mural vertical');
  C.aplicarNoCena({ muralPosicao: 'horizontal' }, { raiz });
  falso(raiz.classList.contains('mural-vertical'), 'classe removida');

  const n = C.normalizar({ modo: 'xx', obstaculo: 'yy', muralPosicao: 'zz' });
  igual(n.modo, 'vencedora', 'modo invalido cai no padrao');
  igual(n.obstaculo, 'nenhum', 'obstaculo invalido cai no padrao');
  igual(n.muralPosicao, 'horizontal', 'posicao invalida cai no padrao');
});

/* ---------- Ajustes em outra aba ---------- */

teste('ajustes.html tem a mesma lista de ajustes do painel e carrega so o necessario', () => {
  const index = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
  const aba = fs.readFileSync(path.join(raiz, 'ajustes.html'), 'utf8');
  const pega = (h) => {
    const a = h.indexOf('<!-- ajustes:inicio');
    const b = h.indexOf('<!-- ajustes:fim -->');
    verdadeiro(a !== -1 && b !== -1, 'marcadores ausentes');
    return h.slice(a, b).split('\r\n').join('\n');
  };
  igual(pega(aba), pega(index), 'lista de ajustes diferente (rode node tools/sincronizar-ajustes.js)');

  verdadeiro(/<script src="js\/config\.js"><\/script>/.test(aba), 'carrega config.js');
  verdadeiro(/<script src="js\/ajustes-aba\.js"><\/script>/.test(aba), 'carrega ajustes-aba.js');
  falso(/js\/game\.js/.test(aba), 'nao carrega o motor');
  falso(/id="arena"/.test(aba), 'sem arena');
  verdadeiro(/href="ajustes\.html"[^>]*target="_blank"/.test(index), 'o painel tem link para a nova aba');
  verdadeiro(/href="index\.html"/.test(aba), 'a aba volta ao jogo');

  const sb = montarContexto(1);
  rodar(sb, ['js/config.js']);
  for (const c of sb.Config.CAMPOS) {
    verdadeiro(aba.indexOf('id="cfg-' + c.chave + '"') !== -1, 'ajustes.html sem controle de ' + c.chave);
  }
});

teste('todo valor mostrado nos Ajustes comeca com maiuscula (ou numero)', () => {
  const sb = montarContexto(1);
  rodar(sb, ['js/config.js']);
  const C = sb.Config;
  const ok = (texto, onde) => {
    const c = texto.charAt(0);
    verdadeiro(c === c.toUpperCase(), onde + ': "' + texto + '" comeca com minuscula');
  };
  for (const campo of C.CAMPOS) {
    if (campo.tipo === 'bool') {
      ok(C.texto(true, campo), campo.chave + ' ligado');
      ok(C.texto(false, campo), campo.chave + ' desligado');
    } else if (campo.tipo === 'opcao') {
      for (const o of campo.opcoes) { ok(o.texto, campo.chave + ' opcao'); ok(C.texto(o.valor, campo), campo.chave + ' valor'); }
    } else {
      for (const v of [campo.min, campo.padrao, campo.max]) ok(C.texto(v, campo), campo.chave + ' = ' + v);
    }
  }
  for (const arq of ['index.html', 'ajustes.html']) {
    const html = fs.readFileSync(path.join(raiz, arq), 'utf8');
    for (const m of html.matchAll(/<output class="config-valor"[^>]*>([^<]*)<\/output>/g)) ok(m[1], arq + ' (valor inicial)');
    for (const m of html.matchAll(/<option value="[^"]*">([^<]*)<\/option>/g)) ok(m[1], arq + ' (opcao)');
  }
});

teste('as duas paginas declaram favicon (sem pedir /favicon.ico ao servidor)', () => {
  for (const arq of ['index.html', 'ajustes.html']) {
    const html = fs.readFileSync(path.join(raiz, arq), 'utf8');
    const cab = html.slice(0, html.indexOf('</head>'));
    verdadeiro(/<link rel="icon" href="data:image\/svg\+xml,/.test(cab), arq + ': sem <link rel="icon">');
  }
});

teste('os ajustes de ligar e desligar sao interruptores (switch), nao caixas de marcar', () => {
  const css = lidos['styles.css'].replace(/\/\*[\s\S]*?\*\//g, '');
  const bloco = /(^|\})\s*\.config-check\s*\{([^}]*)\}/.exec(css);
  verdadeiro(bloco, 'existe a regra .config-check');
  verdadeiro(/appearance:\s*none/.test(bloco[2]), 'tira o desenho nativo da caixa');
  verdadeiro(/\.config-check::before/.test(css), 'tem o botao que desliza');
  verdadeiro(/\.config-check:checked::before\s*\{[^}]*translateX/.test(css), 'o botao desliza ao ligar');

  const sb = montarContexto(1);
  rodar(sb, ['js/config.js']);
  const bools = sb.Config.CAMPOS.filter(c => c.tipo === 'bool').map(c => c.chave);
  for (const arq of ['index.html', 'ajustes.html']) {
    const html = fs.readFileSync(path.join(raiz, arq), 'utf8');
    const caixas = [...html.matchAll(/<input class="config-check"([^>]*)>/g)];
    igual(caixas.length, bools.length, arq + ': um interruptor por ajuste de ligar/desligar');
    for (const m of caixas) verdadeiro(/role="switch"/.test(m[1]), arq + ': interruptor sem role="switch"');
  }
});

/* ---------- layout de celular ---------- */

teste('o layout de celular liga por classe: forcado ou pela largura da janela', () => {
  const sb = montarContexto(1);
  rodar(sb, ['js/config.js']);
  const C = sb.Config;
  igual(C.campo('layout').padrao, 'auto', 'o padrao e o automatico');
  igual(C.campo('layout').opcoes.map(o => o.valor).join(), 'auto,celular,computador', 'tres opcoes');

  /* sem matchMedia (o sandbox nao tem): automatico = computador */
  igual(C.usaLayoutCelular('auto'), false, 'auto sem janela: computador');
  igual(C.usaLayoutCelular('celular'), true, 'forcado celular');
  igual(C.usaLayoutCelular('computador'), false, 'forcado computador');

  /* com uma janela estreita, o automatico vira celular; larga, computador */
  let largura = 375;
  sb.matchMedia = (q) => ({ matches: largura <= Number(/(\d+)px/.exec(q)[1]) });
  igual(C.usaLayoutCelular('auto'), true, '375 px: celular');
  largura = 1280;
  igual(C.usaLayoutCelular('auto'), false, '1280 px: computador');
  largura = 720;
  igual(C.usaLayoutCelular('auto'), true, '720 px ainda e celular');
  largura = 721;
  igual(C.usaLayoutCelular('auto'), false, '721 px ja e computador');
  igual(C.usaLayoutCelular('computador'), false, 'forcar computador vence a janela estreita');
  largura = 1280;
  igual(C.usaLayoutCelular('celular'), true, 'forcar celular vence a janela larga');

  const raiz = criarElemento('html'); raiz.style = {};
  C.aplicarNoCena({ layout: 'celular' }, { raiz });
  verdadeiro(raiz.classList.contains('layout-celular'), 'classe ligada');
  C.aplicarNoCena({ layout: 'computador' }, { raiz });
  falso(raiz.classList.contains('layout-celular'), 'classe desligada');
  igual(C.normalizar({ layout: 'xx' }).layout, 'auto', 'valor invalido cai no automatico');
});

teste('forcar o celular poe o jogo numa moldura vertical 9:16 (para lives); o automatico nao', () => {
  const sb = montarContexto(1);
  rodar(sb, ['js/config.js']);
  const C = sb.Config;
  const raiz = criarElemento('html'); raiz.style = {};

  C.aplicarNoCena({ layout: 'celular' }, { raiz });
  verdadeiro(raiz.classList.contains('layout-celular'), 'layout de celular');
  verdadeiro(raiz.classList.contains('moldura-celular'), 'forcado: com moldura');

  C.aplicarNoCena({ layout: 'auto' }, { raiz });
  falso(raiz.classList.contains('moldura-celular'), 'automatico: sem moldura');
  C.aplicarNoCena({ layout: 'computador' }, { raiz });
  falso(raiz.classList.contains('moldura-celular'), 'computador: sem moldura');
  C.aplicarNoCena({ layout: 'celular' }, { raiz });
  C.aplicarNoCena({ layout: 'computador' }, { raiz });
  falso(raiz.classList.contains('moldura-celular'), 'sair do celular tira a moldura');

  const css = lidos['styles.css'].replace(/\/\*[\s\S]*?\*\//g, '');
  const bloco = /\.moldura-celular body\s*\{([^}]*)\}/.exec(css);
  verdadeiro(bloco, 'existe a regra da moldura');
  verdadeiro(/width:\s*min\(100vw,\s*calc\(100vh \* 9 \/ 16\)\)/.test(bloco[1]), 'largura = altura x 9/16, limitada pela janela');
  verdadeiro(/margin:\s*0 auto/.test(bloco[1]), 'centralizada');
  verdadeiro(/contain:\s*layout/.test(bloco[1]), 'as janelas fixas abrem dentro da moldura');
  verdadeiro(/\.layout-celular body\s*\{\s*container-type:\s*inline-size/.test(css), 'o body e o container das medidas cqw');
  verdadeiro(/--arena-max:\s*calc\(min\(96cqw,/.test(css), 'a arena mede pela largura da moldura (cqw)');
  verdadeiro(/--arena-max:\s*calc\(min\(96vw,/.test(css), 'com fallback para vw');
});

/* ---------- rolagem automatica do mural ---------- */

/* Relogio, timers e quadros de animacao de mentira: o teste anda no tempo sem esperar */
function relogioFalso() {
  const r = { t: 0, timers: [], quadros: [], proximo: 1 };
  r.setTimeout = (fn, ms) => { const id = r.proximo++; r.timers.push({ id, fn, em: r.t + ms }); return id; };
  r.clearTimeout = (id) => { r.timers = r.timers.filter(x => x.id !== id); };
  r.raf = (fn) => { const id = r.proximo++; r.quadros.push({ id, fn }); return id; };
  r.cancelRaf = (id) => { r.quadros = r.quadros.filter(x => x.id !== id); };
  /* avanca `ms`, em quadros de 16 ms, disparando timers vencidos */
  r.anda = (ms) => {
    const fim = r.t + ms;
    while (r.t < fim) {
      r.t += 16;
      for (const x of r.timers.filter(x => x.em <= r.t)) { r.timers = r.timers.filter(y => y.id !== x.id); x.fn(); }
      const q = r.quadros; r.quadros = [];
      for (const x of q) x.fn(r.t);
    }
  };
  return r;
}

function muralFalso(scrollHeight, clientHeight) {
  const ouvintes = {};
  return {
    scrollTop: 0, scrollHeight, clientHeight,
    addEventListener(nome, fn) { ouvintes[nome] = fn; },
    dispara(nome) { if (ouvintes[nome]) ouvintes[nome](); },
    ouvintes
  };
}

function rolagem(mural, opcoes, rel) {
  const sb = montarContexto(1);
  rodar(sb, ['js/rolagem.js']);
  return sb.RolagemMural.criar(mural, opcoes, rel);
}

teste('rolagem do mural: desce devagar ate o fim, para, volta ao topo e espera antes de repetir', () => {
  const rel = relogioFalso();
  const mural = muralFalso(700, 200);               /* 500 px de sobra */
  const ctl = rolagem(mural, { primeiro: 1000, intervalo: 20000, velocidade: 50, pausaFim: 1500 }, rel);
  ctl.iniciar();

  rel.anda(900);
  igual(mural.scrollTop, 0, 'antes do primeiro passeio nao mexe');
  rel.anda(1000);                                   /* ~1,9 s: o passeio comecou */
  igual(ctl.estado().fase, 'descendo', 'comecou a descer');

  /* desce a ~50 px/s, sem pulos: nenhum quadro anda mais que ~1,5 px */
  let anterior = mural.scrollTop, maiorPasso = 0;
  for (let i = 0; i < 1000 && ctl.estado().fase === 'descendo'; i++) {
    rel.anda(16);
    maiorPasso = Math.max(maiorPasso, mural.scrollTop - anterior);
    anterior = mural.scrollTop;
  }
  verdadeiro(maiorPasso < 1.5, 'descida suave, maior passo ' + maiorPasso);
  igual(mural.scrollTop, 500, 'chegou ao fim (as vencedoras mais antigas)');
  igual(ctl.estado().fase, 'pausa', 'parou la um instante');

  rel.anda(1400);
  igual(mural.scrollTop, 500, 'ainda parado durante a pausa');
  rel.anda(400);
  igual(ctl.estado().fase, 'subindo', 'depois da pausa, volta');

  let subiu = true, ant = mural.scrollTop;
  for (let i = 0; i < 400 && ctl.estado().fase === 'subindo'; i++) {
    rel.anda(16);
    if (mural.scrollTop > ant + 1e-9) subiu = false;
    ant = mural.scrollTop;
  }
  verdadeiro(subiu, 'a volta nunca desce');
  igual(mural.scrollTop, 0, 'voltou ao topo (as mais recentes)');
  igual(ctl.estado().fase, null, 'passeio terminado');

  /* nao repete logo: so' depois do intervalo */
  rel.anda(15000);
  igual(ctl.estado().fase, null, 'ainda esperando o intervalo');
  rel.anda(6000);
  igual(ctl.estado().fase, 'descendo', 'depois do intervalo, passeia de novo');
});

teste('rolagem do mural: se tudo cabe, nao passeia', () => {
  const rel = relogioFalso();
  const mural = muralFalso(200, 200);
  const ctl = rolagem(mural, { primeiro: 500, intervalo: 2000 }, rel);
  ctl.iniciar();
  rel.anda(10000);
  igual(mural.scrollTop, 0, 'nao rolou');
  igual(ctl.estado().fase, null, 'nunca entrou em passeio');
});

teste('rolagem do mural: se a pessoa mexe, para onde esta e so retoma depois de um tempo', () => {
  const rel = relogioFalso();
  const mural = muralFalso(900, 200);
  const ctl = rolagem(mural, { primeiro: 500, intervalo: 30000, velocidade: 100, retomada: 5000 }, rel);
  ctl.iniciar();
  rel.anda(2500);
  igual(ctl.estado().fase, 'descendo', 'passeando');
  const onde = mural.scrollTop;
  verdadeiro(onde > 50, 'ja desceu um pouco: ' + onde);

  mural.dispara('wheel');                            /* a pessoa roda a roda do mouse */
  igual(ctl.estado().fase, null, 'o passeio parou');
  const parado = mural.scrollTop;
  rel.anda(3000);
  igual(mural.scrollTop, parado, 'nao puxa de volta nem continua descendo');
  igual(ctl.estado().mexendo, true, 'esperando a pessoa sossegar');

  rel.anda(2500);                                    /* passou a retomada */
  igual(ctl.estado().fase, 'descendo', 'retomou o passeio');
});

teste('rolagem do mural: aba escondida nao passeia, e parar() desliga tudo', () => {
  const rel = relogioFalso();
  const mural = muralFalso(900, 200);
  const sb = montarContexto(1);
  rodar(sb, ['js/rolagem.js']);
  sb.document = { hidden: true };
  const ctl = sb.RolagemMural.criar(mural, { primeiro: 300, intervalo: 1000 }, rel);
  ctl.iniciar();
  rel.anda(5000);
  igual(mural.scrollTop, 0, 'escondida: nao rola');
  sb.document.hidden = false;
  rel.anda(1500);
  igual(ctl.estado().fase, 'descendo', 'visivel de novo: passeia');
  ctl.parar();
  igual(ctl.estado().ligado, false, 'desligado');
  const pos = mural.scrollTop;
  rel.anda(5000);
  igual(mural.scrollTop, pos, 'parou de mexer');
});

teste('a velocidade do passeio do mural e um ajuste e vale com o jogo rodando', () => {
  const sb = montarContexto(1);
  rodar(sb, ['js/config.js']);
  const campo = sb.Config.campo('rolagemMural');
  verdadeiro(campo, 'o ajuste existe');
  igual(campo.grupo, 'placar', 'esta no grupo Placar e indicadores');
  igual(campo.padrao, 50, 'o padrao e a velocidade de sempre (50 px/s)');
  igual(sb.Config.texto(0, campo), 'Desligado', '0 desliga e aparece como Desligado');
  igual(sb.Config.texto(50, campo), '50 px/s', 'valor com unidade');
  igual(sb.Config.normalizar({ rolagemMural: 999 }).rolagemMural, campo.max, 'limitado ao maximo');
  igual(sb.Config.normalizar({ rolagemMural: -5 }).rolagemMural, 0, 'nunca negativo');

  /* o app repassa o valor ao controlador sempre que aplica os ajustes */
  verdadeiro(/rolagemMural\.ajustar\(\{ velocidade: cfg\.rolagemMural \}\)/.test(lidos['js/app.js']), 'app.js repassa a velocidade');

  /* velocidade maior = chega ao fim mais rapido; 0 = nao passeia */
  const tempoAteOFim = (vel) => {
    const rel = relogioFalso();
    const mural = muralFalso(1000, 200);
    const ctl = rolagem(mural, { primeiro: 100, intervalo: 100000, velocidade: 10 }, rel);
    ctl.iniciar();
    ctl.ajustar({ velocidade: vel });                /* o que o Ajuste faz */
    let t = 0;
    while (ctl.estado().fase !== 'pausa' && t < 200000) { rel.anda(16); t += 16; }
    return t;
  };
  const lento = tempoAteOFim(25), rapido = tempoAteOFim(100);
  verdadeiro(rapido < lento / 3, 'a 100 px/s chega bem antes que a 25 px/s: ' + rapido + ' vs ' + lento);

  const rel = relogioFalso();
  const mural = muralFalso(1000, 200);
  const ctl = rolagem(mural, { primeiro: 100, intervalo: 500, velocidade: 50 }, rel);
  ctl.iniciar();
  ctl.ajustar({ velocidade: 0 });
  rel.anda(5000);
  igual(mural.scrollTop, 0, 'com 0 nao rola');
  igual(ctl.estado().fase, null, 'com 0 nunca passeia');
  ctl.ajustar({ velocidade: 50 });                   /* religar vale sem recarregar */
  rel.anda(1500);
  igual(ctl.estado().fase, 'descendo', 'religado, volta a passear');
});

teste('o app liga a rolagem ao mural e as barras de rolagem seguem o tema', () => {
  verdadeiro(/rolagemMural = RolagemMural\.criar\(el\.vencedoras\);\s*rolagemMural\.iniciar\(\)/.test(lidos['js/app.js']), 'app.js inicia a rolagem do mural');
  const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
  verdadeiro(html.indexOf('js/rolagem.js') !== -1 && html.indexOf('js/rolagem.js') < html.indexOf('js/app.js'), 'rolagem.js carrega antes do app.js');

  const css = lidos['styles.css'].replace(/\/\*[\s\S]*?\*\//g, '');
  verdadeiro(/scrollbar-color:\s*var\(--destaque\)/.test(css), 'cor da barra vem do tema (--destaque)');
  verdadeiro(/scrollbar-width:\s*thin/.test(css), 'barra fina');
  verdadeiro(/::-webkit-scrollbar-thumb\s*\{[^}]*var\(--destaque\)/.test(css), 'fallback webkit tambem usa o tema');
  /* nenhuma cor de barra escrita a mao */
  falso(/scrollbar-color:\s*(#|rgb)/.test(css), 'cor de barra escrita a mao');
});

teste('o CSS tem o layout de celular por classe e as paginas liberam a area segura do aparelho', () => {
  const css = lidos['styles.css'].replace(/\/\*[\s\S]*?\*\//g, '');
  for (const regra of ['.layout-celular .palco', '.layout-celular .arena', '.layout-celular .rodape',
    '.layout-celular .topo', '.layout-celular .config-painel', '.layout-celular .botao-iniciar']) {
    verdadeiro(css.includes(regra), 'falta a regra ' + regra);
  }
  /* o layout de celular nao depende mais da largura por media query */
  falso(/@media \(max-width: 720px\)/.test(css), 'sobrou media query de 720 px (a decisao e da classe)');
  falso(/@media \(min-width: 721px\)/.test(css), 'sobrou media query de 721 px');
  verdadeiro(/--arena-max:\s*calc\(min\(96vw[^;]*var\(--arena-escala\)\)/.test(css), 'a arena do celular mantem o multiplicador dos Ajustes');
  for (const arq of ['index.html', 'ajustes.html']) {
    const html = fs.readFileSync(path.join(raiz, arq), 'utf8');
    verdadeiro(/<meta name="viewport"[^>]*viewport-fit=cover/.test(html), arq + ': viewport sem viewport-fit=cover');
  }
});

teste('cada ajuste esta no grupo declarado no esquema, nas duas telas', () => {
  const sb = montarContexto(1);
  rodar(sb, ['js/config.js']);
  const { CAMPOS, GRUPOS } = sb.Config;
  const ids = GRUPOS.map(g => g.id);
  igual(new Set(ids).size, ids.length, 'ids de grupo unicos');
  for (const c of CAMPOS) verdadeiro(GRUPOS.some(g => g.id === c.grupo), c.chave + ' sem grupo valido: ' + c.grupo);
  for (const g of GRUPOS) verdadeiro(CAMPOS.some(c => c.grupo === g.id), 'grupo vazio: ' + g.titulo);

  for (const arq of ['index.html', 'ajustes.html']) {
    const html = fs.readFileSync(path.join(raiz, arq), 'utf8');
    const secoes = [...html.matchAll(/<section class="config-grupo" data-grupo="(\w+)">\s*<h3 class="config-grupo-titulo">([^<]+)<\/h3>([\s\S]*?)<\/section>/g)];
    igual(secoes.length, GRUPOS.length, arq + ': numero de grupos');
    secoes.forEach((m, i) => {
      igual(m[1], GRUPOS[i].id, arq + ': ordem dos grupos');
      igual(m[2], GRUPOS[i].titulo, arq + ': titulo do grupo');
      const noHtml = [...m[3].matchAll(/<(?:input|select)[^>]*\bid="cfg-(\w+)"/g)].map(x => x[1]);
      const noEsquema = CAMPOS.filter(c => c.grupo === GRUPOS[i].id).map(c => c.chave);
      igual(noHtml.slice().sort().join(), noEsquema.slice().sort().join(), arq + ': campos do grupo ' + GRUPOS[i].titulo);
    });
  }
});

teste('o jogo escuta o storage para receber ajustes de outra aba', () => {
  verdadeiro(/addEventListener\('storage'/.test(lidos['js/app.js']), 'app.js escuta storage');
  const aba = fs.readFileSync(path.join(raiz, 'js/ajustes-aba.js'), 'utf8');
  verdadeiro(/Config\.gravar/.test(aba), 'a aba grava no mesmo lugar do jogo');
});

/* ---------------------------------------------------------------- */

if (falhas.length === 0) {
  console.log('OK — ' + passou + ' testes passaram.');
  process.exit(0);
} else {
  console.log('FALHOU — ' + falhas.length + ' de ' + (passou + falhas.length) + ' testes:');
  for (const f of falhas) console.log('  ✗ ' + f.nome + '\n      ' + f.erro);
  process.exit(1);
}
