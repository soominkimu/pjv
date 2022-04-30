#!/usr/bin/env node
/*=============================================================================
 pkviz - package.json visualizer
   - an alternative of cat and bat tools providing formatted view of config files:
     .env: aligned table
     package.json: especially the "scripts" field

 - Installation
 $ yarn global add @spacetimeq/pkviz

 - Option arguments
   s - print scripts only in package.json and .env

 https://docs.npmjs.com/cli/v7/configuring-npm/package-json

 (C) 2022 SpacetimeQ INC
=============================================================================*/
import fs from 'fs';
import dotenv from 'dotenv';
import chalk from 'chalk';
// const chalk = require('chalk');

const SEP = chalk.gray(': ');  // separator between key and value
const BULLET = '▫️ ';

type TVMODE = 'all'|'scripts'|'dotenv';

// JSON object in typescript, Recursive Type Alias
type JSONValue =
  | string
  | number
  | boolean
  | JSONObject
  | Array<JSONValue>;
interface JSONObject { [x: string]: JSONValue };

const PACKAGE = './package.json';
const DOTENV  = './.env';

let vmode: TVMODE = 'all';
const [,, ...args] = process.argv;
if (args[0]) {
  const { name, version, description } = require('../package.json');
  const option = (args[0][0] === '-')  // allow up to two '-' for the option prefix
    ? (args[0][1] === '-')
      ? args[0][2]
      : args[0][1]
    : args[0][0];

  switch (option.toUpperCase()) {
    case 'E': vmode = 'dotenv'; break;
    case 'S': vmode = 'scripts'; break;
    case 'V':
      console.log(version);
      // console.log(process.env.npm_package_version);
      process.exit(0);
    default:
      console.log(chalk.yellowBright(name), chalk.greenBright('v' + version), description);
      console.log(
        chalk.yellow("OPTIONS:"), `\n`,
        chalk.green('-v, v'), SEP, "version", '\n',
        chalk.green('-e, e'), SEP, ".env only", '\n',
        chalk.green('-s, s'), SEP, "scripts (in package.json) only"
      );
      process.exit(0);
  }
}

// arg: a | A - all
const SCRIPT_HL = [  // highlighted script
  'start',
  'serve',
  'build',
];

// pad should be the length of the longest key + 1
const maxKeyLen = (obj: JSONObject) => {
  let len=0;
  Object.keys(obj).forEach((key) => {
    if (key.length > len)
      len = key.length;
  });
  return len;
}

// log filename
const logFilename = (name: string) =>
  console.log(chalk.white.bgGray(` ${name}`.padEnd(80)));

const logField = (field: string) =>
  console.log(chalk.black.bgCyan(` ◀︎ ${field} ▶︎ `));

const logNumbering = (n: number) =>
  chalk.gray(`${(n+1).toString().padStart(3)}`);

// iterate object
const logKeyValueObj = (obj: JSONObject, key: string) => {
  const o = obj[key] as JSONObject;
  if ((typeof (o) !== 'object') || Array.isArray(o))
    return;
  const isScript = key === 'scripts';
  if (vmode === 'scripts' && !isScript)
    return;
  const pad = maxKeyLen(o);
  logField(key);
  Object.keys(o).forEach((k, i) => {
    const pk = ` ${k.padEnd(pad)} `;  // padded key
    console.log(
      logNumbering(i),
      isScript
      ? SCRIPT_HL.includes(k)
        ? chalk.black.bgYellow(pk) + SEP + chalk.yellow(o[k])
        : chalk.yellow(pk)         + SEP + chalk.white(o[k])
      : (k.includes('@'))
        ? chalk.redBright(pk) + SEP + chalk.blue(o[k])
        : chalk.yellow(pk)    + SEP + chalk.cyan(o[k])
    );
  });
}

const logKeyValue = (obj: JSONObject, key: string) => {
  const o = obj[key] as JSONObject;
  if ((typeof (o) !== 'object') || Array.isArray(o))
    console.log(BULLET, chalk.cyanBright(key), ':', o);
}

try {
  fs.access(DOTENV, fs.constants.F_OK, (err) => {
    if (err) {
      // console.log("No .env");
      return;
    }
    logFilename('.env');
    const env = dotenv.parse(fs.readFileSync(DOTENV, 'utf8'));
    const pad = maxKeyLen(env);
    Object.keys(env).forEach((key, i) => {
      console.log(
        logNumbering(i),
        key.padEnd(pad), chalk.gray(':'), chalk.greenBright(env[key])
      );
    });
  });
} catch (err) {
  console.error(err);
}

if (vmode !== 'dotenv') {
  try {
    fs.access(PACKAGE, fs.constants.F_OK, (err) => {
      if (err) {  // file not found
        console.log("⛔️ No", chalk.red(PACKAGE));
        return;
      }
      const json = JSON.parse(fs.readFileSync(PACKAGE, 'utf8'));
      console.log(
        chalk.white.bgGray(` package.json  `) +
        chalk.black.bgWhite(` ${json.name} `) +
        chalk.black.bgGreen(` ${json.version     || 'no version'} `) +
        chalk.green.bgBlack(` ${json.description || ''} `)
      );
    // if ((typeof (o) !== 'object') || Array.isArray(o))
      if (vmode !== 'scripts')
        Object.keys(json).forEach(key => logKeyValue(json, key));
      Object.keys(json).forEach(key => logKeyValueObj(json, key));
    });
  } catch (err) {
    console.error(err);
  }
}
