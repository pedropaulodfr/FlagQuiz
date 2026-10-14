/* =====================================================================
   Flag Arena - configuracao da partida
   =====================================================================
   Uma pagina de configuracao sem build, sem servidor e sem framework.

   O schema (CAMPOS) e' a unica fonte: ele diz o intervalo, o passo, o valor
   de fabrica e o rotulo de cada ajuste. A pagina e' desenhada a partir dele e
   o motor e' reescrito no lugar — CFG e' mutavel de proposito. Se o slider e
   o motor discordassem sobre o que e' valido, a ficha de configuracao
   seria decorativa.

   O que fica gravado e' so isto. As BANDEIRAS nao: uma pasta escolhida vira
   object URL, e object URL pertence ao documento que a criou — ela morre
   quando a página sai de cena. Por isso as configuracoes vivem na MESMA
   pagina do jogo, e nao numa config.html separada: trocar de documento para
   configurar custaria a coleção inteira.
   ===================================================================== */

(function (global) {
  'use strict';

  /* Lado do viewBox do <svg> da arena (viewBox="0 0 400 400"). O raio do anel
     e' escrito no <circle> nestas unidades, entao e' daqui que sai o `r`
     quando o jogador mexe no tamanho do circulo. */
  var LADO_VIEWBOX = 400;

  /* Versionado no nome da chave: mudar o formato do que e' gravado invalida o
     guardado sem precisar de migrar nada, e `normalizar` ja garante que um
     objeto velho nao entra em CFG. */
  var CHAVE = 'flag-arena:config:v2';

  /* ---------------------------------------------------------------- */
  /* schema                                                            */
  /* ---------------------------------------------------------------- */

  /* Grupos em que os ajustes aparecem nas telas (painel e aba). A ordem daqui e' a
     ordem na tela; cada campo de CAMPOS diz a qual grupo pertence em `grupo`. */
  var GRUPOS = [
    { id: 'partida', titulo: 'Partida' },
    { id: 'arena', titulo: 'Arena' },
    { id: 'bandeiras', titulo: 'Bandeiras' },
    { id: 'som', titulo: 'Som e efeitos' },
    { id: 'placar', titulo: 'Placar e indicadores' },
    { id: 'aparencia', titulo: 'Aparência' },
    { id: 'interface', titulo: 'Interface' }
  ];

  var CAMPOS = [
    {
      chave: 'velocidade',
      grupo: 'bandeiras',
      rotulo: 'Velocidade das bandeiras',
      ajuda: 'Multiplica o deslocamento de todas. O teto de velocidade acompanha na mesma medida, senão a bandeira fica presa no maximo depois de um choque.',
      padrao: 1, min: 0.2, max: 3, passo: 0.05, casas: 2, sufixo: '×'
    },
    {
      chave: 'rotacao',
      grupo: 'arena',
      rotulo: 'Velocidade de rotação do anel',
      ajuda: 'O giro do portão por onde elas escapam. Parada, a arena vira uma gaiola: a onda só acaba se alguma bandeira bater exatamente na fresta.',
      padrao: 0.18, min: 0, max: 1.2, passo: 0.01, casas: 2, sufixo: ' rad/s'
    },
    {
      chave: 'abertura',
      grupo: 'arena',
      rotulo: 'Tamanho da abertura',
      ajuda: 'Largura da saida do anel, em graus do circulo (360 = volta inteira). Maior deixa escapar mais facil e acaba a onda mais cedo; menor exige mais pontaria.',
      padrao: 69, min: 15, max: 180, passo: 1, casas: 0, sufixo: '°'
    },
    {
      chave: 'lutadores',
      grupo: 'partida',
      rotulo: 'Bandeiras por onda',
      ajuda: 'Quantas bandeiras disputam a partida. Sao sorteadas uma vez, no comeco, e sao as mesmas ate o fim. Vale ao reiniciar a arena (ou antes de iniciar), nao no meio da partida.',
      padrao: 16, min: 2, max: 60, passo: 1, casas: 0, sufixo: ''
    },
    {
      chave: 'arena',
      grupo: 'arena',
      rotulo: 'Tamanho do círculo',
      ajuda: 'Escala a arena e as bandeiras juntas, então a proporção se mantém: o que muda é o espaço, não a physics.',
      padrao: 1, min: 0.5, max: 1.6, passo: 0.05, casas: 2, sufixo: '×'
    },
    {
      chave: 'anel',
      grupo: 'arena',
      rotulo: 'Raio do anel',
      ajuda: 'Onde fica a parede, em porcentagem do círculo. Menor fecha a arena e aperta a briga; a fresta acompanha a largura.',
      padrao: 45.5, min: 28, max: 49, passo: 0.5, casas: 1, sufixo: '%'
    },
    {
      chave: 'tamanhoBandeira',
      grupo: 'bandeiras',
      rotulo: 'Tamanho das bandeiras',
      ajuda: 'Aumenta ou diminui cada bandeira. O corpo de colisao acompanha, entao bandeiras maiores se chocam mais e ocupam mais espaco.',
      padrao: 1, min: 0.5, max: 1.6, passo: 0.05, casas: 2, sufixo: '×'
    },
    {
      chave: 'formato',
      grupo: 'bandeiras',
      tipo: 'opcao',
      rotulo: 'Formato das bandeiras',
      ajuda: 'Retangular mantem a proporcao da bandeira; quadrada e redonda recortam a imagem.',
      opcoes: [
        { valor: 'retangular', texto: 'Retangular' },
        { valor: 'quadrada', texto: 'Quadrada' },
        { valor: 'redonda', texto: 'Redonda' }
      ],
      padrao: 'retangular'
    },
    {
      chave: 'efeitoParede',
      grupo: 'som',
      tipo: 'bool',
      rotulo: 'Efeito de batida na parede',
      ajuda: 'Mostra a onda de choque quando uma bandeira bate no anel. So desenho: a fisica e a fuga nao mudam.',
      padrao: true
    },
    {
      chave: 'som',
      grupo: 'som',
      tipo: 'opcao',
      rotulo: 'Som da colisão',
      ajuda: 'Escolhe o som tocado quando duas bandeiras se chocam. Ao trocar, um exemplo toca na hora.',
      opcoes: [
        { valor: 'bolha', texto: 'Bolha' },
        { valor: 'gota', texto: 'Gota' },
        { valor: 'sino', texto: 'Sino' },
        { valor: 'madeira', texto: 'Madeira' },
        { valor: 'moeda', texto: 'Moeda' },
        { valor: 'estalo', texto: 'Estalo' }
      ],
      padrao: 'bolha'
    },
    {
      chave: 'volume',
      grupo: 'som',
      rotulo: 'Volume do som',
      ajuda: 'Volume do som das colisoes. 50% e o nivel suave de fabrica; 0% silencia. O navegador so libera o som depois do primeiro clique ou tecla na pagina.',
      padrao: 50, min: 0, max: 100, passo: 5, casas: 0, sufixo: '%'
    },
    {
      chave: 'tema',
      grupo: 'aparencia',
      tipo: 'opcao',
      rotulo: 'Tema visual',
      ajuda: 'Muda as cores do jogo todo: fundo, paineis, anel, botoes, obstaculos e efeitos. As cores de vitoria e derrota se mantem reconheciveis em todos.',
      opcoes: [
        { valor: 'noite', texto: 'Noite' },
        { valor: 'claro', texto: 'Claro' },
        { valor: 'estadio', texto: 'Estádio' },
        { valor: 'por-do-sol', texto: 'Pôr do sol' },
        { valor: 'neon', texto: 'Neon' }
      ],
      padrao: 'noite'
    },
    {
      chave: 'layout',
      grupo: 'aparencia',
      tipo: 'opcao',
      rotulo: 'Layout da tela',
      ajuda: 'Automatico adapta a tela sozinho: em celular (largura de ate 720 px) usa o layout de celular. Celular FORCA o layout de celular mesmo no computador: o jogo aparece numa coluna vertical 9:16 no meio da janela, com todas as informacoes, ideal para transmitir uma live vertical (YouTube) para quem assiste pelo celular. Computador forca o layout de computador.',
      opcoes: [
        { valor: 'auto', texto: 'Automático' },
        { valor: 'celular', texto: 'Celular (vertical 9:16)' },
        { valor: 'computador', texto: 'Computador' }
      ],
      padrao: 'auto'
    },
    {
      chave: 'botaoIniciar',
      grupo: 'interface',
      tipo: 'bool',
      rotulo: 'Botão Iniciar',
      ajuda: 'Mostra ou esconde o botao Iniciar no centro da arena. Escondido, a batalha comeca com a tecla I.',
      padrao: true
    },
    {
      chave: 'botoes',
      grupo: 'interface',
      tipo: 'bool',
      rotulo: 'Botões Reiniciar e Ajustes',
      ajuda: 'Mostra ou esconde os dois botoes do rodape. Escondidos, os atalhos continuam: R reinicia a arena e A abre os Ajustes.',
      padrao: true
    },
    {
      chave: 'modo',
      grupo: 'partida',
      tipo: 'opcao',
      rotulo: 'Modo de jogo',
      ajuda: 'Quem escapa vence: a primeira bandeira a cruzar a abertura vence a rodada. Quem escapa e eliminada: a primeira a cruzar a abertura sai da partida; no fim, a que sobreviver a todas as rodadas e a campea. Ultima na arena vence: a rodada e uma batalha; quem escapa sai da rodada e a ultima que sobrar na arena vence. Com "Vencedoras voltam" desmarcado, quem foi marcada nao volta ao sorteio; no fim, a unica bandeira que nunca venceu e a derrotada.',
      opcoes: [
        { valor: 'vencedora', texto: 'Quem escapa vence' },
        { valor: 'eliminacao', texto: 'Quem escapa é eliminada' },
        { valor: 'ultima', texto: 'Última na arena vence' }
      ],
      padrao: 'vencedora'
    },
    {
      chave: 'obstaculo',
      grupo: 'arena',
      tipo: 'opcao',
      rotulo: 'Obstáculo',
      ajuda: 'Objeto fixo (ou giratorio) dentro do circulo, contra o qual as bandeiras batem e rebatem. Nenhum e o padrao.',
      opcoes: [
        { valor: 'nenhum', texto: 'Nenhum' },
        { valor: 'pino', texto: 'Pino central' },
        { valor: 'tres-pinos', texto: 'Três pinos' },
        { valor: 'hexagono', texto: 'Pinos em hexágono' },
        { valor: 'barra', texto: 'Barra giratória' },
        { valor: 'cruz', texto: 'Cruz giratória' },
        { valor: 'tres-cruzes', texto: 'Três cruzes giratórias' }
      ],
      padrao: 'nenhum'
    },
    {
      chave: 'efeitoAnel',
      grupo: 'arena',
      tipo: 'opcao',
      rotulo: 'Efeito do anel',
      ajuda: 'Animação decorativa sobre o anel da arena. Nenhum e o padrao: o anel fica como sempre foi. Brilho pulsante faz o contorno respirar; Rastro giratório põe um arco de luz a acompanhar o giro do portão; Faíscas orbitando acendem pontos que dão a volta no anel; Cor em movimento passeia a matiz do anel. So desenho: nao muda a fisica nem a abertura.',
      opcoes: [
        { valor: 'nenhum', texto: 'Nenhum' },
        { valor: 'brilho', texto: 'Brilho pulsante' },
        { valor: 'rastro', texto: 'Rastro giratório' },
        { valor: 'faiscas', texto: 'Faíscas orbitando' },
        { valor: 'cor', texto: 'Cor em movimento' }
      ],
      padrao: 'nenhum'
    },
    {
      chave: 'corParede',
      grupo: 'arena',
      tipo: 'opcao',
      rotulo: 'Cor da parede ao bater',
      ajuda: 'A cada batida de uma bandeira na parede, o anel acende numa cor nova. Nenhum deixa o anel sempre com a cor do tema. Cor que caminha avanca a matiz a cada batida; Cor surpresa sorteia um tom; Lampejo acende um tom e apaga em seguida. So desenho: nao muda a fisica nem a abertura.',
      opcoes: [
        { valor: 'nenhum', texto: 'Nenhum' },
        { valor: 'caminha', texto: 'Cor que caminha' },
        { valor: 'sorteia', texto: 'Cor surpresa' },
        { valor: 'pisca', texto: 'Lampejo' }
      ],
      padrao: 'nenhum'
    },
    {
      chave: 'efeitoObstaculo',
      grupo: 'arena',
      tipo: 'opcao',
      rotulo: 'Efeito nos obstáculos',
      ajuda: 'Neon nos obstáculos. Nenhum deixa como sempre foi. Neon aceso mantém um brilho pulsante na cor do tema; Neon no impacto acende o obstáculo no instante em que uma bandeira bate nele. So desenho: nao muda a fisica nem o rebote.',
      opcoes: [
        { valor: 'nenhum', texto: 'Nenhum' },
        { valor: 'aceso', texto: 'Neon aceso' },
        { valor: 'pisca', texto: 'Neon no impacto' }
      ],
      padrao: 'nenhum'
    },
    {
      chave: 'muralPosicao',
      grupo: 'placar',
      tipo: 'opcao',
      rotulo: 'Posição do mural',
      ajuda: 'Horizontal: faixa no cabecalho, com as 8 mais recentes. Vertical: coluna lateral com todas as bandeiras do mural, sem esconder nenhuma (rola se nao couber).',
      opcoes: [
        { valor: 'horizontal', texto: 'Horizontal' },
        { valor: 'vertical', texto: 'Vertical' }
      ],
      padrao: 'horizontal'
    },
    {
      chave: 'rodadas',
      grupo: 'partida',
      rotulo: 'Número de rodadas',
      ajuda: 'Quantas rodadas a partida tem. Ao fim da ultima, a coroa fica na tela e aparece o aviso de fim; R recomeca. 0 = sem limite.',
      zero: 'Sem limite',
      padrao: 0, min: 0, max: 100, passo: 1, casas: 0, sufixo: ''
    },
    {
      chave: 'vencedorasVoltam',
      grupo: 'partida',
      tipo: 'bool',
      textos: { ligado: 'Sim', desligado: 'Não' },
      rotulo: 'Vencedoras voltam às rodadas',
      ajuda: 'Sim: quem venceu continua podendo ser sorteada (e a campea volta na rodada seguinte). Nao: quem vence sai de vez; o torneio termina quando sobrarem menos de duas bandeiras que ainda nao venceram.',
      padrao: true
    },
    {
      chave: 'seta',
      grupo: 'arena',
      tipo: 'bool',
      rotulo: 'Seta da saída',
      ajuda: 'Mostra ou esconde a seta amarela que marca a abertura do anel. So desenho: a abertura continua existindo e girando.',
      padrao: true
    },
    {
      chave: 'cursor',
      grupo: 'interface',
      tipo: 'bool',
      rotulo: 'Cursor do mouse',
      ajuda: 'Mostra ou esconde o ponteiro do mouse sobre a pagina. No painel de Ajustes ele aparece sempre, para voce conseguir usar os controles.',
      padrao: true
    },
    {
      chave: 'dica',
      grupo: 'interface',
      tipo: 'bool',
      rotulo: 'Dica do rodapé',
      ajuda: 'Mostra ou esconde o texto de orientacao no canto esquerdo do rodape.',
      padrao: true
    },
    {
      chave: 'contadorOndas',
      grupo: 'placar',
      tipo: 'bool',
      rotulo: 'Contador de ondas',
      ajuda: 'Mostra ou esconde o numero da onda no canto do cabecalho. A contagem continua por baixo; so a exibicao muda.',
      padrao: true
    },
    {
      chave: 'contadores',
      grupo: 'placar',
      tipo: 'bool',
      rotulo: 'Contadores de bandeiras',
      ajuda: 'Mostra ou esconde os numeros Escaparam e Restam ao lado da arena. A contagem continua por baixo; so a exibicao muda.',
      padrao: true
    },
    {
      chave: 'mural',
      grupo: 'placar',
      tipo: 'bool',
      rotulo: 'Mural de vencedoras',
      ajuda: 'Mostra ou esconde o indicador de vencedoras no cabecalho. O historico continua sendo registrado por baixo, so a exibicao muda.',
      padrao: true
    },
    {
      chave: 'rolagemMural',
      grupo: 'placar',
      rotulo: 'Velocidade do passeio do mural',
      ajuda: 'Quando as vencedoras nao cabem na area visivel, o mural desce sozinho de tempos em tempos para mostrar todas e volta ao topo. Aqui voce escolhe a velocidade da descida, em pixels por segundo (a volta ao topo acompanha). 0 desliga o passeio.',
      zero: 'Desligado',
      padrao: 50, min: 0, max: 150, passo: 5, casas: 0, sufixo: ' px/s'
    },
    {
      chave: 'nomesVencedoras',
      grupo: 'placar',
      tipo: 'bool',
      rotulo: 'Nomes nas vencedoras',
      ajuda: 'Mostra o nome ao lado do escudo no indicador de vencedoras. Desligado, ficam so as bandeiras.',
      padrao: true
    }
  ];

  /* ---------------------------------------------------------------- */
  /* schema: leitura, limites, texto                                    */
  /* ---------------------------------------------------------------- */

  /* Ajustes que entram sozinhos ao ESCOLHER um modo de jogo. Na eliminacao a
     partida tem dezenas de rodadas curtas, entao a arena fica maior, as
     bandeiras menores e o movimento mais lento e calmo. O jogador pode mexer em
     qualquer um depois. Ao voltar para o outro modo nada e' restaurado. */
  var PRESETS = {
    eliminacao: {
      velocidade: 0.25,
      rotacao: 0.39,
      abertura: 25,
      arena: 1.2,
      anel: 45.5,
      tamanhoBandeira: 0.65
    }
  };

  /* Devolve um cfg novo, validado, com os valores do modo por cima. Modo sem
     preset devolve o cfg como veio. */
  function aplicarPreset(cfg, modo) {
    var p = PRESETS[modo];
    if (!p) return cfg;
    var novo = {};
    for (var k in cfg) if (Object.prototype.hasOwnProperty.call(cfg, k)) novo[k] = cfg[k];
    for (var c in p) if (Object.prototype.hasOwnProperty.call(p, c)) novo[c] = p[c];
    return normalizar(novo);
  }

  function padroes() {
    var saida = {};
    for (var i = 0; i < CAMPOS.length; i++) saida[CAMPOS[i].chave] = CAMPOS[i].padrao;
    return saida;
  }

  function campo(chave) {
    for (var i = 0; i < CAMPOS.length; i++) {
      if (CAMPOS[i].chave === chave) return CAMPOS[i];
    }
    return null;
  }

  function limite(valor, campo) {
    if (valor < campo.min) return campo.min;
    if (valor > campo.max) return campo.max;
    return valor;
  }

  /*
   * Qualquer coisa que entre aqui sai valida.
   *
   * Isto nao e' vaidade: o valor vem de localStorage, que o jogador pode ter
   * editado a mao, de uma versao anterior do schema, ou de outro navegador com
   * o mesmo nome de chave. Um `velocidade: NaN` chegando em CFG contamina a
   * fisica inteira em silencio — o `if (sp > velMax)` deixa de cortar, todos
   * os lutadores passam a correr para o infinity e a onda nunca acaba. Por
   * isso o objeto devolvido e' novo e so' com chaves do schema.
   */
  function normalizar(bruto) {
    var saida = {};
    for (var i = 0; i < CAMPOS.length; i++) {
      var c = CAMPOS[i];
      var v = bruto ? bruto[c.chave] : null;
      saida[c.chave] = dentroDoCampo(v, c);
    }
    return saida;
  }

  function dentroDoCampo(valor, c) {
    /* null/undefined/vazio e' "nao preenchido", nao zero: um campo em branco
       tem de voltar ao padrao, nao colar no minimo do intervalo. */
    if (valor === null || valor === undefined || valor === '') return c.padrao;
    if (c.tipo === 'bool') {
      /* vem de checkbox (true/false) ou de localStorage (true/false/"true") */
      if (valor === true || valor === 'true' || valor === 1 || valor === '1') return true;
      if (valor === false || valor === 'false' || valor === 0 || valor === '0') return false;
      return c.padrao;
    }
    if (c.tipo === 'opcao') {
      for (var i = 0; i < c.opcoes.length; i++) {
        if (c.opcoes[i].valor === valor) return valor;
      }
      return c.padrao;
    }
    var n = Number(valor);
    /* isFinite barra NaN e Infinity num passo so' */
    if (!isFinite(n)) return c.padrao;
    return limite(n, c);
  }

  /* Como o numero aparece na tela: mesmo arredondamento para o <output> e para
     o que volta do <input>, para o valor gravado nunca oscilar entre duas
     casas quando o jogador arrasta o slider. */
  function texto(valor, c) {
    if (c && c.tipo === 'opcao') {
      for (var i = 0; i < c.opcoes.length; i++) {
        if (c.opcoes[i].valor === valor) return c.opcoes[i].texto;
      }
      return c.opcoes[0].texto;
    }
    if (c && c.tipo === 'bool') {
      var on = !(valor === false || valor === 'false');
      var t = c.textos || { ligado: 'Ligado', desligado: 'Desligado' };
      return on ? t.ligado : t.desligado;
    }
    var n = Number(valor);
    if (!isFinite(n)) n = c ? c.padrao : 0;
    if (c && c.zero && n === 0) return c.zero;
    var casas = c && typeof c.casas === 'number' ? c.casas : 2;
    return n.toFixed(casas) + (c && c.sufixo ? c.sufixo : '');
  }

  function temAjuste(cfg) {
    var base = padroes();
    for (var i = 0; i < CAMPOS.length; i++) {
      if (cfg && cfg[CAMPOS[i].chave] !== base[CAMPOS[i].chave]) return true;
    }
    return false;
  }

  /* ---------------------------------------------------------------- */
  /* persistencia                                                      */
  /* ---------------------------------------------------------------- */

  function ler() {
    try {
      var bruto = global.localStorage && global.localStorage.getItem(CHAVE);
      if (!bruto) return padroes();
      return normalizar(JSON.parse(bruto));
    } catch (e) {
      /* JSON corrompido, ou localStorage fora (modo privado, iframe sem
         permissao, file:// em alguns navegadores). Perder a configuracao e
         aceitavel; quebrar a arena nao. */
      return padroes();
    }
  }

  /* O texto gravado, sem interpretar (null se nao ha' nada ou o storage esta fora).
     Serve para perceber que OUTRA aba mudou os ajustes comparando com a ultima
     leitura, sem depender do evento `storage`. */
  function lerBruto() {
    try {
      return (global.localStorage && global.localStorage.getItem(CHAVE)) || null;
    } catch (e) {
      return null;
    }
  }

  function gravar(cfg) {
    var limpo = normalizar(cfg);
    try {
      if (global.localStorage) global.localStorage.setItem(CHAVE, JSON.stringify(limpo));
    } catch (e) {
      /* cota cheia, storage desabilitado: a partida continua, so' nao fica
         gravada para a proxima vez */
    }
    return limpo;
  }

  /* A selecao de bandeiras fica a parte dos ajustes: depende da colecao carregada
     (os ids sao nomes de arquivo), entao nao entra no esquema nem na aba de
     ajustes. E' so' uma lista de ids. */
  var CHAVE_SELECAO = 'flag-arena:selecao:v1';

  function lerSelecao() {
    try {
      var bruto = global.localStorage && global.localStorage.getItem(CHAVE_SELECAO);
      var lista = bruto ? JSON.parse(bruto) : [];
      return Array.isArray(lista) ? lista.filter(function (x) { return typeof x === 'string'; }) : [];
    } catch (e) {
      return [];
    }
  }

  function gravarSelecao(ids) {
    try {
      if (global.localStorage) global.localStorage.setItem(CHAVE_SELECAO, JSON.stringify(ids || []));
    } catch (e) { /* sem storage: a escolha vale so' ate' recarregar */ }
  }

  function limpar() {
    try {
      if (global.localStorage) global.localStorage.removeItem(CHAVE);
    } catch (e) { /* mesma razao de gravar: seguir sem guardar */ }
    return padroes();
  }

  /* ---------------------------------------------------------------- */
  /* aplicacao: motor e cena                                          */
  /* ---------------------------------------------------------------- */

  /*
   * `CFG` e' mutavel de proposito e o jogo le dele a cada quadro, entao reescrever
   * as chaves e' o que faz o slider ter efeito sem reiniciar a arena.
   *
   * A velocidade e' a UNICA que precisa de referencia: ela e' um multiplicador,
   * e multiplicar o valor corrente pelo fator cada vez que o slider se move
   * daria 1 -> 2 -> 4 -> 8. `FlagQuiz.BASE` e' a fotografia de fabrica, tirada
   * no carregamento do motor, entao o multiplicador sempre parte do mesmo lugar.
   */
  /* fatores do formato sobre o corpo de colisao (retangular e' a referencia) */
  var FORMATO = {
    retangular: { diametro: 1, margem: 1 },
    quadrada: { diametro: 1.1, margem: 1.16 },
    redonda: { diametro: 1, margem: 0.9 }
  };

  function aplicarNoMotor(cfg, jogo) {
    var c = normalizar(cfg);
    var motor = jogo && jogo.CFG;
    if (!motor) return c;

    var base = global.FlagQuiz && global.FlagQuiz.BASE;
    if (base) {
      motor.velocidade = base.velocidade * c.velocidade;
      /* o teto anda junto: se nao andasse, o dobro da base coincidiria com o
         teto e a velocityMax viraria o novo normal */
      motor.velocidadeMax = base.velocidadeMax * c.velocidade;
      motor.velocidadeMin = base.velocidadeMin * c.velocidade;
    }

    motor.aberturaVelocidade = c.rotacao;
    /* `abertura` e' a largura TOTAL da saida em graus; o motor guarda a metade, em rad */
    motor.aberturaMeiaLargura = c.abertura * Math.PI / 360;
    /* inteiro: `lutadoresIniciais` e' quantos <div> entram na arena */
    motor.lutadoresIniciais = Math.round(c.lutadores);
    motor.raioBorda = c.anel / 100;
    motor.efeitoParede = c.efeitoParede;
    motor.corParede = c.corParede;
    motor.efeitoObstaculo = c.efeitoObstaculo;
    motor.vencedorasVoltam = c.vencedorasVoltam;
    motor.modo = c.modo;
    motor.obstaculo = c.obstaculo;
    /* vertical mostra TODAS (sem o corte em +N); horizontal volta ao limite de fabrica */
    if (base) motor.vencedorasVisiveis = c.muralPosicao === 'vertical' ? 100000 : base.vencedorasVisiveis;
    motor.rodadas = Math.round(c.rodadas);

    /* O corpo de colisao acompanha o desenho. `diametroLutador` e a folga do
       anel sao fracoes do lado, entao escalam com o tamanho; o formato ajusta
       a folga porque o bloco quadrado tem canto (meia-diagonal maior) e o
       redondo nao (a meia-diagonal e' o proprio raio). */
    if (base) {
      var f = FORMATO[c.formato] || FORMATO.retangular;
      motor.diametroLutador = base.diametroLutador * c.tamanhoBandeira * f.diametro;
      motor.margemLutador = base.margemLutador * c.tamanhoBandeira * f.margem;
    }
    return c;
  }

  /*
   * A cena tem de acompanhar o motor, sao tres medidas do mesmo raio:
   *
   *   1. `r` dos dois <circle> do <svg>. E' do anel que GIRA que
   *      `aplicarAbertura()` le o raio para desenhar o portao: se o desenho
   *      ficasse no 182 original, o portao seria desenhado num sitio e a fisica
   *      aceitaria a fuga noutro — a bandeira atravessaria uma parede invisivel.
   *      O outro e' o trilho (o disco escuro de fundo), que encolhe junto para
   *      nao sobrar um halo escuro em volta de um anel menor.
   *   2. `--anel-raio` no :root — e' o que da a largura do painel .coroa, que se
   *      apoia no mesmo circulo. Escrito no :root de proposito: `--anel-diametro`
   *      e' declarado la tambem, e uma custom property resolve o `var()` dela
   *      contra o :root, nao contra o descendente que a sobrescreve.
   *   3. `--arena-escala` no :root — o tamanho do circulo. `--lutador` e'
   *      derivado dela em `.arena`, porque a bandeira tem de escalar junto: a
   *      folga do anel (CFG.margemLutador) e o minimo de colisao
   *      (CFG.diametroLutador) sao fracoes do lado, e sao eles que mediate se
   *      o bloco cabe.
   *
   * `--arena-escala` multiplica o LADO do layout, nao um `transform`: e'
   * `el.arena.clientWidth` que `dimensionar()` le, e `clientWidth` ignora
   * transform. Escalar por transform deixaria a fisica com o tamanho antigo e a
   * bandeira visivel passaria da parede.
   */
  /* Largura (px) ate' a qual a tela e' tratada como celular no modo Automatico. */
  var LARGURA_CELULAR = 720;

  /* O layout de celular e' uma CLASSE no <html> (`layout-celular`), nao uma media
     query: assim o jogador pode forcar um dos dois layouts, e o CSS tem uma regra
     so' para cada caso. `auto` decide pela largura da janela. */
  function usaLayoutCelular(layout) {
    if (layout === 'celular') return true;
    if (layout === 'computador') return false;
    return !!(global.matchMedia && global.matchMedia('(max-width: ' + LARGURA_CELULAR + 'px)').matches);
  }

  function aplicarNoCena(cfg, cena) {
    var c = normalizar(cfg);
    var el = cena || {};

    var r = arredondar(c.anel / 100 * LADO_VIEWBOX);
    if (el.arenaAnelGiro) el.arenaAnelGiro.setAttribute('r', String(r));
    if (el.arenaTrilho) el.arenaTrilho.setAttribute('r', String(r));

    /* o tema e' so' um atributo no <html>; o CSS faz o resto (styles.css, "temas visuais") */
    if (el.raiz && el.raiz.setAttribute) el.raiz.setAttribute('data-tema', c.tema);

    /* o efeito do anel tambem e' so' um atributo no <html>: o CSS desenha nos
       pseudo-elementos do .arena (ver styles.css, "efeito do anel"). Nenhum nao
       casa nenhuma regra, por isso o padrao nao pinta nada. */
    if (el.raiz && el.raiz.setAttribute) el.raiz.setAttribute('data-efeito-anel', c.efeitoAnel);

    /* o neon dos obstaculos tambem e' so' um atributo no <html>: o CSS desenha
       (ver styles.css, "neon dos obstaculos"). O motor so' acrescenta a classe
       temporaria da batida quando o valor pede Neon no impacto. */
    if (el.raiz && el.raiz.setAttribute) el.raiz.setAttribute('data-efeito-obstaculo', c.efeitoObstaculo);

    /* a cor da parede ao bater e' pintada pelo motor a cada batida (game.js);
       ao voltar para "nenhum", apaga a cor que tinha ficado no anel */
    if (el.arenaAnelGiro && el.arenaAnelGiro.style && c.corParede === 'nenhum') el.arenaAnelGiro.style.stroke = '';

    varCss(el.raiz, '--anel-raio', c.anel + '%');
    varCss(el.raiz, '--arena-escala', String(c.arena));

    varCss(el.raiz, '--bandeira-escala', String(c.tamanhoBandeira));
    if (el.raiz && el.raiz.classList) {
      el.raiz.classList.toggle('formato-quadrada', c.formato === 'quadrada');
      el.raiz.classList.toggle('formato-redonda', c.formato === 'redonda');
    }

    if (el.raiz && el.raiz.classList) {
      el.raiz.classList.toggle('layout-celular', usaLayoutCelular(c.layout));
      /* so' quando o jogador FORCA o celular: o jogo vira uma coluna vertical 9:16
         no meio da janela (para lives verticais). No automatico nao ha' moldura. */
      el.raiz.classList.toggle('moldura-celular', c.layout === 'celular');
      el.raiz.classList.toggle('sem-botoes', !c.botoes);
      el.raiz.classList.toggle('sem-iniciar', !c.botaoIniciar);
      el.raiz.classList.toggle('sem-cursor', !c.cursor);
      el.raiz.classList.toggle('sem-seta', !c.seta);
      el.raiz.classList.toggle('sem-mural', !c.mural);
      el.raiz.classList.toggle('sem-contadores', !c.contadores);
      el.raiz.classList.toggle('sem-onda', !c.contadorOndas);
      el.raiz.classList.toggle('sem-dica', !c.dica);
      el.raiz.classList.toggle('mural-vertical', c.muralPosicao === 'vertical');
    }

    /* nomes das vencedoras: uma classe no :root, que o CSS le */
    if (el.raiz && el.raiz.classList) {
      el.raiz.classList.toggle('sem-nomes-vencedoras', !c.nomesVencedoras);
    }
    return c;
  }

  /* Quatro casas no viewBox sao 1/40000 do lado da arena — bem abaixo de um
     pixel em qualquer ecra. O arredondamento existe so' para o atributo nao
     nascer com `181.99999999999997` no HTML; o tracejado do portao continua
     sem arredondar, porque esse e' angulo de fisica (ver game.js). */
  function arredondar(v) {
    return Math.round(v * 10000) / 10000;
  }

  function varCss(no, nome, valor) {
    if (!no || !no.style) return;
    if (typeof no.style.setProperty === 'function') no.style.setProperty(nome, valor);
    else no.style[nome] = valor;
  }

  global.Config = {
    CAMPOS: CAMPOS,
    GRUPOS: GRUPOS,
    CHAVE: CHAVE,
    LADO_VIEWBOX: LADO_VIEWBOX,
    campo: campo,
    PRESETS: PRESETS,
    aplicarPreset: aplicarPreset,
    texto: texto,
    padroes: padroes,
    normalizar: normalizar,
    temAjuste: temAjuste,
    ler: ler,
    lerSelecao: lerSelecao,
    gravarSelecao: gravarSelecao,
    lerBruto: lerBruto,
    gravar: gravar,
    limpar: limpar,
    aplicarNoMotor: aplicarNoMotor,
    usaLayoutCelular: usaLayoutCelular,
    aplicarNoCena: aplicarNoCena
  };
})(typeof window !== 'undefined' ? window : globalThis);
