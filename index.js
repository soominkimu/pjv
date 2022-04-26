/*=============================================================================
 package - visualize package.json

 (C) 2022 SpacetimeQ INC
=============================================================================*/
import fs from 'fs';
import chalk from 'chalk';

const log = console.log;
const args = process.argv.slice(2);
// arg: a | A - all
const KEYS = ['scripts'];
if (args[0]?.toUpperCase() === 'A') {
  KEYS.push(
    'dependencies',
    'devDependencies',
    'engines'
  );
}

// iterate object
const logObj = (obj, key) => {
  log(chalk.black.bgCyan(` ◀︎ ${key} ▶︎ `));
  const o = obj[key];
  Object.keys(o).forEach((k, i) => {
    log(chalk.gray(`${i+1})`), chalk.yellow.underline(k), chalk.cyan(o[k]));
  });
}

try {
  const json = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  log(
    chalk.black.bgWhite(` ${json.name} `) +
    chalk.black.bgGreen(` ${json.version || 'no version'} ` +
    chalk.white(json.description || ''))
  );
  Object.keys(json).forEach(key => {
    if (KEYS.includes(key)) {
      logObj(json, key);
    }
  });
} catch (err) {
  console.error(err);
}
