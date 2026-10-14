/*
 * Confere (e repara) a regex de acentos nos arquivos do projeto.
 *
 *Por que isso existe: a faixa U+0300..U+036F e formada por caracteres
 * combinantes invisiveis. Se eles forem escritos literalmente no fonte, a
 * codificacao do editor/pipeline pode corrompe-los e o resultado e silencioso
 * e errado - um .replace que apaga letras em vez de acentos.
 *
 * A forma segura e sempre usar os escapes: /[\u0300-\u036f]/g
 *
 * Uso: node tools/checar-acentos.js [--corrigir]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ARQUIVOS = ['js/flags.js', 'js/game.js', 'tools/gerar-manifest.js', 'tools/sanear-nomes.js', 'tools/verificar-manifest.js'];

const CORRIGIDO = '.replace(/[\\u0300-\\u036f]/g, \'\')';
const fs2 = require('fs');
const BROKEN = fs2
  .readFileSync(path.join(__dirname, 'verificar-manifest.js'), 'utf8')
  .match(/replace\(\/\[[^\]]*\]\/g, ''\)/);

const corrigir = process.argv.includes('--corrigir');
let problemas = 0;

ARQUIVOS.forEach((rel) => {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return;

  let texto = fs.readFileSync(abs, 'utf8');
  const original = texto;

  texto.split(/\r?\n/).forEach((linha) => {
    const temClasseSuspeita = /\.replace\(\/\[[^\]]*\]\/g, ''\)/.test(linha) && !linha.includes('\\u0300');
    if (!temClasseSuspeita) return;

    const naoAscii = Array.from(linha).filter((c) => c.codePointAt(0) > 127);
    problemas++;
    console.log(`${rel}: faixa literal de acentos`);
    console.log(`  ${JSON.stringify(linha.trim())}`);
    console.log(
      `  nao-ascii: ${naoAscii
        .map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'))
        .join(' ') || '(nenhum)'}`);

    if (corrigir) {
      texto = texto.replace(linha, linha.replace(/\.replace\(\/\[[^\]]*\]\/g, ''\)/, CORRIGIDO));
    }
  });

  if (texto !== original) {
    fs.writeFileSync(abs, texto, 'utf8');
    console.log(`  -> corrigido para ${CORRIGIDO}`);
  }
});

console.log(problemas ? `\n${problemas} ocorrencia(s).` : 'OK: nenhuma faixa literal de acentos.');
if (problemas && !corrigir) process.exitCode = 1;
