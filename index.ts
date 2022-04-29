/*=============================================================================
 pkviz - package.json visualizer

 (C) 2022 SpacetimeQ INC
=============================================================================*/
import fs from 'fs';
import dotenv from 'dotenv';
import chalk from 'chalk';
// const chalk = require('chalk');

const PACKAGE = './package.json';
const DOTENV  = './.env';

const args = process.argv.slice(2);
// arg: a | A - all
const PKG_KEYS = ['scripts'];
if (args[0]?.toUpperCase() === 'A') {
  PKG_KEYS.push(
    'dependencies',
    'devDependencies',
    'engines'
  );
}
const SCRIPT_HL = [  // highlighted script
  'start',
  'serve',
  'build',
];

// log filename
const logFilename = (name: string) =>
  console.log(chalk.white.bgGray(` ${name}`.padEnd(80)));

// iterate object
const logObj = (obj: any, key: string) => {
  console.log(chalk.black.bgCyan(` ◀︎ ${key} ▶︎ `));
  const o = obj[key];
  const colorWhite = (key === PKG_KEYS[0]);
  Object.keys(o).forEach((k, i) => {
    console.log(
      chalk.gray(`${(i+1).toString().padStart(3, ' ')}`),
      colorWhite
      ? (SCRIPT_HL.includes(k)
        ? chalk.black.bgYellow(` ${k} `)
        : chalk.yellow(` ${k} `))
        + ': ' + chalk.white(o[k])
      : (k.includes('@'))
        ? chalk.redBright.underline(k) + ' ' + chalk.blue(o[k])
        : chalk.yellow(k) + ' ' + chalk.cyan(o[k])
    );
  });
}

try {
  fs.access(DOTENV, fs.constants.F_OK, (err) => {
    if (err) {
      // console.log("No .env");
      return;
    }
    logFilename('.env');
    const env = dotenv.parse(fs.readFileSync(DOTENV, 'utf8'));
    let pad=0;  // pad should be the length of the longest key + 1
    Object.keys(env).forEach((key) => {
      if (key.length > pad)
        pad = key.length + 1;
    });
    Object.keys(env).forEach((key) => {
      console.log(
        chalk.redBright(` ${key.padEnd(pad)} `),
        chalk.greenBright(env[key])
      );
    });
  });
} catch (err) {
  console.error(err);
}

try {
  fs.access(PACKAGE, fs.constants.F_OK, (err) => {
    if (err) {  // file not found
      console.log("No", chalk.red(PACKAGE));
      return;
    }
    const json = JSON.parse(fs.readFileSync(PACKAGE, 'utf8'));
    console.log(
      chalk.white.bgGray(` package.json  `) +
      chalk.black.bgWhite(` ${json.name} `) +
      chalk.black.bgGreen(` ${json.version     || 'no version'} `) +
      chalk.green.bgBlack(` ${json.description || ''} `)
    );
    Object.keys(json).forEach(key => {
      if (PKG_KEYS.includes(key))
        logObj(json, key);
    });
  });
} catch (err) {
  console.error(err);
}

