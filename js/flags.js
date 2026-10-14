/*
 * flags.js - carregamento e normalizacao de bandeiras.
 *
 * Duas fontes de bandeiras:
 *
 *   1. flags/manifest.js  (gerado por tools/gerar-manifest.js)
 *      O usuario joga com as bandeiras versionadas no projeto.
 *
 *   2. Uma pasta escolhida em tempo de execucao ("carregar pasta").
 *      O navegador le os arquivos via File API, sem servidor. O nome do
 *      arquivo vira a resposta, entao nao existe manifest para manter.
 *
 * Normalizacao de texto: comparacao sem acento e sem caixa, com espacos
 * colapsados. E o que permite "Suica", "suíça" e "SWITZERLAND" (quando
 * listado como apelido) a baterem com a mesma entrada.
 */
(function (global) {
  'use strict';

  var EXTENSOES = ['svg', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'avif'];

  /* remove acentos combinantes (bloco U+0300..U+036F) */
  function semAcento(texto) {
    return String(texto)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  /*
   * Forma canonica para comparar a resposta digitada com a esperada.
   *
   * - acentos caem (Suica == suica == suica)
   * - caixa some
   * - hifen e underscore viram espaco, porque sao o que o nome do arquivo usa
   *   ("reino-unido.svg" -> "reino unido")
   * - os demais separadores SOME sem virar espaco, para que abreviaturas com
   *   ponto nao se quebrem: "E.U.A." vira "eua" e casa com "eua.svg"
   */
  function normalizar(texto) {
    return semAcento(texto)
      .replace(/[-_]+/g, ' ')
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* "reino-unido.svg" -> "reino unido" */
  function respostaDoNome(nomeArquivo) {
    var base = String(nomeArquivo).split('/').pop().split('\\').pop();
    var semExt = base.replace(/\.[^.]+$/, '');
    return normalizar(semExt.replace(/[-_]+/g, ' '));
  }

  /*
   * Forma de exibicao: a mesma resposta, com a inicial de cada palavra em
   * maiuscula ("estados unidos" -> "Estados Unidos"), menos as palavrinhas de
   * ligacao (de, da, do, das, dos, e), que ficam minusculas no meio do nome
   * ("africa do sul" -> "Africa do Sul").
   *
   * `answer` e' a forma CANONICA — minuscula, sem acento, sem pontuacao —
   * porque e' contra ela que a entrada do jogador e' comparada. Mexer na caixa
   * de la quebraria a comparacao, entao a correcao acontece so' na hora de
   * mostrar o nome na tela.
   */
  var LIGACOES = { de: 1, da: 1, do: 1, das: 1, dos: 1, e: 1 };

  function exibir(texto) {
    var t = texto == null ? '' : String(texto);
    if (!t) return '';
    return t.split(' ').map(function (palavra, i) {
      if (!palavra) return palavra;
      if (i > 0 && LIGACOES[palavra.toLowerCase()] === 1) return palavra.toLowerCase();
      return palavra.charAt(0).toUpperCase() + palavra.slice(1);
    }).join(' ');
  }

  /*
   * Nome de exibicao de uma bandeira.
   *
   * `answer` perde o acento por construcao, porque e' normalizado para ser
   * comparado. So' o `nome` do manifest carrega a grafia real. Por isso a tela
   * usa ISTE metodo e nao `exibir(answer)`: sem ele, "Grêmio" viraria "Gremio"
   * e "São Paulo" viraria "Sao paulo".
   *
   * Colecoes sem `nome` (uma pasta carregada em tempo de execucao, por exemplo)
   * caem no comportamento antigo: so' a inicial sobe.
   */
  function nome(flag) {
    if (!flag) return '';
    if (flag.nome) return String(flag.nome);
    return exibir(flag.answer);
  }

  /*
   * "reino-unido.svg" -> "reino-unido"
   *
   * O `id` segue a mesma regra do manifest (nome do arquivo sem extensao),
   * para que uma bandeira venha com o mesmo id pelas duas fontes.
   */
  function idDoNome(nomeArquivo) {
    var base = String(nomeArquivo).split('/').pop().split('\\').pop();
    return semAcento(base.replace(/\.[^.]+$/, '')).replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '');
  }

  function temExtensaoDeImagem(nome) {
    var partes = String(nome).toLowerCase().split('.');
    return partes.length > 1 && EXTENSOES.indexOf(partes.pop()) !== -1;
  }

  /* -------------------------------------------------------------- */
  /* fonte 1: manifest do projeto                                    */
  /* -------------------------------------------------------------- */

  function lerManifest() {
    var bruto = global.FLAG_MANIFEST;
    if (!Array.isArray(bruto) || !bruto.length) return [];

    return bruto.map(function (item, indice) {
      var answer = normalizar(item.answer);
      var aliases = [answer];

      (item.aliases || []).forEach(function (a) {
        var n = normalizar(a);
        if (n && aliases.indexOf(n) === -1) aliases.push(n);
      });

      return {
        id: item.id || 'flag-' + indice,
        answer: answer,
        nome: item.nome || null,
        aliases: aliases,
        src: item.src,
        origem: 'projeto',
        urlObravelho: null
      };
    });
  }

  /* -------------------------------------------------------------- */
  /* fonte 2: pasta escolhida em tempo de execucao                   */
  /* -------------------------------------------------------------- */

  function temWebkitDirectory() {
    return 'webkitdirectory' in document.createElement('input');
  }

  function lerPasta(listaDeArquivos) {
    var arquivos = Array.prototype.slice.call(listaDeArquivos);
    var raiz = null;
    var entradas = [];
    var vistas = Object.create(null);

    /* quando o navegador entrega webkitRelativePath, ele escolheu a pasta
       de verdade: ignora qualquer coisa vinda de fora dela. */
    var deFora = [];
    arquivos.forEach(function (arquivo) {
      if (arquivo.webkitRelativePath) {
        var partes = arquivo.webkitRelativePath.split('/');
        if (raiz === null) raiz = partes[0];
        if (partes[0] !== raiz) deFora.push(arquivo);
      }
    });

    arquivos.forEach(function (arquivo) {
      if (deFora.indexOf(arquivo) !== -1) return;
      if (!temExtensaoDeImagem(arquivo.name)) return;
      if (arquivo.name.charAt(0) === '.') return;

      var resposta = respostaDoNome(arquivo.name);
      if (!resposta) return;

      var id = idDoNome(arquivo.name);
      if (!id || vistas[id]) return;
      vistas[id] = true;

      entradas.push({
        id: id,
        answer: resposta,
        aliases: [resposta],
        src: arquivo.name,
        origem: 'pasta',
        urlObravelho: URL.createObjectURL(arquivo),
        bytes: arquivo.size,
        tipo: arquivo.type
      });
    });

    return entradas;
  }

  /*
   * Libera as object URLs que nao voltarao a ser usadas.
   *
   * Isso precisa do segundo argumento. Trocar de pasta e' o caso comum: as
   * bandeiras da colecao nova sao outras blob URLs, e as antigas so precisam
   * morrer depois que o DOM largou os <img> que apontavam para elas. Revogar
   * cedo demais troca a imagem por arquivo quebrado na tela.
   *
   * O segundo argumento tambem protege quem JOGA: se a lista nova reaproveita
   * a mesma URL (o mesmo objeto File), essa URL e' preservada de proposito.
   *
   * Chamar com um argumento so (ou nenhum) revoga tudo, para quando a colecao
   * esta de fato sendo descartada.
   */
  function revogar(antigas, novas) {
    var alvo = antigas || [];

    if (!novas) {
      alvo.forEach(function (f) {
        if (f.urlObravelho) URL.revokeObjectURL(f.urlObravelho);
      });
      return;
    }

    var preservadas = new Set();
    novas.forEach(function (f) {
      if (f.urlObravelho) preservadas.add(f.urlObravelho);
    });

    alvo.forEach(function (f) {
      if (f.urlObravelho && !preservadas.has(f.urlObravelho)) {
        URL.revokeObjectURL(f.urlObravelho);
      }
    });
  }

  /* Fisher-Yates */
  function embaralhar(lista) {
    var a = lista.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  global.Bandeiras = {
    semAcento: semAcento,
    normalizar: normalizar,
    exibir: exibir,
    nome: nome,
    respostaDoNome: respostaDoNome,
    temExtensaoDeImagem: temExtensaoDeImagem,
    temWebkitDirectory: temWebkitDirectory,
    lerManifest: lerManifest,
    lerPasta: lerPasta,
    revogar: revogar,
    embaralhar: embaralhar
  };
})(typeof window !== 'undefined' ? window : globalThis);
