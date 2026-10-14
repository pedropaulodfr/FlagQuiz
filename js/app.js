/* =====================================================================
   Flag Arena - ligacao entre o DOM e o motor
   ===================================================================== */

(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  var el = {
    arena: $('arena'),
    arenaAnel: $('arena-anel'),
    arenaGiro: $('arena-giro'),
    arenaAnelGiro: $('arena-anel-giro'),
    coroa: $('coroa'),
    coroaIcone: $('coroa-icone'),
    coroaNome: $('coroa-nome'),
    coroaLegenda: $('coroa-legenda'),
    lutadores: $('lutadores'),
    efeitos: $('efeitos'),
    obstaculos: $('obstaculos'),
    iniciar: $('iniciar'),
    btnIniciar: $('btn-iniciar'),
    vencedorasTitulo: $('vencedoras-titulo'),
    contadorEscaparam: $('contador-escaparam'),
    contadorRestam: $('contador-restam'),
    fantasmasEscaparam: $('fantasmas-escaparam'),
    vencedoras: $('vencedoras'),
    vencedorasLista: $('vencedoras-lista'),
    vencedorasVazia: $('vencedoras-vazia'),
    vencedorasTotal: $('vencedoras-total'),
    onda: $('onda'),
    notaResto: $('nota-resto'),
    dica: $('dica'),
    avisoCartao: $('aviso-cartao'),
    avisoTitulo: $('aviso-titulo'),
    avisoTexto: $('aviso-texto'),
    btnReiniciar: $('btn-reiniciar'),
    arenaTrilho: $('arena-trilho'),
    inputPasta: $('input-pasta'),
    configInfo: $('config-info'),
    selecaoPagina: $('selecao-pagina'),
    selecaoGrade: $('selecao-grade'),
    selecaoBusca: $('selecao-busca'),
    selecaoContagem: $('selecao-contagem'),
    selecaoSorteio: $('selecao-sorteio'),
    btnBandeiras: $('btn-bandeiras'),
    btnFecharSelecao: $('btn-fechar-selecao'),
    btnSelecaoTodas: $('btn-selecao-todas'),
    btnSelecaoNenhuma: $('btn-selecao-nenhuma'),
    configPagina: $('config-pagina'),
    configResumo: $('config-resumo'),
    btnConfig: $('btn-config'),
    btnFecharConfig: $('btn-fechar-config'),
    btnResetConfig: $('btn-reset-config'),
    aviso: $('aviso')
  };

  var jogo = FlagQuiz.criarJogo(el);
  var bandeiras = [];

  /* ---------------------------------------------------------------- */
  /* utilitarios de tela                                               */
  /* ---------------------------------------------------------------- */

  var avisoTimer = null;
  function avisar(texto, ms) {
    if (!el.aviso) return;
    el.aviso.textContent = texto;
    el.aviso.hidden = false;
    if (avisoTimer) clearTimeout(avisoTimer);
    avisoTimer = setTimeout(function () { el.aviso.hidden = true; }, ms || 6000);
  }

  function cartao(titulo, texto, ms) {
    if (!el.avisoCartao) return;
    el.avisoTitulo.textContent = titulo;
    el.avisoTexto.textContent = texto || '';
    el.avisoCartao.hidden = false;
    if (cartao._t) clearTimeout(cartao._t);
    if (ms !== 0) cartao._t = setTimeout(function () { el.avisoCartao.hidden = true; }, ms || 3500);
  }

  function nota(texto) { if (el.notaResto) el.notaResto.textContent = texto; }

  /* ---------------------------------------------------------------- */
  /* colecao de bandeiras                                              */
  /* ---------------------------------------------------------------- */

  function aplicarBandeiras(lista, origem) {
    var anteriores = bandeiras;
    bandeiras = lista || [];

    if (!bandeiras.length) {
      el.btnReiniciar.disabled = true;
      el.configInfo.textContent = 'nenhuma bandeira carregada';
      if (el.avisoCartao) el.avisoCartao.hidden = true;
      avisar(
        'Nenhuma bandeira encontrada. Coloque imagens na pasta flags/ e rode ' +
        'node tools/gerar-manifest.js, ou use "Carregar pasta".',
        0
      );
      return;
    }

    el.btnReiniciar.disabled = false;
    origemColecao = origem;
    atualizarInfo();

    /* uma onda enche o anel ate CFG.lutadoresIniciais. Com menos bandeiras do
       que isso a arena fica mais curta — avisa, mas nao impede. O numero vem
       do motor para nao voltar a ser um palpite que envelhece sozinho. */
    var teto = jogo.CFG.lutadoresIniciais;
    if (bandeiras.length < teto) {
      avisar('Só ' + bandeiras.length + ' de ' + teto +
        ' bandeiras. A arena fica mais curta, mas funciona.', 4200);
    }

    jogo.preparar(bandeiras);
    montarSelecao();
    dimensionar();
    entrarPronto();

    /* so depois de preparar: o DOM ja largou os <img> da colecao anterior, e
       so agora as blob URLs delas podem morrer sem quebrar a tela */
    Bandeiras.revogar(anteriores, bandeiras);
  }

  function carregarDoProjeto() {
    var lista = Bandeiras.lerManifest();
    if (!lista.length) {
      aplicarBandeiras([], 'projeto');
      return;
    }
    aplicarBandeiras(lista, 'projeto');
  }

  function carregarDaPasta(files) {
    var lista = Bandeiras.lerPasta(files);
    if (!lista.length) {
      avisar('Nenhuma imagem reconhecida nessa pasta.', 4200);
      return;
    }
    jogo.parar();
    aplicarBandeiras(lista, 'pasta');
  }

  /* ---------------------------------------------------------------- */
  /* ciclo                                                              */
  /* ---------------------------------------------------------------- */

  function dimensionar() {
    var lado = el.arena ? el.arena.clientWidth : 0;
    ajustarCorpo(lado);
    jogo.definirTamanho(lado || 400);
  }

  /* Quadrada e redonda sao maiores do que a retangular na altura, e a colisao
     e' um disco: para ele coincidir com o desenho, o diametro e' lido da largura
     que o CSS realmente da a bandeira (sonda invisivel, medida e removida no
     mesmo quadro). A retangular segue a formula do motor. */
  function ajustarCorpo(lado) {
    if (!lado || !el.lutadores || !cfg || cfg.formato === 'retangular') return;
    var sonda = document.createElement('div');
    sonda.className = 'lutador';
    sonda.style.visibility = 'hidden';
    el.lutadores.appendChild(sonda);
    var largura = sonda.offsetWidth;
    el.lutadores.removeChild(sonda);
    if (largura > 0) jogo.CFG.diametroLutador = (largura / lado) * (cfg.formato === 'quadrada' ? 1.08 : 1);
  }

  /* Arena montada e parada: as bandeiras aparecem, mas a batalha so' comeca
     quando o jogador aperta Iniciar (botao ou tecla I). */
  function mostrarIniciar(sim) {
    if (el.iniciar) el.iniciar.hidden = !sim;
  }

  function textoEspera() {
    var celular = document.documentElement.classList && document.documentElement.classList.contains('layout-celular');
    if (celular) return cfg.botaoIniciar === false ? 'Botão Iniciar oculto nos Ajustes.' : 'Toque em Iniciar para começar a batalha.';
    return cfg.botaoIniciar === false
      ? 'Aperte a tecla I para começar a batalha.'
      : 'Aperte Iniciar (ou a tecla I) para começar a batalha.';
  }

  function entrarPronto() {
    if (!bandeiras.length) return;
    jogo.pronto();
    mostrarIniciar(true);
    if (el.dica) el.dica.textContent = textoEspera();
    nota('aguardando o início');
  }

  function iniciarBatalha() {
    if (!bandeiras.length || jogo.estado.fase !== jogo.FASE.PRONTO) return;
    liberarAudio();
    jogo.comecar();
    mostrarIniciar(false);
    if (el.dica) {
      el.dica.textContent = jogo.CFG.modo === 'eliminacao'
        ? 'Quem escapa pela abertura é eliminada. Sobrevive a que ficar até o fim.'
        : jogo.CFG.modo === 'ultima'
          ? 'Quem escapa sai da rodada. A última na arena vence.'
          : 'A primeira que escapar pela abertura vence a rodada.';
    }
    nota('elas escapam pela abertura');
  }

  /* Reiniciar volta ao estado de espera: o jogador decide quando recomeca. */
  function reiniciar() {
    if (!bandeiras.length) return;
    if (el.avisoCartao) el.avisoCartao.hidden = true;
    dimensionar();
    jogo.reiniciar(true);
    mostrarIniciar(true);
    if (el.dica) el.dica.textContent = textoEspera();
    nota('aguardando o início');
  }

  /* ---------------------------------------------------------------- */
  /* escolha das bandeiras da partida                                   */
  /* ---------------------------------------------------------------- */

  var origemColecao = 'projeto';
  var selecionadas = {};              /* id -> true, so' as da colecao atual */
  var itensSelecao = [];              /* { id, no, texto } para marcar e filtrar sem refazer */

  function contarSelecionadas() {
    var n = 0;
    for (var k in selecionadas) if (selecionadas[k]) n++;
    return n;
  }

  function idsSelecionados() {
    var ids = [];
    for (var i = 0; i < bandeiras.length; i++) if (selecionadas[bandeiras[i].id]) ids.push(bandeiras[i].id);
    return ids;
  }

  /* o texto do rodape diz quantas jogam; so' 2 ou mais valem como escolha */
  function atualizarInfo() {
    if (!el.configInfo || !bandeiras.length) return;
    var n = contarSelecionadas();
    el.configInfo.textContent = n >= 2
      ? n + ' de ' + bandeiras.length + ' bandeiras escolhidas'
      : bandeiras.length + (bandeiras.length === 1 ? ' bandeira' : ' bandeiras') +
        (origemColecao === 'pasta' ? ' da sua pasta' : ' do projeto');
    if (el.selecaoContagem) {
      el.selecaoContagem.textContent = n === 0
        ? 'Nenhuma marcada: o jogo sorteia as bandeiras.'
        : n === 1
          ? '1 marcada. Marque pelo menos 2 para valer; com 1 o jogo sorteia.'
          : n + ' de ' + bandeiras.length + ' marcadas. Só elas disputam a partida.';
    }
    if (el.selecaoSorteio) el.selecaoSorteio.textContent = jogo.CFG.lutadoresIniciais;
  }

  /* Refaz a lista de caixas para a colecao atual e aplica a escolha guardada
     (descartando ids que nao existem nesta colecao). */
  function montarSelecao() {
    selecionadas = {};
    var guardadas = Config.lerSelecao();
    for (var g = 0; g < guardadas.length; g++) selecionadas[guardadas[g]] = true;
    /* so' ficam os ids que existem nesta colecao */
    var existentes = {};
    for (var e = 0; e < bandeiras.length; e++) existentes[bandeiras[e].id] = true;
    for (var k in selecionadas) if (!existentes[k]) delete selecionadas[k];

    itensSelecao = [];
    if (el.selecaoGrade) {
      el.selecaoGrade.textContent = '';
      for (var i = 0; i < bandeiras.length; i++) {
        var f = bandeiras[i];
        var nome = Bandeiras.nome(f);
        var rotulo = document.createElement('label');
        rotulo.className = 'selecao-item';
        var caixa = document.createElement('input');
        caixa.type = 'checkbox';
        caixa.dataset.id = f.id;
        var img = document.createElement('img');
        img.src = f.urlObravelho || f.src;
        img.alt = '';
        img.draggable = false;
        var texto = document.createElement('span');
        texto.textContent = nome;
        rotulo.appendChild(caixa);
        rotulo.appendChild(img);
        rotulo.appendChild(texto);
        el.selecaoGrade.appendChild(rotulo);
        itensSelecao.push({ id: f.id, no: rotulo, caixa: caixa, busca: Bandeiras.normalizar(nome) });
      }
    }
    pintarSelecao();
    jogo.definirSelecao(idsSelecionados());
    atualizarInfo();
  }

  function pintarSelecao() {
    for (var i = 0; i < itensSelecao.length; i++) {
      var it = itensSelecao[i];
      var marcada = !!selecionadas[it.id];
      it.caixa.checked = marcada;
      if (it.no.classList) it.no.classList.toggle('selecao-item--marcada', marcada);
    }
  }

  /* A escolha vale para a PROXIMA partida. Se a arena ainda esta parada (antes
     do Iniciar), ela se refaz na hora com as bandeiras escolhidas. */
  function aplicarSelecao() {
    var ids = idsSelecionados();
    Config.gravarSelecao(ids);
    jogo.definirSelecao(ids);
    atualizarInfo();
    if (jogo.estado.fase === jogo.FASE.PRONTO && bandeiras.length) jogo.pronto();
  }

  function alternarSelecao(id, marcada) {
    if (marcada) selecionadas[id] = true; else delete selecionadas[id];
    pintarSelecao();
    aplicarSelecao();
  }

  function marcarTodas(sim) {
    selecionadas = {};
    if (sim) for (var i = 0; i < itensSelecao.length; i++) if (!itensSelecao[i].no.hidden) selecionadas[itensSelecao[i].id] = true;
    pintarSelecao();
    aplicarSelecao();
  }

  function filtrarSelecao() {
    var q = Bandeiras.normalizar(el.selecaoBusca ? el.selecaoBusca.value : '');
    for (var i = 0; i < itensSelecao.length; i++) {
      itensSelecao[i].no.hidden = q !== '' && itensSelecao[i].busca.indexOf(q) === -1;
    }
  }

  function selecaoAberta() { return !!el.selecaoPagina && !el.selecaoPagina.hidden; }

  function abrirSelecao() {
    if (!el.selecaoPagina || !bandeiras.length) return;
    atualizarInfo();
    el.selecaoPagina.hidden = false;
    if (el.btnFecharSelecao) el.btnFecharSelecao.focus();
  }

  function fecharSelecao() {
    if (!el.selecaoPagina) return;
    el.selecaoPagina.hidden = true;
    var n = contarSelecionadas();
    if (jogo.estado.fase !== jogo.FASE.PRONTO && n !== 0) {
      avisar('Bandeiras escolhidas valem a partir da próxima partida (Reiniciar).', 4000);
    }
    if (el.btnBandeiras && el.btnBandeiras.focus) el.btnBandeiras.focus();
  }

  /* ---------------------------------------------------------------- */
  /* pagina de ajustes                                                  */
  /* ---------------------------------------------------------------- */

  /* O mesmo raio vive em tres lugares (motor, <circle> do anel e custom
     property do :root); config.js explica quem escreve o que. Aqui so' juntamos
     os enderecos e usamos `cena` como destino unico. */
  var cena = {
    arenaAnelGiro: el.arenaAnelGiro,
    arenaTrilho: el.arenaTrilho,
    raiz: document.documentElement
  };

  /* Um par (slider, numero) por chave do schema. Montado por loop em vez de
     cinco linhas repetidas: um ajuste novo no schema vira um <input> no HTML e
     ja aparece aqui, sem mais nada para escrever. */
  var controles = [];
  function ehBool(c) { var k = Config.campo(c.chave); return !!k && k.tipo === 'bool'; }
  /* checkbox e <select> avisam por `change`; slider, a cada passo, por `input` */
  function usaChange(c) { var k = Config.campo(c.chave); return !!k && !!k.tipo; }
  function montarControles() {
    for (var i = 0; i < Config.CAMPOS.length; i++) {
      var chave = Config.CAMPOS[i].chave;
      controles.push({
        chave: chave,
        input: $('cfg-' + chave),
        saida: $('cfg-' + chave + '-valor')
      });
    }
  }

  /* Quais ajustes precisam reler o tamanho da arena depois de aplicados.

     `velocidade` e `abertura` nao precisam: a primeira e' lida a cada quadro
     em passo(), e a segunda ja chama aplicarAbertura() dentro do motor.

     `lutadores`, `arena` e `anel` precisam. `arena` porque o lado do circulo e'
     proprio o ajuste; `anel` porque o portao e' desenhado a partir do `r` que o
     config acabou de escrever no <circle>, e so' dimensionar() redesenha; e
     `lutadores` porque CFG.aplicarNoMotor decrease o diametro de cada lutador
     com CFG.diametroLutador * lado — um `lado` velho deixaria o anel cheio de
     buracos do tamanho certo so' no proximo resize. */
  var REDIMENSIONA = { abertura: true, lutadores: true, arena: true, anel: true, tamanhoBandeira: true, formato: true, obstaculo: true, layout: true };

  var cfg = Config.ler();

  function pintarControles() {
    for (var i = 0; i < controles.length; i++) {
      var c = controles[i];
      if (c.input && ehBool(c)) c.input.checked = cfg[c.chave] === true;
      else if (c.input) c.input.value = String(cfg[c.chave]);
      if (c.saida) c.saida.textContent = Config.texto(cfg[c.chave], Config.campo(c.chave));
    }
    if (!el.configResumo) return;
    el.configResumo.textContent =
      cfg.lutadores + ' na arena · abertura ' + Config.texto(cfg.abertura, Config.campo('abertura')) +
      ' · giro ' + Config.texto(cfg.rotacao, Config.campo('rotacao')) +
      ' · anel ' + Config.texto(cfg.anel, Config.campo('anel'));
  }

  /* Motor e cena juntos, sempre nessa ordem: o motor escreve CFG.raioBorda (a
     fracao do lado) e a cena escreve o `--arena-escala` (o lado em si). Ler o
     tamanho antes dos dois deixaria `dimensionar()` medindo a arena antiga. */
  function aplicarCfg(gravar) {
    cfg = Config.aplicarNoMotor(cfg, jogo);
    Config.aplicarNoCena(cfg, cena);
    /* velocidade do passeio do mural (0 = desligado) */
    if (rolagemMural) rolagemMural.ajustar({ velocidade: cfg.rolagemMural });
    if (gravar) {
      Config.gravar(cfg);
      brutoVisto = Config.lerBruto();   /* o que EU gravei nao conta como mudanca de fora */
    }
    pintarControles();
  }

  /* Ultimo texto de ajustes que este jogo ja aplicou (ver `sincronizarDeFora`). */
  var brutoVisto = Config.lerBruto();

  function abrirConfig() {
    if (!el.configPagina) return;
    aplicarCfg(false);
    el.configPagina.hidden = false;
    if (el.btnFecharConfig) el.btnFecharConfig.focus();
  }

  function fecharConfig() {
    if (!el.configPagina) return;
    el.configPagina.hidden = true;
    if (el.btnConfig) el.btnConfig.focus();
  }

  function resetarConfig() {
    Config.limpar();
    cfg = Config.padroes();
    aplicarCfg(true);
    avisar('Ajustes de volta ao padrão.', 2400);
  }

  function ligarControles() {
    for (var i = 0; i < controles.length; i++) {
      (function (c) {
        if (!c.input) return;
        /* checkbox muda por `change`; slider, a cada passo, por `input` */
        c.input.addEventListener(usaChange(c) ? 'change' : 'input', function () {
          var antes = cfg.botoes;
          cfg[c.chave] = ehBool(c) ? c.input.checked : c.input.value;
          /* escolher o modo traz os ajustes proprios dele (ver Config.PRESETS) */
          var preset = false;
          if (c.chave === 'modo' && Config.PRESETS[cfg.modo]) {
            cfg = Config.aplicarPreset(cfg, cfg.modo);
            preset = true;
            avisar('Modo "' + Config.texto(cfg.modo, Config.campo('modo')) + '": ajustes do modo aplicados.', 3500);
          }
          aplicarCfg(true);
          /* trocar o som toca um exemplo, para escolher de ouvido */
          if (c.chave === 'som' && cfg.volume > 0) { liberarAudio(); audio.ultimo = 0; tocarSom(0.8); }
          /* sem o botao Iniciar, o jogador precisa saber como comecar */
          if (c.chave === 'botaoIniciar') {
            if (jogo.estado.fase === jogo.FASE.PRONTO && el.dica) el.dica.textContent = textoEspera();
            if (cfg.botaoIniciar === false) avisar('Botão Iniciar oculto. Aperte a tecla I para começar a batalha.', 5000);
          }
          /* sem os botoes, o jogador precisa saber como voltar: avisa os atalhos */
          if (c.chave === 'botoes' && antes !== false && cfg.botoes === false) {
            avisar('Botões ocultos. Atalhos: R reinicia a arena · A abre os Ajustes.', 5000);
          }
          if (REDIMENSIONA[c.chave] || preset) dimensionar();
          if (c.chave === 'muralPosicao' || c.chave === 'modo') jogo.repintarMural();
          /* antes de iniciar, a arena parada se refaz com o que mudou (quantas
             bandeiras, tamanho, formato, obstaculo) */
          if ((REDIMENSIONA[c.chave] || preset) && jogo.estado.fase === jogo.FASE.PRONTO && bandeiras.length) {
            jogo.pronto();
          }
        });
      })(controles[i]);
    }
  }

  /* M: muta e desmuta. Mutar e' levar o volume a 0; o volume anterior fica
     guardado so' em memoria para o M seguinte devolver (se a pagina abrir com 0
     e nada guardado, volta ao padrao). Passa por aplicarCfg, entao o slider e o
     valor gravado acompanham. */
  var volumeAntes = 0;
  function alternarMudo() {
    if (cfg.volume > 0) {
      volumeAntes = cfg.volume;
      cfg.volume = 0;
    } else {
      cfg.volume = volumeAntes > 0 ? volumeAntes : Config.campo('volume').padrao;
    }
    aplicarCfg(true);
    avisar(cfg.volume > 0 ? 'Som ligado (' + cfg.volume + '%). M para mutar.' : 'Som mutado. M para ligar.', 2200);
    if (cfg.volume > 0) { liberarAudio(); audio.ultimo = 0; tocarSom(0.8); }
  }

  /* ---------------------------------------------------------------- */
  /* eventos do motor                                                  */
  /* ---------------------------------------------------------------- */

  /* ---------------------------------------------------------------- */
  /* som das colisoes                                                   */
  /* ---------------------------------------------------------------- */

  /* Sintetizado na hora (Web Audio), sem arquivo: uma "bolha" e' um seno que
     sobe rapido de tom e some em ~0,15 s. O tom varia um pouco a cada batida e
     o volume segue a forca do choque, sempre baixo. O navegador so' libera o
     audio depois de um gesto do usuario, entao o contexto nasce no primeiro
     clique/tecla (`liberarAudio`); antes disso as colisoes ficam mudas. */
  var audio = { ctx: null, ultimo: 0, vozes: 0 };

  function liberarAudio() {
    try {
      if (!audio.ctx) {
        var AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
        if (!AC) return;
        audio.ctx = new AC();
      }
      if (audio.ctx.state === 'suspended') audio.ctx.resume();
    } catch (e) { audio.ctx = null; }
  }

  /* Cada som e' uma funcao (t = instante, pico = volume ja ajustado, forca =
     forca do choque) que monta seus osciladores no grafo de audio e devolve a
     duracao total em segundos. Todos sao curtos e suaves. */
  function tom(t, o) {
    var ctx = audio.ctx;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    var ini = t + (o.atraso || 0);
    osc.type = o.tipo || 'sine';
    osc.frequency.setValueAtTime(o.f0, ini);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, ini + (o.sobe || 0.05));
    g.gain.setValueAtTime(0.0001, ini);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.pico), ini + (o.ataque || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, ini + o.dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(ini);
    osc.stop(ini + o.dur + 0.02);
    return (o.atraso || 0) + o.dur + 0.02;
  }

  function ruido(t, pico, dur, freq) {
    var ctx = audio.ctx;
    if (!audio.buffer) {                          /* 0,1 s de ruido branco, reaproveitado */
      audio.buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.1), ctx.sampleRate);
      var d = audio.buffer.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    var src = ctx.createBufferSource();
    var filtro = ctx.createBiquadFilter();
    var g = ctx.createGain();
    src.buffer = audio.buffer;
    filtro.type = 'bandpass';
    filtro.frequency.value = freq;
    filtro.Q.value = 1.2;
    g.gain.setValueAtTime(Math.max(0.0002, pico), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filtro);
    filtro.connect(g);
    g.connect(ctx.destination);
    src.start(t);
    src.stop(t + dur + 0.02);
    return dur + 0.02;
  }

  var SONS = {
    /* seno que sobe rapido de tom: o "blop" de uma bolha */
    bolha: function (t, pico) {
      var f0 = 330 + Math.random() * 240;
      return tom(t, { f0: f0, f1: f0 * 2.3, sobe: 0.09, pico: pico, ataque: 0.012, dur: 0.16 });
    },
    /* "plim" agudo e curto, como uma gota na agua */
    gota: function (t, pico) {
      var f0 = 760 + Math.random() * 300;
      return tom(t, { f0: f0, f1: f0 * 1.5, sobe: 0.04, pico: pico * 0.8, ataque: 0.006, dur: 0.22 });
    },
    /* dois parciais inarmonicos com decaimento longo: um sininho */
    sino: function (t, pico) {
      var f = 520 + Math.random() * 260;
      var a = tom(t, { f0: f, pico: pico * 0.7, ataque: 0.005, dur: 0.5 });
      var b = tom(t, { f0: f * 2.76, pico: pico * 0.25, ataque: 0.005, dur: 0.3 });
      return Math.max(a, b);
    },
    /* triangulo grave e seco: um "toc" de madeira */
    madeira: function (t, pico) {
      var f0 = 230 + Math.random() * 90;
      return tom(t, { tipo: 'triangle', f0: f0, f1: f0 * 0.6, sobe: 0.05, pico: pico * 1.4, ataque: 0.004, dur: 0.09 });
    },
    /* duas notas rapidas, a segunda uma quarta acima: o "ding" de uma moeda */
    moeda: function (t, pico) {
      var a = tom(t, { tipo: 'square', f0: 988, pico: pico * 0.35, ataque: 0.004, dur: 0.07 });
      var b = tom(t, { tipo: 'square', f0: 1319, atraso: 0.065, pico: pico * 0.35, ataque: 0.004, dur: 0.2 });
      return Math.max(a, b);
    },
    /* rajada de ruido filtrada: um estalo */
    estalo: function (t, pico) {
      return ruido(t, pico * 1.3, 0.035, 1800 + Math.random() * 1400);
    }
  };

  function tocarSom(forca) {
    var ctx = audio.ctx;
    if (!ctx || ctx.state !== 'running') return;
    var t = ctx.currentTime;
    if (t - audio.ultimo < 0.045 || audio.vozes >= 6) return;   /* sem rajada de sons */
    audio.ultimo = t;
    audio.vozes++;

    /* 0,02 a 0,07 no volume padrao (50%); o ajuste de volume multiplica isso */
    var pico = (0.02 + Math.min(1, forca) * 0.05) * (cfg.volume / 50);
    var fazer = SONS[cfg.som] || SONS.bolha;
    var dur = 0.2;
    try { dur = fazer(t, pico); } catch (e) { /* som e' enfeite: nunca derruba a arena */ }
    setTimeout(function () { audio.vozes--; }, dur * 1000 + 40);
  }

  jogo.on('colisao', function (d) {
    if (!(cfg.volume > 0) || d.forca < 0.12) return;
    tocarSom(d.forca);
  });

  ['pointerdown', 'keydown', 'touchstart'].forEach(function (nome) {
    if (document.addEventListener) document.addEventListener(nome, liberarAudio, { passive: true });
  });

  jogo.on('fuga', function (d) {
    nota(Bandeiras.nome(d.flag) + ' escapou');
  });

  jogo.on('fim', function (d) {
    if (d.motivo === 'bandeiras' && d.flag) {
      var quem = Bandeiras.nome(d.flag);
      if (d.tipo === 'campea') {
        cartao('Campeã: ' + quem, 'Sobreviveu a todas as rodadas (' + d.ondas + '). Aperte R para recomeçar.', 0);
      } else {
        cartao('Derrotada: ' + quem, 'Foi a única que nunca escapou (' + d.ondas + ' rodadas). Aperte R para recomeçar.', 0);
      }
    } else if (d.motivo === 'rodadas' && d.flag) {
      cartao('Campeã: ' + Bandeiras.nome(d.flag), 'Venceu ' + d.vitorias + ' de ' + d.ondas + ' rodadas. Aperte R para recomeçar.', 0);
    } else if (d.motivo === 'rodadas') {
      cartao('Fim das rodadas', d.ondas + (d.ondas === 1 ? ' rodada jogada' : ' rodadas jogadas') + '. Aperte R para recomeçar.', 0);
    } else {
      cartao('Fim do torneio', 'Todas as bandeiras já venceram uma rodada (' + d.ondas + '). Aperte R para recomeçar.', 0);
    }
  });

  jogo.on('onda', function (d) {
    if (el.avisoCartao) el.avisoCartao.hidden = true;
    /* parada, esperando o Iniciar: a dica de espera continua valendo */
    if (jogo.estado.fase === jogo.FASE.PRONTO) return;
    nota('elas escapam pela abertura');
    if (el.dica) {
      el.dica.textContent =
        'Onda ' + d.onda + ' — ' + d.lutadores + ' bandeiras na arena. A abertura continua girando.';
    }
  });

  jogo.on('vitoria', function (d) {
    var nome = Bandeiras.nome(d.flag);
    if (d.modo === 'eliminacao') cartao(nome + ' eliminada', 'Escapou primeiro e sai da partida.', 0);
    else if (d.modo === 'ultima') cartao('Venceu ' + nome, 'Foi a última na arena nesta rodada.', 0);
    else cartao('venceu ' + nome, 'Foi a primeira a escapar nesta rodada.', 0);
  });

  /* ---------------------------------------------------------------- */
  /* ligacoes de UI                                                     */
  /* ---------------------------------------------------------------- */

  el.btnReiniciar.addEventListener('click', function () { reiniciar(); });
  if (el.btnIniciar) el.btnIniciar.addEventListener('click', iniciarBatalha);

  el.inputPasta.addEventListener('change', function () {
    if (!el.inputPasta.files || !el.inputPasta.files.length) return;
    carregarDaPasta(el.inputPasta.files);
    /* libera o input para poder escolher a mesma pasta de novo */
    el.inputPasta.value = '';
  });

  /* Girar o aparelho ou redimensionar a janela pode trocar o layout (celular x
     computador, no modo Automatico): reaplica a cena ANTES de medir a arena. */
  window.addEventListener('resize', function () {
    Config.aplicarNoCena(cfg, cena);
    dimensionar();
    if (jogo.estado.fase === jogo.FASE.PRONTO && el.dica) el.dica.textContent = textoEspera();
  });

  if (el.btnBandeiras) el.btnBandeiras.addEventListener('click', abrirSelecao);
  if (el.btnFecharSelecao) el.btnFecharSelecao.addEventListener('click', fecharSelecao);
  if (el.btnSelecaoTodas) el.btnSelecaoTodas.addEventListener('click', function () { marcarTodas(true); });
  if (el.btnSelecaoNenhuma) el.btnSelecaoNenhuma.addEventListener('click', function () { marcarTodas(false); });
  if (el.selecaoBusca) el.selecaoBusca.addEventListener('input', filtrarSelecao);
  /* um ouvinte so' para a grade inteira (as caixas sao criadas e refeitas a cada colecao) */
  if (el.selecaoGrade) el.selecaoGrade.addEventListener('change', function (ev) {
    var alvo = ev.target;
    if (alvo && alvo.dataset && alvo.dataset.id) alternarSelecao(alvo.dataset.id, !!alvo.checked);
  });
  if (el.btnConfig) el.btnConfig.addEventListener('click', abrirConfig);
  if (el.btnFecharConfig) el.btnFecharConfig.addEventListener('click', fecharConfig);
  if (el.btnResetConfig) el.btnResetConfig.addEventListener('click', resetarConfig);

  /* `document` num sandbox de teste pode nao ter addEventListener, e um
     TypeError aqui derrubaria o app inteiro antes do boot. */
  if (document.addEventListener) {
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && el.configPagina && !el.configPagina.hidden) fecharConfig();
      if (ev.key === 'Escape' && selecaoAberta()) fecharSelecao();

      /* atalhos: R reinicia, A abre os Ajustes. Nao valem com Ctrl/Alt/Meta
         (Ctrl+R recarrega a pagina), nem enquanto se digita ou escolhe num
         campo do painel. */
      if (ev.ctrlKey || ev.altKey || ev.metaKey) return;
      var alvo = ev.target, tag = alvo && alvo.tagName ? String(alvo.tagName).toUpperCase() : '';
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || (alvo && alvo.isContentEditable)) return;
      var tecla = String(ev.key || '').toLowerCase();
      var painelAberto = (el.configPagina && !el.configPagina.hidden) || selecaoAberta();
      if (tecla === 'r' && !painelAberto) { ev.preventDefault(); reiniciar(); }
      else if (tecla === 'a' && !painelAberto) { ev.preventDefault(); abrirConfig(); }
      else if (tecla === 'i' && !painelAberto) { ev.preventDefault(); iniciarBatalha(); }
      else if (tecla === 'b' && !painelAberto) { ev.preventDefault(); abrirSelecao(); }
      else if (tecla === 'm') { ev.preventDefault(); alternarMudo(); }
    });
  }

  /* Ajustes feitos em OUTRA aba (ajustes.html) entram no jogo na hora, sem
     recarregar e sem perder a partida em andamento: so' o que mudou e' reaplicado
     (motor, cena e tamanho da arena); as bandeiras, o placar e o mural ficam
     como estao. Se a arena ainda esta parada (antes do Iniciar), ela se refaz.

     Tres gatilhos, porque nenhum e' garantido sozinho: o evento `storage` (so'
     dispara entre abas do mesmo endereco e nao e' confiavel em `file://`), uma
     checagem a cada 0,4 s e ao voltar o foco para esta aba. Todos passam pela
     mesma comparacao com o ultimo texto aplicado, entao nada e' aplicado duas
     vezes. */
  function sincronizarDeFora() {
    var bruto = Config.lerBruto();
    if (bruto === brutoVisto) return;
    brutoVisto = bruto;
    cfg = Config.ler();
    aplicarCfg(false);
    dimensionar();
    jogo.repintarMural();
    if (jogo.estado.fase === jogo.FASE.PRONTO && bandeiras.length) jogo.pronto();
  }

  if (window.addEventListener) {
    window.addEventListener('storage', sincronizarDeFora);
    window.addEventListener('focus', sincronizarDeFora);
  }
  if (document.addEventListener) document.addEventListener('visibilitychange', sincronizarDeFora);
  if (typeof setInterval === 'function') setInterval(sincronizarDeFora, 400);

  /* O mural passeia sozinho (desce ate' as primeiras vencedoras e volta ao topo) de
     tempos em tempos, quando as bandeiras nao cabem na area visivel. Ver js/rolagem.js. */
  var rolagemMural = null;
  if (typeof RolagemMural !== 'undefined' && el.vencedoras) {
    rolagemMural = RolagemMural.criar(el.vencedoras);
    rolagemMural.iniciar();
  }

  /* ---------------------------------------------------------------- */
  /* boot                                                               */
  /* ---------------------------------------------------------------- */

  if (location.protocol === 'file:') {
    avisar(
      'Abrindo via file:// — se a arena ficar vazia, sirva a pasta por HTTP ' +
      '(ex.: python -m http.server) para as imagens carregarem.',
      0
    );
  }

  /* O ajuste guardado entra ANTES do manifest: `aplicarBandeiras` le
     CFG.lutadoresIniciais para avisar "a arena fica mais curta" e `dimensionar`
     le o clientWidth da arena, que o `--arena-escala` ja mudou. Aplicar depois
     faria a primeira onda nascer com a configuracao antiga. */
  montarControles();
  aplicarCfg(false);
  ligarControles();

  carregarDoProjeto();
})();
