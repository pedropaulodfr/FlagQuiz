/* =====================================================================
   Flag Arena - motor da simulação de sobrevivência
   =====================================================================
   Bandeiras (lutadores) se movem sozinhas dentro de um círculo. O círculo
   tem uma abertura que gira. A fuga é FISICA: não há medidor nem contador
   por bandeira. Uma bandeira escapa unicamente quando o próprio corpo
   atravessa o anel por dentro do setor da abertura. Bater no anel fora da
   abertura ricocheteia e escorrega ao longo da parede na direção do
   portão; bater noutra bandeira troca velocidades. O processo é
   irreversível: a cada fuga sobra uma a menos, até sobrar uma única — a
   vencedora. Aí entra uma onda nova (a vencedora volta como campeã) e o
   ciclo continua.

   Fisica: so' velocidade e colisao. Cada bandeira e' um disco que anda em linha
   reta; muda de rumo apenas ao bater noutra bandeira ou na parede do anel
   (reflexao elastica). Nao ha forca radial, pressao, atracao pela abertura nem
   ganho de energia nos choques. A abertura e' so' um trecho do anel sem parede:
   escapa quem chega la' pela propria trajetoria. Como o portao gira e os
   choques espalham as trajetorias, cada bandeira acaba por encontra-lo.
   ===================================================================== */

