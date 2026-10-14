const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const texto = fs.readFileSync(path.join(ROOT, 'flags', 'manifest.js'), 'utf8');

const sandbox = { window: {} };
new Function('window', texto)(sandbox.window);
const manifest = sandbox.window.FLAG_MANIFEST;

const semAcento = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const cp = (s) =>
  Array.from(s)
    .map((c) => c.codePointAt(0).toString(16).padStart(4, '0'))
    .join(' ');

console.log('entradas no manifest:', manifest.length);

const problemas = [];

manifest.forEach((e) => {
  // src precisa apontar para um arquivo existente
  if (!fs.existsSync(path.join(ROOT, e.src))) problemas.push(`src inexistente: ${e.src}`);

  // answer tem que ser a versao normalizada do nome do arquivo
  const esperado = semAcento(path.basename(e.src, path.extname(e.src))).replace(/[-_]+/g, ' ');
  if (semAcento(e.answer) !== esperado.replace(/\s+/g, ' ').trim()) {
    problemas.push(`answer inconsistente: ${e.id} -> "${e.answer}" (esperado "${esperado}")`);
  }

  // answer precisa estar em aliases
  if (!e.aliases.map(semAcento).includes(semAcento(e.answer))) {
    problemas.push(`answer fora de aliases: ${e.id}`);
  }

  // aliases nao podem ter acento (o jogo compara normalizado, mas deixa limpo)
  e.aliases.forEach((a) => {
    if (a !== semAcento(a)) problemas.push(`alias com acento: ${e.id} -> "${a}"`);
  });
});

// ids duplicados
const ids = manifest.map((e) => e.id);
ids.forEach((id, i) => {
  if (ids.indexOf(id) !== i) problemas.push(`id duplicado: ${id}`);
});

console.log('\ncasos com acento no nome do arquivo:');
manifest
  .filter((e) => Buffer.from(e.id, 'utf8').some((b) => b > 127))
  .forEach((e) => {
    const cps = cp(e.answer);
    console.log(`  arquivo codepoints ${cp(path.parse(e.src).name)}`);
    console.log(`  id      "${e.id}"  [${cp(e.id)}]`);
    console.log(`  answer  "${e.answer}"  [${cps}]`);
    console.log(`  aliases ${JSON.stringify(e.aliases)}`);
  });

console.log('\n--- resultado ---');
if (!problemas.length) {
  console.log('OK: manifest consistente.');
} else {
  console.log(`${problemas.length} problema(s):`);
  problemas.forEach((p) => console.log('  ' + p));
  process.exitCode = 1;
}
