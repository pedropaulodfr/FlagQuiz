/* =====================================================================
   Flag Arena - rolagem automatica do mural de vencedoras
   =====================================================================
   Quando o mural tem mais bandeiras do que cabem na area visivel (o caso do
   celular, ou do mural na vertical), as primeiras vencedoras ficam fora da vista:
   o mural mostra as MAIS RECENTES no topo e as antigas embaixo. Para quem so'
   assiste (uma live, por exemplo), este modulo faz um passeio sozinho, de tempos
   em tempos:

     1. desce devagar, a velocidade constante, mostrando cada vencedora;
     2. faz uma pausa no fim (as mais antigas);
     3. volta suavemente ao topo, onde estao as mais recentes;
     4. espera um bom tempo e repete.

   Regras de bom comportamento:
     - so' passeia se o mural realmente transborda (se cabe tudo, nao faz nada);
     - se a pessoa mexe (roda o mouse, toca, passa o mouse por cima), o passeio
       para onde esta' e so' recomeca depois de uns segundos sem mexer;
     - nao passeia com a aba escondida.

   O relogio, os timers e o requestAnimationFrame podem ser injetados (`deps`),
   para os testes rodarem sem esperar tempo de verdade.
   ===================================================================== */

(function (global) {
  'use strict';

  var PADRAO = {
    primeiro: 10000,       /* ms ate' o primeiro passeio, depois que a pagina abre */
    intervalo: 45000,      /* ms entre o fim de um passeio e o inicio do seguinte */
    velocidade: 50,        /* px/s na descida: devagar o bastante para ler as bandeiras */
    pausaFim: 1600,        /* ms parado no fim, nas vencedoras mais antigas */
    voltaMin: 700,         /* ms: duracao minima da volta ao topo */
    voltaMax: 2400,        /* ms: duracao maxima da volta ao topo */
    retomada: 12000        /* ms sem mexer ate' o passeio poder recomecar */
  };

  function mesclar(base, extra) {
    var r = {};
    for (var k in base) if (Object.prototype.hasOwnProperty.call(base, k)) r[k] = base[k];
    if (extra) for (var j in extra) if (Object.prototype.hasOwnProperty.call(extra, j)) r[j] = extra[j];
    return r;
  }

  /* aceleracao no comeco e freio no fim: a volta ao topo nao parece um tranco */
  function suavizar(p) {
    return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  }

  function criar(el, opcoes, deps) {
    var o = mesclar(PADRAO, opcoes);
    var d = deps || {};

    var ligado = false;
    var fase = null;            /* null | 'descendo' | 'pausa' | 'subindo' */
    var pos = 0;
    var ultimo = null;
    var ate = 0;
    var t0 = 0, de = 0, dur = 0;
    var timer = null;
    var quadro = null;
    var mexendo = false;        /* a pessoa mexeu ha' pouco: nao passear */

    function agendar(fn, ms) {
      var f = d.setTimeout || global.setTimeout;
      timer = f(fn, ms);
    }
    function desagendar() {
      if (timer === null) return;
      (d.clearTimeout || global.clearTimeout)(timer);
      timer = null;
    }
    function pedirQuadro(fn) {
      var f = d.raf || global.requestAnimationFrame;
      quadro = f(fn);
    }
    function cancelarQuadro() {
      if (quadro === null) return;
      var c = d.cancelRaf || global.cancelAnimationFrame;
      if (c) c(quadro);
      quadro = null;
    }

    function maximo() { return Math.max(0, (el.scrollHeight || 0) - (el.clientHeight || 0)); }
    function transborda() { return maximo() > 4; }
    function escondida() { return !!(global.document && global.document.hidden === true); }

    function proximo(ms) {
      desagendar();
      if (ligado) agendar(passear, ms);
    }

    function passear() {
      timer = null;
      if (!ligado) return;
      if (fase !== null) return;
      /* velocidade 0 = passeio desligado nos Ajustes (continua checando, caso mude) */
      if (!(o.velocidade > 0) || !transborda() || escondida() || mexendo) { proximo(o.intervalo); return; }
      fase = 'descendo';
      pos = el.scrollTop || 0;
      ultimo = null;
      pedirQuadro(passo);
    }

    function terminar() {
      fase = null;
      quadro = null;
      el.scrollTop = 0;
      proximo(o.intervalo);
    }

    function passo(ts) {
      quadro = null;
      if (fase === null) return;
      var dt = ultimo === null ? 0 : Math.min(0.1, (ts - ultimo) / 1000);
      ultimo = ts;
      var m = maximo();

      if (fase === 'descendo') {
        pos += o.velocidade * dt;
        if (pos >= m) { pos = m; fase = 'pausa'; ate = ts + o.pausaFim; }
        el.scrollTop = pos;
      } else if (fase === 'pausa') {
        if (ts >= ate) {
          fase = 'subindo';
          t0 = ts;
          de = Math.min(pos, m);
          dur = Math.max(o.voltaMin, Math.min(o.voltaMax, (de / (o.velocidade * 3)) * 1000));
        }
      } else if (fase === 'subindo') {
        var p = Math.min(1, (ts - t0) / dur);
        pos = de * (1 - suavizar(p));
        el.scrollTop = pos;
        if (p >= 1) { terminar(); return; }
      }
      pedirQuadro(passo);
    }

    /* a pessoa mexeu: para onde esta' (sem puxar de volta) e espera um tempo */
    function interromper() {
      if (!ligado) return;
      if (fase !== null) { fase = null; cancelarQuadro(); }
      mexendo = true;
      desagendar();
      agendar(function () { mexendo = false; timer = null; passear(); }, o.retomada);
    }

    function iniciar() {
      if (ligado) return;
      ligado = true;
      if (el.addEventListener) {
        ['wheel', 'touchstart', 'pointerdown', 'mouseenter'].forEach(function (nome) {
          el.addEventListener(nome, interromper, { passive: true });
        });
      }
      proximo(o.primeiro);
    }

    function parar() {
      ligado = false;
      fase = null;
      cancelarQuadro();
      desagendar();
    }

    /* Muda opcoes com o jogo rodando (ex.: a velocidade, pelos Ajustes). Vale a
       partir do proximo quadro; um passeio em andamento ja segue na nova velocidade. */
    function ajustar(extra) {
      o = mesclar(o, extra);
    }

    return {
      ajustar: ajustar,
      iniciar: iniciar,
      parar: parar,
      passear: passear,          /* dispara um passeio agora (testes) */
      interromper: interromper,  /* simula a pessoa mexendo (testes) */
      estado: function () { return { fase: fase, mexendo: mexendo, ligado: ligado }; }
    };
  }

  global.RolagemMural = { criar: criar, PADRAO: PADRAO };
})(typeof window !== 'undefined' ? window : globalThis);
