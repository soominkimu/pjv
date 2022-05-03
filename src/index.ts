#!/ur/bin/env node
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

 TODO: When the element of array is an object, formatting is required. [object Object]

 (C) 2022 SpacetimeQ INC
=============================================================================*/
import fs from 'fs';
import dotenv from 'dotenv';
import chalk from 'chalk';  // for TypeScript use version ^4
import { exec } from 'child_process';

const SEP  = chalk.gray(': ');  // separator between key and value
const SEP0 = chalk.gray(':');
const BULLET = '▫️ ';

type TVMODE = 'all'|'scripts'|'dotenv'|'outdated';

// JSON object in typescript, Recursive Type Alias
type JSONValue =
  | string
  | number
  | boolean
  | JSONObject
  | Array<JSONValue>;
interface JSONObject { [x: string]: JSONValue };

interface TVersions {
  current: string;
  wanted:  string;
  latest:  string;
};
interface TPackages {
  name:  string;
  dev:   boolean;    // devDependencies
  ver:   string;     // version in package.json
  outd?: TVersions;  // outdated
};
const packVers: TPackages[] = [];

const isObject = (o: Object) =>
  (typeof (o) === 'object') && !Array.isArray(o);  // array also is an 'object'

const PACKAGE = './package.json';
const DOTENV  = './.env';
const OPTIONS = new Map([  // key-value pairs with the original insertion order of the keys
  ['v', "vresion"],
  ['e', ".env only"],
  ['s', "scripts (in package.json) only"],
  ['o', "check outdated packages"],
]);

