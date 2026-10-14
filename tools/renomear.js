const fs = require('fs');
const path = require('path');

const dir = path.resolve(__dirname, '..', 'flags');
const de = process.argv[2];
const para = process.argv[3];

if (!de || !para) {
  console.error('uso: node tools/renomear.js "nome-Atual.svg" "nome-novo.svg"');
  process.exit(1);
}

const origem = path.join(dir, de);
const destino = path.join(dir, para);

if (!fs.existsSync(origem)) {
  console.error('origem nao existe:', JSON.stringify(de));
  process.exit(1);
}
if (fs.existsSync(destino)) {
  console.error('destino ja existe:', JSON.stringify(para));
  process.exit(1);
}

fs.renameSync(origem, destino);
console.log(`${JSON.stringify(de)} -> ${JSON.stringify(para)}`);