(function (global) {
  'use strict';

  var CFG = {
    lutadoresIniciais: 16,      /* quantas bandeiras entram por onda */
    aberturaMeiaLargura: 0.6021, /* meia-abertura da saida, em rad (= 69 graus de largura total, o padrao dos Ajustes) */
    aberturaVelocidade: 0.18,   /* rad/s que a abertura gira */
    /* --- movimento --- */
    /* Velocidades em px/s para uma arena de `ladoReferencia`; a arena cresce com
       o ecra, entao sao lidas multiplicadas por `estado.escala` (lado/ladoReferencia).
       A fisica e' so' velocidade + colisao: nao ha direcao desejada, ruido,
       pilotagem, pressao nem impulso extra. Depois de sorteada, a velocidade de
       cada bandeira so' muda quando ela bate em algo. */
    ladoReferencia: 400,
    velocidade: 130,            /* px/s: velocidade inicial base de cada bandeira */
    dispersion: 0.55,           /* dispersao da velocidade inicial entre bandeiras */
    /* Teto de seguranca, explicito: com choques elasticos a energia e' conservada
       e este valor nunca deveria ser atingido. So' protege contra um valor absurdo
       vindo do slider ou de um passo de tempo enorme. */
    velocidadeMax: 300,
    /* Piso de velocidade, explicito: com choques elasticos entre discos de mesma
       massa, uma batida de frente pode passar quase toda a velocidade de uma
       bandeira para a outra e deixa-la quase parada, esperando ser atingida para
       voltar a se mexer — o que alonga a onda. Abaixo deste valor a bandeira tem
       o vetor reescalado para ele (mesma direcao). E' a unica excecao a
       conservacao de energia, e fica abaixo da velocidade inicial minima
       (velocidade x (1 - dispersion) = 58,5), entao so' age em quem foi
       "esvaziado" por um choque. */
    velocidadeMin: 50,
    /* --- colisao --- */
    /* 1 = elastico: nenhuma energia entra nem sai. E' o que evita as duas
       falhas opostas: bandeiras que aceleram sem motivo (> 1) ou que param
       e deixam a onda sem fim (< 1). */
    restituicaoParede: 1,
    restituicaoLutador: 1,
    diametroLutador: 0.11,      /* diametro de colisao entre dois centros, em fracao do lado */
    /* --- fim da onda --- */
    duracaoCoroaMin: 1500,      /* ms: piso do aviso na eliminacao, quando restam poucas bandeiras */
    duracaoCoroa: 5200,         /* ms de exibicao da vitoria antes da onda nova */
    /* quantas bandeiras vencedoras cabem no mural do cabecalho antes de virar
       so' o resto em "+N". E' o que segura o cabecalho numa colecao grande. */
    vencedorasVisiveis: 8,
    raioBorda: 182 / 400,       /* raio do anel em fracao do lado da arena */
    /* Centro do circulo em unidades do viewBox do <svg> (viewBox="0 0 400 400",
       ou seja 400/2 = 200). E' o mesmo `200` do `cx/cy="200"` do <circle> e do
       inicio do <path> do anel. A rotacao passa este valor escrita no atributo
       `transform` do <g>, em vez de resolver 50%/50% em CSS — assim o eixo de
       rotacao e' o centro geometrico por construcao e nao depende de o browser
       interpretar `transform-box`, nem de o <svg> ser quadrado. */
    centroSvg: 200,
    /* Modo de jogo. Em AMBOS a rodada termina na primeira bandeira que atravessa
       a abertura; o que muda e' o que isso significa:
         'vencedora'  : quem escapa VENCE a rodada (entra no mural de vencedoras);
         'eliminacao' : quem escapa e' ELIMINADA da partida.
       Um terceiro modo muda o que e' uma rodada:
         'ultima'     : a rodada e' uma batalha. Quem escapa sai DA RODADA (e nao
                        vence); a rodada acaba quando sobra uma so' na arena, e
                        essa vence. A abertura segue aberta ate' sobrar uma.
       Com `vencedorasVoltam` desligado, a bandeira marcada (vencedora ou
       eliminada) nao volta ao sorteio. Quando sobra uma so', a partida acaba:
       na 'vencedora' a que sobrou e' a derrotada (nunca escapou); na
       'eliminacao' e' a campea (sobreviveu a todas as rodadas). */
    modo: 'vencedora',
    obstaculo: 'nenhum',        /* o que ha' dentro do circulo (ver OBSTACULOS) */
    obstaculoGiro: 0.9,         /* rad/s das barras giratorias */
    rodadas: 0,                 /* quantas ondas tem a partida; 0 = sem limite */
    vencedorasVoltam: true,     /* false: quem ja venceu uma onda nao entra nas seguintes */
    efeitoParede: true,         /* desenha a onda de choque nas batidas na parede (so' visual) */
    corParede: 'nenhum',        /* pinta o anel numa cor nova a cada batida (ver pintarParede) */
    efeitoObstaculo: 'nenhum',  /* 'aceso' pulsa no CSS; 'pisca' acende o obstaculo no impacto */
    /* folga do CENTRO do lutador ate o anel. Precisa acomodar a propria
       bandeira: com a folga antiga (0.055) os cantos do bloco passavam do
       anel em telas grandes, porque o centro podia chegar a 0.40 do lado e a
       meia-diagonal do bloco e' ~0.61 do `--lutador`. */
    margemLutador: 0.075
  };

  /* Fotografia de fabrica do CFG, tirada no carregamento do modulo — antes de
     qualquer pagina de configuracao reescrever as chaves.

     E' por isto que ela e' uma COPIA e nao um alias: `CFG` e' mutavel de
     proposito (e' assim que o slider tem efeito sem reiniciar a arena), e um
     alias apontaria para o mesmo objeto ja mexido, perdendo a referencia.
     Quem precisa do valor original — hoje so' o multiplicador de velocidade —
     multiplica sempre a partir daqui. Sem isso, arrastar o slider de 1 para 2
     faria 1 -> 2 -> 4 -> 8, porque cada passo multiplicaria o valor corrente.

     Copia rasante, de proposito: um ajuste novo em CFG entra no BASE sem ninguem
     precisar lembrar de atualizar uma segunda lista. */
  var BASE = (function (origem) {
    var copia = {};
    for (var k in origem) {
      if (Object.prototype.hasOwnProperty.call(origem, k)) copia[k] = origem[k];
    }
    return copia;
  })(CFG);

  var FASE = { PRONTO: 'pronto', RODANDO: 'rodando', VITORIA: 'vitoria' };

  function agora() { return performance.now(); }

  /* distancia angular com sinal, no intervalo -PI..PI */
  function difAngulo(a, b) {
    var d = (a - b) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  function criarJogo(elementos) {
    var el = elementos || {};

    var estado = {
      fase: FASE.PRONTO,
      todas: [],                 /* colecao carregada (manifest ou pasta) */
      lutadores: [],             /* lutadores vivos da onda atual */
      campeao: null,            /* vencedor da onda anterior */
      vencidas: [],              /* mural: quem venceu cada onda, em ordem */
      onda: 0,
      escaparam: 0,
      restam: 0,
      abertura: -Math.PI / 2,    /* angulo da abertura, do topo no sentido do relogio */
      lado: 0,                   /* lado da arena em px */
      escala: 1,                 /* lado / CFG.ladoReferencia: le px/s como px/s */
      cx: 0, cy: 0, R: 0,        /* centro e raio do anel */
      raioJogador: 0,            /* raio maximo do centro de um lutador no anel fechado */
      tempoOnda: 0,              /* segundos desde o começo da onda (telemetria) */
      fim: false,                /* torneio sem repeticao esgotou as bandeiras */
      resultado: null,           /* lutador que escapou primeiro na onda (fecha a onda) */
      participantes: null,       /* as bandeiras que COMECARAM a partida; sao as unicas que jogam ate' o fim */
      selecao: null,             /* ids escolhidos pelo jogador para disputar (null = sorteio); ver definirSelecao */
      obstaculos: [],            /* obstaculos montados para o tamanho atual da arena */
      giroObstaculos: 0,         /* quanto as barras ja giraram, em rad */
      refVel: 0,                 /* escala de velocidade a que as velocidades guardadas correspondem */
      colisoes: 0,               /* impactos entre bandeiras nesta onda (telemetria) */
      impacto: 0,                /* soma das velocidades de aproximacao (telemetria) */
      paredeMatiz: 0,            /* matiz corrente do anel quando CFG.corParede avanca a cor */
      paredeToque: -1,           /* tempoOnda da ultima troca de cor, para nao virar ruido */
      paredeTimer: null,         /* apaga o lampejo da parede depois de um instante */
      callbacks: {},
      ultimoQuadro: 0,
      coroaTimer: null
    };

    function on(evento, fn) { estado.callbacks[evento] = fn; }
    function emitir(evento, dados) {
      if (estado.callbacks[evento]) estado.callbacks[evento](dados);
    }

    /* ---------------------------------------------------------------- */
    /* geometria                                                         */
    /* ---------------------------------------------------------------- */

    function definirTamanho(lado) {
      estado.lado = Math.max(80, lado || 400);
      estado.escala = estado.lado / CFG.ladoReferencia;
      reescalarVelocidades(); /* mesma dinamica em qualquer tamanho de arena */
      estado.cx = estado.cy = estado.lado / 2;
      estado.R = estado.lado * CFG.raioBorda;
      estado.raioJogador = estado.R - estado.lado * CFG.margemLutador;
      aplicarAbertura();
      aplicarRotacao();
      montarObstaculos();
      for (var i = 0; i < estado.lutadores.length; i++) {
        limitarAoAnel(estado.lutadores[i]);
      }
      pintar();
    }

    /* A abertura e' desenhada de verdade: o circulo que gira leva um tracejado
       com um FOLGO, e o folgo fica centrado no topo do <g> — exatamente onde
       esta a #arena-seta. O tracejado e' calculado em JS (e nao escrito a mao
       no HTML/CSS) porque o comprimento do folgo depende do raio real lido do
       elemento e do angulo em CFG.aberturaMeiaLargura: mudando um dos dois,
       o portao continua a bater certo com a regra de fuga.

       Num <circle> o traco comeca as 3h e corre no sentido horario, logo o
       topo fica em 3/4 do perimetro. O padrao `arco folga` comeca em
       `-stroke-dashoffset`, e o que queremos e' que o FOLGA comece meia-abertura
       antes do topo. */
    function abrirTracejado(r) {
      var perimetro = 2 * Math.PI * r;
      var meia = CFG.aberturaMeiaLargura * r;              /* comprimento de arco de meia abertura */
      var folga = Math.min(perimetro * 0.9, meia * 2);
      var arco = perimetro - folga;
      var topo = perimetro * 0.75;
      return { arco: arco, folga: folga, offset: arco - topo + meia };
    }

    function aplicarAbertura() {
      var anel = el.arenaAnelGiro;
      if (!anel) return;
      /* o r manda: o desenho e' a verdade, e nao uma copia do CFG */
      var r = parseFloat(anel.getAttribute('r'));
      if (!(r > 0)) r = CFG.raioBorda * 400;
      var d = abrirTracejado(r);
      /* numero cheio, sem arredondar: o desenho e' a verdade da fisica, e
         um toFixed(3) deixaria o portão deslocado alguns centesimos de pixel
         para tras do sitio onde a bandeira realmente sai */
      anel.setAttribute('stroke-dasharray', d.arco + ' ' + d.folga);
      anel.setAttribute('stroke-dashoffset', String(d.offset));
    }

    /* A abertura ja nao e' desenhada: e' so um angulo guardado em
       estado.abertura. O unico elemento visivel que gira com ele e' o marcador
       #arena-seta, pelo que continua dentro do <g id="arena-giro"> — o mesmo
       container que antes partilhava com o anel. A regra de fuga (naAbertura)
       le o mesmo angulo, portanto seta e fuga andam juntas sem mais nada. */
    function aplicarRotacao() {
      if (el.arenaGiro) {
        /* Rotacao SVG nativa: `rotate(angulo 200 200)`. O centro vem escrito no
           proprio atributo, em unidades do viewBox — as mesmas do `r="182"` do
           circulo e do `cx/cy="200"`. Logo o eixo coincide com o centro das
           bandeiras por construcao, e continua a coincidir em qualquer tamanho
           de ecra, qualquer browser e qualquer zoom: nao ha px de CSS, nem
           percentagem, nem transform-box envolvido. */
        el.arenaGiro.setAttribute('transform',
          'rotate(' + (estado.abertura * 180 / Math.PI) + ' ' + CFG.centroSvg + ' ' + CFG.centroSvg + ')');
      }
    }

    function naAbertura(l) {
      var dx = l.x - estado.cx, dy = l.y - estado.cy;
      if (dx === 0 && dy === 0) return false;
      var ang = Math.atan2(dx, -dy); /* 0 no topo, cresce no sentido do relogio */
      return Math.abs(difAngulo(ang, estado.abertura)) <= CFG.aberturaMeiaLargura;
    }

    /* O fator que converte as constantes (px/s numa arena de referencia) em
       px/s reais: tamanho da arena x multiplicador de velocidade do ajuste. As
       velocidades guardadas em cada bandeira correspondem a `refVel`; quando a
       arena ou o ajuste mudam, todas sao multiplicadas pela razao, o que mantem
       direcao e proporcoes e nao injeta energia. */
    function fatorVel() { return estado.escala * CFG.velocidade; }

    function reescalarVelocidades() {
      var novo = fatorVel();
      if (estado.refVel > 0 && novo > 0 && novo !== estado.refVel) {
        var k = novo / estado.refVel;
        for (var i = 0; i < estado.lutadores.length; i++) {
          estado.lutadores[i].vx *= k;
          estado.lutadores[i].vy *= k;
        }
      }
      estado.refVel = novo;
    }

    /* Onde esta a bandeira, em angulo e raio. Perto do centro o angulo e'
       instavel (atan2 oscila), entao ai devolvemos o ultimo angulo guardado. */
    function ondeEsta(l) {
      var dx = l.x - estado.cx, dy = l.y - estado.cy;
      var dist = Math.hypot(dx, dy);
      if (dist < 1e-6) return { ang: l.angulo, dist: 0, nx: 0, ny: 0 };
      var ang = Math.atan2(dx, -dy);
      l.angulo = ang;
      return { ang: ang, dist: dist, nx: dx / dist, ny: dy / dist };
    }

    /* Colisao com o anel. Geometria: o centro da bandeira pode ir ate
       `raioJogador` (= R menos a folga do corpo). Dai para fora so' ha' parede
       fora do setor da abertura.

         - fora do setor (ou se so' resta uma bandeira): parede. A velocidade e'
           refletida na normal radial (v -= (1+e)(v.n)n, so' se ela vai para fora)
           e a posicao e' recuada apenas o que penetrou.
         - dentro do setor: nao ha' parede, nada e' alterado. A bandeira segue a
           trajetoria que ja tinha; se chegar ao raio do anel visivel, escapou.

       A abertura nunca empurra nem puxa: so' deixa de existir parede nela.
       Devolve true quando a bandeira escapou. */
    function baterNoAnel(l) {
      var o = ondeEsta(l);
      if (o.dist <= estado.raioJogador) return false;

      var aberta = (CFG.modo === 'ultima' ? estado.restam > 1 : !estado.resultado) && naAbertura(l);
      if (aberta) return o.dist >= estado.R;

      l.x = estado.cx + o.nx * estado.raioJogador;
      l.y = estado.cy + o.ny * estado.raioJogador;
      var dot = l.vx * o.nx + l.vy * o.ny;
      if (dot > 0) {
        l.vx -= (1 + CFG.restituicaoParede) * dot * o.nx;
        l.vy -= (1 + CFG.restituicaoParede) * dot * o.ny;
        efeitoParede(l, o, dot);
        pintarParede();
      }
      return false;
    }

    /* Efeito visual da batida na parede: so' desenho, nao mexe na fisica. Nasce
       no ponto do anel onde a bandeira bateu (centro + normal * R), com tamanho
       proporcional a velocidade do impacto. Roda no container `el.efeitos`
       (opcional) e some sozinho. Toques fracos (raspao) e repetidos em
       sequencia da mesma bandeira sao ignorados, para nao virar ruido. */
    function efeitoParede(l, o, dot) {
      if (!el.efeitos || !CFG.efeitoParede) return;
      var forca = dot / estado.escala / CFG.velocidade;       /* ~1 = batida de frente na velocidade base */
      if (forca < 0.12) return;
      if (estado.tempoOnda - (l.ultimoToque || -1) < 0.15) return;
      l.ultimoToque = estado.tempoOnda;
      if (el.efeitos.children.length >= 24) return;

      var fx = document.createElement('span');
      fx.className = 'efeito-impacto';
      fx.style.setProperty('--x', (o.nx * estado.R) + 'px');
      fx.style.setProperty('--y', (o.ny * estado.R) + 'px');
      fx.style.setProperty('--ang', (Math.atan2(o.ny, o.nx) * 180 / Math.PI) + 'deg');
      fx.style.setProperty('--forca', String(Math.min(1.6, 0.6 + forca * 0.6)));
      el.efeitos.appendChild(fx);
      setTimeout(function () { if (fx.parentNode) fx.parentNode.removeChild(fx); }, 560);
    }

    /* Cor da parede ao bater: a cada batida, o anel acende numa cor nova. Puro
       desenho — a fisica nao ve nada disto. `estado.paredeMatiz` caminha pela
       roda de cores; um piso de tempo evita a metralhadora de cores quando a
       bandeira raspa a parede varias vezes seguidas. */
    function pintarParede() {
      var anel = el.arenaAnelGiro;
      if (!anel || !anel.style || CFG.corParede === 'nenhum') return;
      if (estado.tempoOnda - estado.paredeToque < 0.1) return;
      estado.paredeToque = estado.tempoOnda;

      var h;
      if (CFG.corParede === 'sorteia') {
        h = Math.random() * 360;
      } else {
        estado.paredeMatiz = (estado.paredeMatiz + 47) % 360;
        h = estado.paredeMatiz;
      }
      anel.style.stroke = 'hsl(' + Math.round(h) + ', 90%, 62%)';

      /* Lampejo: acende a cor e apaga sozinho, voltando a cor do tema */
      if (CFG.corParede === 'pisca') {
        if (estado.paredeTimer) clearTimeout(estado.paredeTimer);
        estado.paredeTimer = setTimeout(function () {
          estado.paredeTimer = null;
          anel.style.stroke = '';
        }, 420);
      }
    }

    /* Volta o anel a cor do tema e zera o estado da cor da parede (nova onda). */
    function limparParede() {
      if (estado.paredeTimer) { clearTimeout(estado.paredeTimer); estado.paredeTimer = null; }
      estado.paredeMatiz = 0;
      estado.paredeToque = -1;
      if (el.arenaAnelGiro && el.arenaAnelGiro.style) el.arenaAnelGiro.style.stroke = '';
    }

    /* Usado no resize: traz para dentro quem ficou alem da parede. */
    function limitarAoAnel(l) {
      var o = ondeEsta(l);
      if (o.dist <= estado.raioJogador || o.dist === 0) return;
      l.x = estado.cx + o.nx * estado.raioJogador;
      l.y = estado.cy + o.ny * estado.raioJogador;
      var dot = l.vx * o.nx + l.vy * o.ny;
      if (dot > 0) { l.vx -= 2 * dot * o.nx; l.vy -= 2 * dot * o.ny; }
    }

    /* ---------------------------------------------------------------- */
    /* lutadores                                                         */
    /* ---------------------------------------------------------------- */

    /* ---------------------------------------------------------------- */
    /* obstaculos                                                        */
    /* ---------------------------------------------------------------- */

    /* Cada obstaculo e' um disco (`circulo`) ou uma capsula (`barra`: segmento de
       meia-extensao `meia` com raio `r`). Medidas em fracao do lado da arena, a
       partir do centro, para valerem em qualquer tamanho. Todos ficam dentro de
       ~0,22 do lado, deixando passagem folgada ate' o anel (que esta' a ~0,455).
       O `material` opcional (ex.: 'madeira') vira a classe `obstaculo--<material>`,
       que o CSS usa para pintar o acabamento; sem ele fica o visual do tipo. */
    var OBSTACULOS = {
      nenhum: [],
      pino: [{ t: 'circulo', x: 0, y: 0, r: 0.075 }],
      'tres-pinos': [0, 1, 2].map(function (i) {
        var a = -Math.PI / 2 + i * 2 * Math.PI / 3;
        return { t: 'circulo', x: Math.cos(a) * 0.17, y: Math.sin(a) * 0.17, r: 0.045 };
      }),
      hexagono: [{ t: 'circulo', x: 0, y: 0, r: 0.035 }].concat([0, 1, 2, 3, 4, 5].map(function (i) {
        var a = -Math.PI / 2 + i * Math.PI / 3;
        return { t: 'circulo', x: Math.cos(a) * 0.21, y: Math.sin(a) * 0.21, r: 0.035 };
      })),
      barra: [{ t: 'barra', x: 0, y: 0, meia: 0.17, r: 0.028, ang: 0, gira: true }],
      cruz: [
        { t: 'barra', x: 0, y: 0, meia: 0.17, r: 0.028, ang: 0, gira: true, material: 'madeira' },
        { t: 'barra', x: 0, y: 0, meia: 0.17, r: 0.028, ang: Math.PI / 2, gira: true, material: 'madeira' }
      ],
      /* Tres cruzes (cada uma dois traços perpendiculares) em triangulo, cada
         uma girando em torno do proprio centro. Afastadas o bastante para nao se
         tocarem (centros a ~0,294 um do outro) e com braços menores que os da cruz
         unica; o extremo fica a ~0,25 do centro, ainda folgado ate' o anel (~0,455). */
      'tres-cruzes': (function () {
        var barras = [];
        for (var i = 0; i < 3; i++) {
          var a = -Math.PI / 2 + i * 2 * Math.PI / 3;
          var x = Math.cos(a) * 0.17, y = Math.sin(a) * 0.17;
          barras.push({ t: 'barra', x: x, y: y, meia: 0.06, r: 0.02, ang: 0, gira: true, material: 'madeira' });
          barras.push({ t: 'barra', x: x, y: y, meia: 0.06, r: 0.02, ang: Math.PI / 2, gira: true, material: 'madeira' });
        }
        return barras;
      })()
    };

    function limparObstaculos() {
      for (var i = 0; i < estado.obstaculos.length; i++) {
        var n = estado.obstaculos[i].el;
        if (n && n.parentNode) n.parentNode.removeChild(n);
      }
      estado.obstaculos = [];
    }

    /* Refeito a cada `definirTamanho` (que o app chama ao mudar o ajuste e ao
       redimensionar): as medidas em px dependem do lado atual. As barras guardam
       o quanto ja giraram (`giro`) para nao "pularem" quando um slider refaz tudo. */
    function montarObstaculos() {
      var giro = estado.giroObstaculos || 0;
      limparObstaculos();
      var modelo = OBSTACULOS[CFG.obstaculo] || OBSTACULOS.nenhum;
      var L = estado.lado;
      for (var i = 0; i < modelo.length; i++) {
        var m = modelo[i];
        var o = {
          t: m.t,
          x: m.x * L, y: m.y * L,
          r: m.r * L,
          meia: (m.meia || 0) * L,
          base: m.ang || 0,
          ang: (m.ang || 0) + (m.gira ? giro : 0),
          gira: !!m.gira,
          acesoAte: 0,            /* tempoOnda ate' quando o neon da batida fica aceso */
          el: null
        };
        if (el.obstaculos) {
          var d = document.createElement('div');
          d.className = 'obstaculo obstaculo--' + m.t + (m.material ? ' obstaculo--' + m.material : '');
          var w = m.t === 'barra' ? 2 * (o.meia + o.r) : 2 * o.r;
          d.style.width = w + 'px';
          d.style.height = (2 * o.r) + 'px';
          d.style.marginLeft = (-w / 2) + 'px';
          d.style.marginTop = (-o.r) + 'px';
          el.obstaculos.appendChild(d);
          o.el = d;
        }
        estado.obstaculos.push(o);
      }
      pintarObstaculos();
    }

    function pintarObstaculos() {
      for (var i = 0; i < estado.obstaculos.length; i++) {
        var o = estado.obstaculos[i];
        if (!o.el) continue;
        o.el.style.transform = 'translate(' + o.x + 'px,' + o.y + 'px) rotate(' + (o.ang * 180 / Math.PI) + 'deg)';
      }
    }

    /* Gira as barras (o angulo e' o mesmo desenhado em pintarObstaculos). */
    function girarObstaculos(dt) {
      if (!estado.obstaculos.length) return;
      var d = CFG.obstaculoGiro * dt;
      estado.giroObstaculos = (estado.giroObstaculos || 0) + d;
      for (var i = 0; i < estado.obstaculos.length; i++) {
        if (estado.obstaculos[i].gira) estado.obstaculos[i].ang += d;
      }
      pintarObstaculos();
    }

    /* Ponto do obstaculo mais proximo de (px, py): o proprio centro no disco; o
       ponto do segmento no caso da barra. Devolve tambem a velocidade desse ponto
       da superficie (a barra gira) para a reflexao ser feita no referencial dela. */
    function maisProximo(o, px, py) {
      var ox = estado.cx + o.x, oy = estado.cy + o.y;
      if (o.t !== 'barra') return { x: ox, y: oy, vx: 0, vy: 0 };
      var ux = Math.cos(o.ang), uy = Math.sin(o.ang);
      var t = (px - ox) * ux + (py - oy) * uy;
      t = Math.max(-o.meia, Math.min(o.meia, t));
      var qx = ox + ux * t, qy = oy + uy * t;
      var w = o.gira ? CFG.obstaculoGiro : 0;
      return { x: qx, y: qy, vx: -w * (qy - oy), vy: w * (qx - ox) };
    }

    /* Bandeira (disco de raio rf) contra obstaculos: separa pela normal e, se
       esta' se aproximando da superficie, reflete a velocidade relativa a ela
       (elastico, restituicao 1). Sem forca extra: so' reflexao. */
    function colidirObstaculos() {
      if (!estado.obstaculos.length) return;
      /* neon da batida: apaga quem ja' passou do tempo (so' a classe muda; o
         desenho e' do CSS) antes de resolver as colisoes deste quadro */
      for (var a = 0; a < estado.obstaculos.length; a++) {
        var oa = estado.obstaculos[a];
        if (oa.acesoAte && estado.tempoOnda >= oa.acesoAte) {
          oa.acesoAte = 0;
          if (oa.el && oa.el.classList) oa.el.classList.remove('obstaculo--acesa');
        }
      }
      var rf = estado.lado * CFG.diametroLutador / 2;
      for (var i = 0; i < estado.lutadores.length; i++) {
        var l = estado.lutadores[i];
        if (l.escapando) continue;
        for (var k = 0; k < estado.obstaculos.length; k++) {
          var o = estado.obstaculos[k];
          var q = maisProximo(o, l.x, l.y);
          var dx = l.x - q.x, dy = l.y - q.y;
          var d = Math.hypot(dx, dy);
          var min = rf + o.r;
          if (d >= min) continue;
          var nx = 1, ny = 0;
          if (d > 1e-6) { nx = dx / d; ny = dy / d; }
          l.x = q.x + nx * min;
          l.y = q.y + ny * min;
          var rel = (l.vx - q.vx) * nx + (l.vy - q.vy) * ny;
          if (rel < 0) {
            l.vx -= (1 + CFG.restituicaoParede) * rel * nx;
            l.vy -= (1 + CFG.restituicaoParede) * rel * ny;
            emitir('colisao', { forca: -rel / (estado.escala * CFG.velocidade) });
            acenderObstaculo(o);
          }
        }
      }
    }

    /* Neon no impacto (CFG.efeitoObstaculo === 'pisca'): o obstaculo ganha a
       classe que o CSS anima; some sozinho quando passar a esquadria de tempo.
       Puro desenho — nao mexe em velocidade nem posicao. */
    function acenderObstaculo(o) {
      if (CFG.efeitoObstaculo !== 'pisca' || !o.el || !o.el.classList) return;
      o.acesoAte = estado.tempoOnda + 0.45;
      o.el.classList.add('obstaculo--acesa');
    }

    /* Apaga o neon da batida de todos os obstaculos (comeco de onda). */
    function limparObstaculosAcesos() {
      for (var i = 0; i < estado.obstaculos.length; i++) {
        var o = estado.obstaculos[i];
        o.acesoAte = 0;
        if (o.el && o.el.classList) o.el.classList.remove('obstaculo--acesa');
      }
    }

    /* true se um disco de raio `folga` em (x, y) tocaria algum obstaculo */
    function dentroDeObstaculo(x, y, folga) {
      for (var k = 0; k < estado.obstaculos.length; k++) {
        var o = estado.obstaculos[k];
        var q = maisProximo(o, x, y);
        if (Math.hypot(x - q.x, y - q.y) < o.r + folga) return true;
      }
      return false;
    }

    function criarLutador(flag, opts) {
      var o = opts || {};
      /* `answer` e' minuscula porque e' a forma comparada; o que o olho le e'
         `exibir`, que devolve a mesma palavra com a inicial em maiuscula */
      var nome = Bandeiras.nome(flag);
      var elL = document.createElement('div');
      elL.className = 'lutador' + (o.campeao ? ' lutador--campeao' : '');
      elL.setAttribute('role', 'img');
      elL.setAttribute('aria-label', nome);
      elL.title = nome + (o.campeao ? ' (campeã)' : '');
      elL.dataset.id = flag.id;

      var img = document.createElement('img');
      img.src = flag.urlObravelho || flag.src;
      img.alt = nome;
      elL.appendChild(img);

      /* posicao inicial: aleatoria dentro do anel, sem sobrepor quem ja entrou
         (senao o primeiro quadro seria uma rajada de separacoes) */
      var minD = estado.lado * CFG.diametroLutador;
      var x = estado.cx, y = estado.cy;
      for (var t = 0; t < 60; t++) {
        var a0 = Math.random() * Math.PI * 2;
        var r0 = estado.raioJogador * 0.9 * Math.sqrt(Math.random());
        x = estado.cx + Math.cos(a0) * r0;
        y = estado.cy + Math.sin(a0) * r0;
        var livre = !dentroDeObstaculo(x, y, minD / 2 + 4);
        for (var k = 0; livre && k < (o.existentes || []).length; k++) {
          if (Math.hypot(o.existentes[k].x - x, o.existentes[k].y - y) < minD) { livre = false; break; }
        }
        if (livre) break;
      }

      /* velocidade inicial: unico sorteio de rumo e modulo. Dai em diante so'
         colisoes a alteram. */
      var vel = fatorVel() * (1 + (Math.random() - 0.5) * 2 * CFG.dispersion);
      var rumo = Math.random() * Math.PI * 2;

      var l = {
        flag: flag,
        el: elL,
        x: x,
        y: y,
        vx: Math.cos(rumo) * vel,
        vy: Math.sin(rumo) * vel,
        angulo: Math.atan2(x - estado.cx, -(y - estado.cy)),
        escapando: false,
        campeao: !!o.campeao
      };
      return l;
    }

    function pintar() {
      for (var i = 0; i < estado.lutadores.length; i++) {
        var l = estado.lutadores[i];
        /* quem esta escapando ja tem transform proprio (o deslize para fora):
           sobrescrever aqui devolveria a bandeira para a borda */
        if (l.escapando) continue;
        l.el.style.transform =
          'translate3d(' + (l.x - estado.cx) + 'px,' + (l.y - estado.cy) + 'px,0)';
      }
    }

    /* ---------------------------------------------------------------- */
    /* ondas                                                             */
    /* ---------------------------------------------------------------- */

    /* Com `vencedorasVoltam` desligado, quem ja ganhou uma onda sai do sorteio
       para sempre (ate reiniciar a arena). Ligado, nao ha' ninguem banido. */
    function idsDeVencedoras() {
      var ids = {};
      if (CFG.vencedorasVoltam) return ids;
      for (var i = 0; i < estado.vencidas.length; i++) ids[estado.vencidas[i].flag.id] = true;
      return ids;
    }

    /* As bandeiras de uma partida sao sorteadas UMA vez, no comeco (as primeiras
       `lutadoresIniciais` da colecao embaralhada), e sao sempre as mesmas ate' o
       fim: nenhuma bandeira nova entra em rodada seguinte. `participantes` volta
       a null quando uma partida nova comeca (iniciar, pronto, preparar). */
    function garantirParticipantes() {
      if (!estado.participantes) {
        /* o jogador escolheu quem joga: sao exatamente essas (de 2 para cima; uma
           so' nao tem contra quem disputar, entao cai no sorteio) */
        var sel = estado.selecao;
        var escolhidas = sel ? estado.todas.filter(function (f) { return sel[f.id]; }) : [];
        if (escolhidas.length >= 2) {
          estado.participantes = escolhidas;
        } else {
          var alvo = Math.min(CFG.lutadoresIniciais, estado.todas.length);
          estado.participantes = Bandeiras.embaralhar(estado.todas).slice(0, alvo);
        }
      }
      return estado.participantes;
    }

    /* Bandeiras que o jogador quer na partida (lista de ids; vazia ou null volta ao
       sorteio). So' vale para a PROXIMA partida: quem esta jogando segue com as suas.
       Quem chama decide se refaz a arena parada (`pronto()`). */
    function definirSelecao(ids) {
      if (!ids || !ids.length) { estado.selecao = null; return; }
      var s = {};
      for (var i = 0; i < ids.length; i++) s[ids[i]] = true;
      estado.selecao = s;
    }

    /* quem ainda pode jogar: os participantes que nao estao banidas */
    function elegiveis() {
      var banidas = idsDeVencedoras();
      return garantirParticipantes().filter(function (f) { return !banidas[f.id]; });
    }

    function lotsAlvos() {
      /* primeiro a campea (se houver); depois as demais participantes elegiveis */
      var lista = [];
      var vistos = {};
      var banidas = idsDeVencedoras();
      if (CFG.modo !== 'eliminacao' && estado.campeao && !banidas[estado.campeao.id]) {
        lista.push(estado.campeao);
        vistos[estado.campeao.id] = true;
      }
      var restantes = elegiveis().filter(function (f) { return !vistos[f.id]; });
      return lista.concat(Bandeiras.embaralhar(restantes));
    }

    function montarOnda() {
      limparLutadores();
      estado.escaparam = 0;
      estado.restam = 0;
      estado.tempoOnda = 0;
      estado.resultado = null;
      limparParede();
      limparObstaculosAcesos();

      var alvos = lotsAlvos();
      estado.refVel = fatorVel();
      var nascidos = [];
      alvos.forEach(function (f) {
        var l = criarLutador(f, {
          campeao: estado.campeao && f.id === estado.campeao.id,
          existentes: nascidos
        });
        if (el.lutadores) el.lutadores.appendChild(l.el);
        nascidos.push(l);
      });
      estado.lutadores = nascidos;
      estado.restam = estado.lutadores.length;
      estado.onda += 1;

      esconderCoroa();
      atualizarContadores(true);
      if (el.onda) el.onda.textContent = estado.onda;
      emitir('onda', { onda: estado.onda, lutadores: estado.lutadores.length });

      pintar();
      /* modo 'ultima' com uma unica bandeira: nao ha' contra quem lutar, ela vence */
      if (CFG.modo === 'ultima' && estado.fase !== FASE.PRONTO && estado.lutadores.length <= 1) coroa();
      return estado.lutadores;
    }

    function limparLutadores() {
      for (var i = 0; i < estado.lutadores.length; i++) {
        var n = estado.lutadores[i].el;
        if (n.parentNode) n.parentNode.removeChild(n);
      }
      estado.lutadores = [];
    }

    /* ---------------------------------------------------------------- */
    /* contadores e fantasma das que escaparam                           */
    /* ---------------------------------------------------------------- */

    function atualizarContadores(forcar) {
      if (el.contadorEscaparam) {
        var c = String(estado.escaparam);
        if (forcar || el.contadorEscaparam.textContent !== c) {
          el.contadorEscaparam.textContent = c;
          pulsar(el.contadorEscaparam);
        }
      }
      if (el.contadorRestam) {
        var r = String(estado.restam);
        if (forcar || el.contadorRestam.textContent !== r) {
          el.contadorRestam.textContent = r;
          pulsar(el.contadorRestam);
        }
      }
    }

    function pulsar(node) {
      if (!node || !node.classList) return;
      node.classList.remove('pulsa');
      /* forca reflow para reiniciar a animacao */
      void node.offsetWidth;
      node.classList.add('pulsa');
    }

    function registrarFantasma(flag) {
      if (!el.fantasmasEscaparam) return;
      var img = document.createElement('img');
      img.src = flag.urlObravelho || flag.src;
      img.alt = '';
      el.fantasmasEscaparam.appendChild(img);
      while (el.fantasmasEscaparam.children.length > 40) {
        el.fantasmasEscaparam.removeChild(el.fantasmasEscaparam.firstChild);
      }
    }

    /* ---------------------------------------------------------------- */
    /* mural das vencedoras                                              */
    /* ---------------------------------------------------------------- */

    /* Uma linha por BANDEIRA, nao por vitória: quem ganha duas ondas aparece
       uma vez so, com o placado ao lado do nome. A ordem e' da vitória mais
       recente para a mais antiga: durante a partida interessa quem acabou de
       se dar bem, e o historico longo e' o que fica para tras do corte. */
    function agruparVencedoras() {
      var porId = Object.create(null);
      var ordem = [];
      for (var i = 0; i < estado.vencidas.length; i++) {
        var v = estado.vencidas[i];
        var linha = porId[v.flag.id];
        if (!linha) {
          linha = porId[v.flag.id] = { flag: v.flag, vitorias: 0, ultimaOnda: v.onda };
          ordem.unshift(linha);           /* unshift: do fim para o começo */
        }
        linha.vitorias += 1;
      }
      return ordem;
    }

    /* O mural e' redesenhado inteiro a cada coroa. Sao poucas dezenas de nos,
       nao ha ganho em fazer reconcile: o que importa e' que ele fique
       exatamente igual ao estado, sem sobra de onda antiga na tela. */
    function pintarVencedoras() {
      if (el.vencedorasTitulo) {
        el.vencedorasTitulo.textContent = CFG.modo === 'eliminacao' ? 'eliminadas' : 'vencedoras';
      }
      var lista = el.vencedorasLista;
      if (lista) {
        lista.textContent = '';

        var ordem = agruparVencedoras();
        var visiveis = ordem.slice(0, CFG.vencedorasVisiveis);

        for (var i = 0; i < visiveis.length; i++) {
          lista.appendChild(linhaVencedora(visiveis[i], i === 0));
        }

        /* o que nao coube nao some: vira um contador que diz quem ficou de fora */
        if (ordem.length > visiveis.length) {
          var resto = document.createElement('span');
          resto.className = 'vencedoras-resto';
          resto.textContent = '+' + (ordem.length - visiveis.length);
          resto.title = ordem.slice(CFG.vencedorasVisiveis)
            .map(function (l) { return Bandeiras.nome(l.flag); }).join(', ');
          lista.appendChild(resto);
        }

        if (el.vencedorasTotal) {
          el.vencedorasTotal.textContent = estado.vencidas.length ? String(estado.vencidas.length) : '';
        }
      }
      if (el.vencedorasVazia) el.vencedorasVazia.hidden = estado.vencidas.length > 0;
    }

function linhaVencedora(linha, recente) {
      var nome = Bandeiras.nome(linha.flag);
      var chip = document.createElement('span');
      chip.className = 'vencedora' + (recente ? ' vencedora--recente' : '');
      chip.title = nome + ' — ' + linha.vitorias +
        (linha.vitorias === 1 ? ' vitória' : ' vitórias') +
        ', ultima na onda ' + linha.ultimaOnda;

      var img = document.createElement('img');
      img.src = linha.flag.urlObravelho || linha.flag.src;
      img.alt = nome;
      img.draggable = false;
      chip.appendChild(img);

      var rotulo = document.createElement('span');
      rotulo.className = 'vencedora-nome';
      rotulo.textContent = nome;
      chip.appendChild(rotulo);

      /* quem ganhou mais de uma vez leva o placado junto do nome */
      if (linha.vitorias > 1) {
        var vezes = document.createElement('span');
        vezes.className = 'vencedora-vezes';
        vezes.textContent = '×' + linha.vitorias;
        chip.appendChild(vezes);
      }
      return chip;
    }

    /* ---------------------------------------------------------------- */
    /* fuga                                                              */
    /* ---------------------------------------------------------------- */

    function escapar(l) {
      if (l.escapando) return;
      l.escapando = true;
      l.el.classList.add('lutador--fugindo');
      /* empurra visualmente para fora, na direcao da abertura */
      var dx = l.x - estado.cx, dy = l.y - estado.cy;
      var dist = Math.hypot(dx, dy) || 1;
      var alvoX = l.x + (dx / dist) * estado.lado * 0.45;
      var alvoY = l.y + (dy / dist) * estado.lado * 0.45;
      l.el.style.transform =
        'translate3d(' + (alvoX - estado.cx) + 'px,' + (alvoY - estado.cy) + 'px,0)';

      /* o primeiro a cruzar a abertura define o resultado da onda; ate' la' a
         abertura e' passagem, dai em diante e' parede para os outros */
      if (CFG.modo !== 'ultima' && !estado.resultado) estado.resultado = l;

      estado.escaparam += 1;
      estado.restam -= 1;
      registrarFantasma(l.flag);
      atualizarContadores(false);
      emitir('fuga', { flag: l.flag, escaparam: estado.escaparam, restam: estado.restam });

      var self = l;
      setTimeout(function () { remover(self); }, 640);
    }

    /* quem ainda conta como presente: quem ja esta escapando saiu da partida,
         mesmo antes de o no sair do DOM (a animacao leva 640ms) */
    function vivos() {
      return estado.lutadores.filter(function (l) { return !l.escapando; });
    }

    function remover(l) {
      var idx = estado.lutadores.indexOf(l);
      if (idx === -1) return;
      estado.lutadores.splice(idx, 1);
      if (l.el.parentNode) l.el.parentNode.removeChild(l.el);

      /* cada saida tenta fechar a onda; quem decide e' a coroa, que so
         corona quando sobrou uma unica e ninguem mais esta saindo da tela */
      coroa();
    }

    /* Fecha a onda e registra o resultado. Chamado por `remover` depois da
       animacao de fuga (e por `montarOnda`, no caso de uma bandeira so').

       Quem e' o resultado depende do modo:
         'vencedora' / 'eliminacao': a primeira que escapou (`estado.resultado`);
         'ultima': a unica que sobrou na arena, quando ninguem mais esta saindo. */
    function coroa() {
      if (estado.fase === FASE.VITORIA) return;

      var modo = CFG.modo === 'eliminacao' || CFG.modo === 'ultima' ? CFG.modo : 'vencedora';
      var flag;

      if (modo === 'ultima') {
        var sobrou = vivos();
        if (sobrou.length > 1) return; /* ainda tem batalha */
        for (var i = 0; i < estado.lutadores.length; i++) {
          if (estado.lutadores[i].escapando) return; /* animacao de fuga em curso */
        }
        if (!sobrou[0]) { estado.fase = FASE.VITORIA; proximaOnda(); return; }
        flag = sobrou[0].flag;
      } else {
        var res = estado.resultado;
        if (!res) return;
        for (var k = 0; k < estado.lutadores.length; k++) {
          if (estado.lutadores[k].escapando) return;
        }
        flag = res.flag;
      }

      estado.fase = FASE.VITORIA;
      estado.resultado = null;

      /* `campeao` e' quem volta defendendo o titulo: existe nos modos em que a
         marcada VENCEU a rodada. Na eliminacao, quem escapou esta' fora. */
      estado.campeao = modo === 'eliminacao' ? null : flag;
      /* o mural e' o unico registro de quem foi marcada em cada onda */
      estado.vencidas.push({ onda: estado.onda, flag: flag, modo: modo });
      pintarVencedoras();
      mostrarCoroa(flag, modo === 'eliminacao' ? 'eliminada' : (modo === 'ultima' ? 'ultima' : 'vencedora'));

      emitir('vitoria', {
        flag: flag,
        onda: estado.onda,
        ondas: estado.vencidas.length,
        modo: modo
      });

      if (estado.coroaTimer) clearTimeout(estado.coroaTimer);
      estado.coroaTimer = setTimeout(proximaOnda, duracaoDaCoroa());
    }

    /* Tempo do aviso de quem escapou primeiro. No modo vencedora e' sempre
       `duracaoCoroa`. Na eliminacao ele encurta com o avanco da partida: vale
       `duracaoCoroa` com todas em jogo e desce linearmente ate' `duracaoCoroaMin`
       quando sobram so' as ultimas (proporcao de bandeiras ainda sem marca). Com
       "Vencedoras voltam" ligado ninguem sai, a proporcao fica em 1 e nada muda. */
    function duracaoDaCoroa() {
      if (CFG.modo !== 'eliminacao') return CFG.duracaoCoroa;
      var total = garantirParticipantes().length;
      if (!total) return CFG.duracaoCoroa;
      var vivas = elegiveis().length;
      var fracao = Math.max(0, Math.min(1, vivas / total));
      return Math.round(CFG.duracaoCoroaMin + (CFG.duracaoCoroa - CFG.duracaoCoroaMin) * fracao);
    }

    /* `tipo`: 'vencedora' | 'eliminada' | 'campea' | 'derrotada'. O painel e' o
       mesmo; muda o texto da legenda e o `data-tipo`, que o CSS usa para a cor. */
    var LEGENDAS = {
      vencedora: 'escapou primeiro: vence a rodada',
      ultima: 'a ultima na arena: vence a rodada',
      eliminada: 'escapou primeiro: eliminada',
      campea: 'sobreviveu a todas as rodadas',
      derrotada: 'nunca escapou: derrotada'
    };

    /* `legenda` sobrepoe o texto padrao do tipo (a campea das rodadas conta
       quantas venceu, por exemplo) sem precisar de um tipo novo. */
    function mostrarCoroa(flag, tipo, legenda) {
      if (el.coroa) {
        el.coroa.hidden = false;
        if (el.coroa.setAttribute) el.coroa.setAttribute('data-tipo', tipo);
      }
      /* a bandeira vive em `flag.src` (imagem) e o nome em `flag.answer`;
         o glifo da coroa no HTML so fica como marcador de posicao */
      if (el.coroaIcone) {
        var img = document.createElement('img');
        img.src = flag.src || '';
        img.alt = '';
        img.draggable = false;
        el.coroaIcone.textContent = '';
        el.coroaIcone.appendChild(img);
      }
      if (el.coroaNome) el.coroaNome.textContent = Bandeiras.nome(flag);
      if (el.coroaLegenda) el.coroaLegenda.textContent = legenda || LEGENDAS[tipo] || '';
    }

    function esconderCoroa() {
      if (estado.coroaTimer) { clearTimeout(estado.coroaTimer); estado.coroaTimer = null; }
      if (el.coroa) el.coroa.hidden = true;
    }

    /* Campea de uma partida por rodadas. So' faz sentido quando as vencedoras
       voltam (a mesma bandeira pode vencer mais de uma vez) e no modo em que
       uma bandeira VENCE a rodada — na eliminacao o mural marca quem saiu, nao
       quem ganhou, e nao ha' titulo a defender. E' campea quem venceu MAIS
       rodadas que todas as outras, com pelo menos duas: um empate no topo nao
       elege ninguem. */
    function campeaDasRodadas() {
      if (!CFG.vencedorasVoltam) return null;
      if (CFG.modo === 'eliminacao') return null;

      var contagem = {};
      var flags = {};
      var ordem = [];
      for (var i = 0; i < estado.vencidas.length; i++) {
        var f = estado.vencidas[i].flag;
        if (!f || f.id == null) continue;
        if (contagem[f.id] == null) { contagem[f.id] = 0; flags[f.id] = f; ordem.push(f.id); }
        contagem[f.id] += 1;
      }

      var melhor = null;
      var melhorN = 0;
      var empate = false;
      for (var j = 0; j < ordem.length; j++) {
        var n = contagem[ordem[j]];
        if (n > melhorN) { melhorN = n; melhor = ordem[j]; empate = false; }
        else if (n === melhorN) { empate = true; }
      }
      if (!melhor || empate || melhorN < 2) return null;
      return { flag: flags[melhor], vitorias: melhorN };
    }

    /* fim da partida: a coroa da ultima onda fica na tela e o app e' avisado uma
       unica vez. `motivo`: 'rodadas' (chegou ao limite) ou 'bandeiras' (acabaram
       as que ainda nao venceram). Reiniciar zera `fim`. */
    function terminar(motivo) {
      if (estado.fim) return;
      estado.fim = true;
      var dados = { ondas: estado.vencidas.length, motivo: motivo, modo: CFG.modo };

      /* acabou o limite de rodadas: se uma bandeira venceu mais rodadas que as
         outras (e as vencedoras voltam), ela e' a campea da partida e a coroa
         passa a contar as rodadas dela. Sem campea, fica a coroa da ultima
         rodada como esta'. */
      if (motivo === 'rodadas') {
        var campeaR = campeaDasRodadas();
        if (campeaR) {
          dados.flag = campeaR.flag;
          dados.tipo = 'campea';
          dados.vitorias = campeaR.vitorias;
          if (estado.coroaTimer) { clearTimeout(estado.coroaTimer); estado.coroaTimer = null; }
          mostrarCoroa(campeaR.flag, 'campea',
            'venceu ' + campeaR.vitorias + ' de ' + estado.vencidas.length + ' rodadas: campeã');
        }
      }

      /* acabaram as bandeiras sem marca: a que sobrou fecha a partida. Na
         eliminacao ela sobreviveu a todas as rodadas (campea); no outro modo ela
         nunca escapou (derrotada). */
      if (motivo === 'bandeiras') {
        var sobrou = elegiveis()[0];
        if (sobrou) {
          dados.flag = sobrou;
          dados.tipo = CFG.modo === 'eliminacao' ? 'campea' : 'derrotada';
          if (estado.coroaTimer) { clearTimeout(estado.coroaTimer); estado.coroaTimer = null; }
          mostrarCoroa(sobrou, dados.tipo);
        }
      }
      emitir('fim', dados);
    }

    function proximaOnda() {
      if (estado.fase !== FASE.VITORIA) return;
      /* colecao de uma unica bandeira nao tem o que sortear: fica na vitoria */
      if (estado.todas.length < 2) { estado.fase = FASE.VITORIA; return; }
      /* sem repeticao de vencedoras, o torneio acaba quando sobram menos de duas
         bandeiras que ainda nao venceram: nao ha' disputa possivel. A coroa
         continua na tela e o app e' avisado. */
      if (CFG.rodadas > 0 && estado.onda >= CFG.rodadas) { terminar('rodadas'); return; }
      if (!CFG.vencedorasVoltam) {
        var restam = elegiveis().length;
        if (restam < 2) { terminar('bandeiras'); return; }
      }
      estado.fase = FASE.RODANDO;
      esconderCoroa();
      montarOnda();
      /* o proximo quadro mede o intervalo desde a montagem da onda, e nao
         desde o ultimo quadro da onda que acabou (que pode ter sido parado) */
      estado.ultimoQuadro = agora();
    }

    /* ---------------------------------------------------------------- */
    /* laco principal                                                    */
    /* ---------------------------------------------------------------- */

    function passo(dt) {
      if (estado.fase !== FASE.RODANDO) return;
      if (!estado.lutadores.length) { proximaOnda(); return; }

      estado.abertura = (estado.abertura + CFG.aberturaVelocidade * dt) % (Math.PI * 2);
      if (estado.abertura < 0) estado.abertura += Math.PI * 2;
      estado.tempoOnda += dt;

      /* o slider de velocidade multiplica as velocidades ja em curso */
      reescalarVelocidades();
      var velMax = CFG.velocidadeMax * estado.escala;

      girarObstaculos(dt);

      /* 1. integra: posicao += velocidade * dt. Nenhuma outra coisa mexe na
            velocidade aqui — sem forca, sem direcao desejada, sem ruido. */
      for (var i = 0; i < estado.lutadores.length; i++) {
        var l = estado.lutadores[i];
        if (l.escapando) continue;
        l.x += l.vx * dt;
        l.y += l.vy * dt;
      }

      /* 2. bandeira x bandeira (todas contra todas, so' as que ainda jogam) */
      colidirLutadores();
      /* 2b. bandeira x obstaculo (se houver) */
      colidirObstaculos();

      /* 3. bandeira x anel: reflexao na parede; na abertura, passagem */
      for (var j = 0; j < estado.lutadores.length; j++) {
        var m = estado.lutadores[j];
        if (m.escapando) continue;
        if (baterNoAnel(m)) escapar(m);
      }

      /* piso e teto de velocidade (ver CFG.velocidadeMin / velocidadeMax) */
      var velMin = CFG.velocidadeMin * estado.escala;
      for (var q = 0; q < estado.lutadores.length; q++) {
        var n = estado.lutadores[q];
        if (n.escapando) continue;
        var sp = Math.hypot(n.vx, n.vy);
        if (sp > velMax) { n.vx = n.vx / sp * velMax; n.vy = n.vy / sp * velMax; }
        else if (sp < velMin) {
          if (sp < 1e-6) {                       /* parada de vez: rumo aleatorio */
            var rumo = Math.random() * Math.PI * 2;
            n.vx = Math.cos(rumo) * velMin; n.vy = Math.sin(rumo) * velMin;
          } else { n.vx = n.vx / sp * velMin; n.vy = n.vy / sp * velMin; }
        }
      }
      pintar();
      aplicarRotacao();
    }

    /* Colisao entre discos de mesma massa. Cada par e' tratado uma vez por
       passo (i < j). Quem esta escapando nao participa. Para cada par que se
       sobrepoe:
         1. normal n = (B - A)/|B - A|;
         2. velocidade relativa ao longo da normal, rel = (vB - vA).n;
         3. so' ha' resposta se rel < 0 (estao se aproximando) — dois discos que
            ja se afastam nao recebem impulso, o que evita energia fantasma e
            "grude";
         4. impulso elastico j = -(1+e) rel / 2 aplicado em sentidos opostos: com
            e = 1 as componentes normais se trocam e a energia total fica igual;
            a componente tangencial nao e' tocada;
         5. a sobreposicao e' desfeita separando os centros pela metade cada,
            sem mexer na velocidade. */
    function colidirLutadores() {
      var min = estado.lado * CFG.diametroLutador;
      var min2 = min * min;
      for (var i = 0; i < estado.lutadores.length; i++) {
        var a = estado.lutadores[i];
        if (a.escapando) continue;
        for (var j = i + 1; j < estado.lutadores.length; j++) {
          var b = estado.lutadores[j];
          if (b.escapando) continue;
          var dx = b.x - a.x, dy = b.y - a.y;
          var d2 = dx * dx + dy * dy;
          if (d2 >= min2) continue;
          var d, nx, ny;
          if (d2 < 1e-9) { d = 0; nx = 1; ny = 0; }   /* centros coincidentes: normal arbitraria */
          else { d = Math.sqrt(d2); nx = dx / d; ny = dy / d; }

          var sobra = (min - d) / 2;
          a.x -= nx * sobra; a.y -= ny * sobra;
          b.x += nx * sobra; b.y += ny * sobra;

          var rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rel >= 0) continue;
          estado.colisoes++;
          estado.impacto += -rel;
          /* aviso para quem quiser reagir (o som): forca ~1 = choque de frente
             na velocidade base. O motor nao toca em som nem em DOM aqui. */
          emitir('colisao', { forca: -rel / (estado.escala * CFG.velocidade) });
          var jmp = -(1 + CFG.restituicaoLutador) * rel / 2;
          a.vx -= nx * jmp; a.vy -= ny * jmp;
          b.vx += nx * jmp; b.vy += ny * jmp;
        }
      }
    }

    var rodando = false;
    function quadro(t) {
      if (!rodando) return;
      var dt = (t - estado.ultimoQuadro) / 1000;
      estado.ultimoQuadro = t;
      if (dt > 0.05) dt = 0.05; /* nao deixa um salto após aba oculta */
      passo(dt);
      requestAnimationFrame(quadro);
    }

    function iniciarLaco() {
      if (rodando) return;
      rodando = true;
      estado.ultimoQuadro = agora();
      requestAnimationFrame(quadro);
    }

    function parar() {
      rodando = false;
      if (estado.coroaTimer) { clearTimeout(estado.coroaTimer); estado.coroaTimer = null; }
      esconderCoroa();
      estado.fase = FASE.PRONTO;
    }

    /* ---------------------------------------------------------------- */
    /* api                                                               */
    /* ---------------------------------------------------------------- */

    function preparar(flags) {
      parar();
      estado.todas = flags || [];
      estado.participantes = null;
      estado.campeao = null;
      estado.onda = 0;
      estado.fim = false;
      estado.vencidas = [];
      limparLutadores();
      estado.lutadores = [];
      estado.escaparam = 0;
      estado.restam = 0;
      /* limpa o que sobrou das ondas anteriores (inclusive os fantasmas) */
      if (el.lutadores) el.lutadores.innerHTML = '';
      if (el.efeitos) el.efeitos.innerHTML = '';
      limparParede();
      limparObstaculosAcesos();
      estado.resultado = null;
      if (el.fantasmasEscaparam) el.fantasmasEscaparam.innerHTML = '';
      pintarVencedoras();
      atualizarContadores(true);
      if (el.onda) el.onda.textContent = '0';
    }

    /* Arena montada e PARADA, esperando o `comecar()` (botao Iniciar). As
       bandeiras ja aparecem nos lugares sorteados, mas nada se mexe. */
    function pronto() {
      parar();
      estado.participantes = null;      /* partida nova: sorteia de novo */
      estado.onda = 0;
      estado.fim = false;
      estado.resultado = null;
      montarOnda();
      pintar();
    }

    function comecar() {
      if (estado.fase !== FASE.PRONTO || !estado.lutadores.length) return;
      estado.fase = FASE.RODANDO;
      estado.ultimoQuadro = agora();
      iniciarLaco();
    }

    function iniciar() {
      parar();
      estado.participantes = null;      /* partida nova: sorteia de novo */
      estado.fase = FASE.RODANDO;
      montarOnda();
      iniciarLaco();
    }

    /* `esperar`: volta ao estado PRONTO (precisa de `comecar`) em vez de rodar. */
    function reiniciar(esperar) {
      estado.campeao = null;
      estado.onda = 0;
      estado.fim = false;
      /* o mural e' da partida, nao da sessao: reiniciar a arena limpa o
         placaro junto com a campea, senao a onda 1 mostraria um historico
         que nao foi jogado */
      estado.vencidas = [];
      pintarVencedoras();
      if (esperar) pronto(); else iniciar();
    }

    /* passo manual, so para os testes (navegador usa requestAnimationFrame) */
    function avancar(ms) {
      var dt = ms / 1000;
      var n = Math.max(1, Math.round(ms / 16));
      for (var i = 0; i < n; i++) passo(dt / n);
    }

    return {
      FASE: FASE,
      CFG: CFG,
      estado: estado,
      on: on,
      preparar: preparar,
      iniciar: iniciar,
      pronto: pronto,
      comecar: comecar,
      repintarMural: pintarVencedoras,
      duracaoCoroa: duracaoDaCoroa,
      definirSelecao: definirSelecao,
      parar: parar,
      reiniciar: reiniciar,
      definirTamanho: definirTamanho,
      dimensionar: function () { definirTamanho(el.arena ? el.arena.clientWidth : 400); },
      avancar: avancar,
      passo: passo,
      lotsAlvos: lotsAlvos
    };
  }

  global.FlagQuiz = { criarJogo: criarJogo, FASE: FASE, CFG: CFG, BASE: BASE };
})(typeof window !== 'undefined' ? window : globalThis);
