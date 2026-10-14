#!/usr/bin/env node
/*
 * Copia a lista de ajustes de index.html para ajustes.html.
 *
 * Uso:
 *   node tools/sincronizar-ajustes.js
 *
 * Por que existe: o painel de Ajustes do jogo (index.html) e a pagina em aba propria
 * (ajustes.html) mostram as mesmas opcoes. A lista fica escrita a mao em index.html,
 * entre `<!-- ajustes:inicio` e `<!-- ajustes:fim -->`, e este script a replica no
 * mesmo trecho de ajustes.html. tools/testar.js confere que as duas sao identicas.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INICIO = '<!-- ajustes:inicio';
const FIM = '<!-- ajustes:fim -->';

function trecho(html) {
  const a = html.indexOf(INICIO);
  const b = html.indexOf(FIM);
  if (a === -1 || b === -1) throw new Error('marcadores ajustes:inicio / ajustes:fim ausentes');
  return { a, b: b + FIM.length };
}

function sincronizar() {
  const origem = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const destinoCaminho = path.join(ROOT, 'ajustes.html');
  const destino = fs.readFileSync(destinoCaminho, 'utf8');

  const o = trecho(origem);
  const d = trecho(destino);
  const novo = destino.slice(0, d.a) + origem.slice(o.a, o.b) + destino.slice(d.b);
  fs.writeFileSync(destinoCaminho, novo, 'utf8');
  console.log('ajustes.html sincronizado com index.html');
}

if (require.main === module) sincronizar();
module.exports = { trecho };