let vmode: TVMODE = 'all';
const [,, ...args] = process.argv;
if (args[0]) {
  const arg = args[0];
  const { name, version, description } = require('../package.json');
  const option = (arg[0] === '-')  // allow up to two '-' for the option prefix
    ? (arg[1] === '-')
      ? arg[2]
      : arg[1]
    : arg[0];

  switch (option.toUpperCase()) {
    case 'E': vmode = 'dotenv';   break;
    case 'S': vmode = 'scripts';  break;
    case 'O': vmode = 'outdated'; break;
    case 'V':
      console.log(version);
      // console.log(process.env.npm_package_version);
      process.exit(0);
    default:
      console.log(chalk.yellowBright(name), chalk.greenBright('v' + version), description);
      console.log(chalk.yellowBright('node'), chalk.greenBright(process.version));
      console.log(chalk.yellow("OPTIONS:"));
      OPTIONS.forEach((val, key) =>
        console.log('  ', chalk.green('-' + key) + ', ' + chalk.green(key), SEP0, val)
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
const maxKeyLen = (obj: JSONObject | Array<string>) => {
  let len=0;
  (Array.isArray(obj) ? obj : Object.keys(obj)).forEach((key) => {
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

const logSubObj = (obj: JSONObject, key: string) => {
  console.log(BULLET, chalk.cyanBright(key));
  Object.entries(obj).forEach(([kv, vv], iv) => {
    if (isObject(vv)) {
      logSubObj(vv as JSONObject, kv);  // recursively call
    } else {
      const pk = ` ${kv.padEnd(maxKeyLen(obj))} `;
      console.log(logNumbering(iv), chalk.yellow(pk) + SEP + chalk.green(vv));
    }
  });
}

// iterate object
const logKeyValueObj = (obj: JSONObject, key: string) => {
  const o = obj[key] as JSONObject;
  const isScript = key === 'scripts';
  const isDep = key.toLowerCase().includes('dependencies');
  if (!isScript && vmode === 'scripts')
    return;
  if (isDep && vmode === 'outdated') {
    const dev = key === 'devDependencies';
    Object.entries(o).forEach(([name, ver]) =>
      packVers.push({ name, dev, ver: ver as string })
    );
    return;
  }
  logField(key);
  Object.entries(o).forEach(([k, val], i) => {
    if (isObject(val)) {
      logSubObj(val as JSONObject, k);
    } else {
      const pk = ` ${k.padEnd(maxKeyLen(o))} `;  // padded key
      console.log(
        logNumbering(i),
        isScript
        ? SCRIPT_HL.includes(k)
          ? chalk.black.bgYellow(pk) + SEP + chalk.yellow(val)
          : chalk.yellow(pk)         + SEP + chalk.white(val)
        : (isDep && k.includes('@'))
          ? chalk.redBright(pk) + SEP + chalk.blue(val)
          : chalk.yellow(pk)    + SEP + chalk.cyan(val)
      );
    }
  });
}

const logKeyValue = (obj: JSONObject, key: string, pad: number) => {
  console.log(BULLET, chalk.cyanBright(`${key.padEnd(pad)}`), SEP0, obj[key]);
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
    Object.entries(env).forEach(([key, val], i) => {
      console.log(
        logNumbering(i),
        key.padEnd(pad) + SEP + chalk.greenBright(val)
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
      // Partition keys array by its content if it is of pure object type or not
      const [ob, no] = Object.keys(json).reduce<[string[], string[]]>
        (([ob, no], k) =>
          (isObject(json[k])
          ? [[...ob, k], no]
          : [ob, [...no, k]]), [[], []]);
      if (vmode !== 'scripts') {
        const pad = maxKeyLen(no);
        no.forEach(key => logKeyValue(json, key, pad));
      }
      ob.forEach(key => logKeyValueObj(json, key));

    });
  } catch (err) {
    console.error(err);
  }
}

/**
 * package versions
 * @param pack - package versions object
 * @param pad - package name padding
 * @param d - version padding
 */
const logPackVers = (pack: TPackages[], pad: number, d: number) => {
  if (!pack.length)
    return;
  const field = (pack[0].dev ? 'devDependencies' : 'dependencies').padEnd(pad + d + 2);
  console.log(
    chalk.black.bgCyan(` ◀︎ ${field.padEnd(pad+d+2)} ▶︎ `),
    chalk.black.bgWhite((d > 6 ? 'Current' : 'Cur').padStart(d)),
    chalk.black.bgGreen('Wanted'.padStart(d)),
    chalk.black.bgMagenta('Latest'.padStart(d))
  );
  pack.forEach((p, i) => {
    const nk = ` ${p.name.padEnd(pad)} `;
    const od = packVers.find(pk => pk.name === p.name)?.outd;
    console.log(
      logNumbering(i),
      p.name.includes('@')
      ? chalk.redBright(nk) + SEP + chalk.blue(p.ver.padStart(d))
      : chalk.yellow(nk)    + SEP + chalk.cyan(p.ver.padStart(d)),
      od
      ? chalk.white(         (od.current||' ').padStart(d) ) + ' ' +
        chalk.greenBright(   (od.wanted||' ').padStart(d) )  + ' ' +
        chalk.magentaBright( (od.latest||' ').padStart(d) )
      : ''
    );
  });
}

/**
 * assumption that packVers was already built by reading package.json
 */
if (vmode === 'outdated') {
  // takes time to run the external command
  exec('npm outdated --json', (error, stdout) => {  // stderr)
    if (stdout) {
      // console.log(stdout);
      let pad=0;  // package name padding
      let d=6;    // minimum padding for version string
      packVers.forEach(p => {
        if (p.name.length > pad) pad = p.name.length;
        if (p.ver.length  > d)   d   = p.ver.length;
      });
      const json = JSON.parse(stdout);
      Object.entries(json).forEach(([key, val]) => {
        const { current, wanted, latest } = val as TVersions;
        const fo = packVers.find(x => x.name === key);
        if (fo) {
          fo.outd = { current, wanted, latest };
          if (current?.length > d) d = current.length;
          if (wanted?.length  > d) d = wanted.length;
          if (latest?.length  > d) d = latest.length;
        } else {
          console.error(key, "not found!");
        }
      });
      const [pro, dev] = packVers.reduce<[TPackages[], TPackages[]]>(([pro, dev], k) =>
        (k.dev ? [pro, [...dev, k]] : [[...pro, k], dev]), [[], []]);
      logPackVers(pro, pad, d);
      logPackVers(dev, pad, d);
    }
    if (!error) {
      console.log('✨No outdated modules!');
    }
  });
}
