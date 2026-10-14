#!/usr/bin/env node
/*
 * Renomeia arquivos de flags/ para a versao ASCII do proprio nome.
 *
 * Motivo: acentos em nome de arquivo funcionam, mas dependem da codificacao
 * com que o arquivo foi criado (o Windows tem varias). Um nome 100% ASCII
 * remove a chance de "suçã" virar lixo. A resposta continua funcionando com
 * acento, porque a comparacao no jogo normaliza de qualquer jeito.
 *
 *  ALCANTARA.svg -> ALCANTARA.svg   (nao muda, ja e ascii)
 *   suéica.svg    -> suecia.svg
 *
 * Uso:
 *   node tools/sanear-nomes.js          apenas mostra o que faria
 *   node tools/sanear-nomes.js --sim    executa
 */

const fs = require('fs');
const path = require('path');

const DIR = path.resolve(__dirname, '..', 'flags');
const EXTENSOES = new Set(['.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif']);

const aplicar = process.argv.includes('--sim');

function paraAscii(nome) {
  const ext = path.extname(nome);
  const base = path.basename(nome, ext);
  const limpo = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
  return (limpo || 'flag') + ext.toLowerCase();
}

const arquivos = fs.readdirSync(DIR).filter((n) => EXTENSOES.has(path.extname(n).toLowerCase()));

const planos = [];

for (const nome of arquivos) {
  const alvo = paraAscii(nome);
  if (alvo === nome) continue;

  const jaExiste = arquivos.includes(alvo);
  planos.push({ de: nome, para: alvo, jaExiste });
}

if (!planos.length) {
  console.log('Nada a fazer: todos os nomes ja sao ASCII.');
  process.exit(0);
}

console.log(aplicar ? 'Aplicando:' : 'Plano (use --sim para aplicar):');
planos.forEach((p) => {
  console.log(`  ${JSON.stringify(p.de)} -> ${JSON.stringify(p.para)}${p.jaExiste ? '  [JA EXISTE, pulando]' : ''}`);
});

if (!aplicar) process.exit(0);

let feito = 0;
planos.forEach((p) => {
  if (p.jaExiste) return;
  fs.renameSync(path.join(DIR, p.de), path.join(DIR, p.para));
  feito++;
});

console.log(`\n${feito} arquivo(s) renomeado(s). Rode node tools/gerar-manifest.js depois.`);
