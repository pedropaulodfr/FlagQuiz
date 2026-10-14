/* =====================================================================
   Flag Arena - Ajustes em aba propria (ajustes.html)
   =====================================================================
   O mesmo schema de js/config.js, ligado aos mesmos ids `cfg-<chave>` do painel
   do jogo. Aqui nao ha' arena: so' lemos, mostramos e gravamos. O jogo aberto em
   outra aba recebe a mudanca pelo evento `storage` (ver js/app.js), que o
   navegador dispara nas outras abas do mesmo endereco quando o localStorage muda.
   ===================================================================== */

(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  var cfg = Config.ler();
  var controles = [];

  function tipoDe(chave) { var k = Config.campo(chave); return k && k.tipo; }

  /* checkbox e <select> avisam por `change`; slider, a cada passo, por `input` */
  function evento(chave) { return tipoDe(chave) ? 'change' : 'input'; }

  function pintar() {
    /* a aba usa o mesmo styles.css: o tema escolhido vale aqui tambem */
    document.documentElement.setAttribute('data-tema', cfg.tema);
    for (var i = 0; i < controles.length; i++) {
      var c = controles[i];
      var campo = Config.campo(c.chave);
      if (c.input) {
        if (campo.tipo === 'bool') c.input.checked = cfg[c.chave] === true;
        else c.input.value = String(cfg[c.chave]);
      }
      if (c.saida) c.saida.textContent = Config.texto(cfg[c.chave], campo);
    }
    var resumo = $('config-resumo');
    if (resumo) {
      resumo.textContent = cfg.lutadores + ' na arena · abertura ' +
        Config.texto(cfg.abertura, Config.campo('abertura')) + ' · giro ' +
        Config.texto(cfg.rotacao, Config.campo('rotacao'));
    }
  }

  function ligar(c) {
    if (!c.input) return;
    c.input.addEventListener(evento(c.chave), function () {
      var campo = Config.campo(c.chave);
      cfg[c.chave] = campo.tipo === 'bool' ? c.input.checked : c.input.value;
      /* escolher o modo traz os ajustes proprios dele (ver Config.PRESETS) */
      if (c.chave === 'modo') cfg = Config.aplicarPreset(Config.normalizar(cfg), cfg.modo);
      /* gravar() normaliza; relemos o resultado para a tela mostrar o valor ja
         ajustado ao intervalo do campo */
      cfg = Config.gravar(cfg);
      pintar();
    });
  }

  for (var i = 0; i < Config.CAMPOS.length; i++) {
    var chave = Config.CAMPOS[i].chave;
    var c = { chave: chave, input: $('cfg-' + chave), saida: $('cfg-' + chave + '-valor') };
    controles.push(c);
    ligar(c);
  }

  var reset = $('btn-reset-config');
  if (reset) {
    reset.addEventListener('click', function () {
      Config.limpar();
      cfg = Config.gravar(Config.padroes());
      pintar();
    });
  }

  /* o jogo (ou outra aba de ajustes) mexeu: acompanha */
  window.addEventListener('storage', function (ev) {
    if (ev.key !== null && ev.key !== Config.CHAVE) return;
    cfg = Config.ler();
    pintar();
  });

  pintar();
})();
