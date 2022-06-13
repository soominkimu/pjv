#!/usr/bin/env node
/*=============================================================================
 pjv - package.json visualization tool
   - an alternative of cat and bat tools providing formatted view of config files:
     .env: aligned table
     package.json: especially the "scripts" field

 - Installation
 $ yarn global add pjv

 - Option arguments
   s - print scripts only in package.json and .env

 https://docs.npmjs.com/cli/v7/configuring-npm/package-json

 TODO: When the element of array is an object, formatting is required. [object Object]
 - test case: ~/.config/yarn/global/node_modules/yaml/

 (C) 2022 SpacetimeQ INC
=============================================================================*/
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import chalk from 'chalk';  // for TypeScript use version ^4
import semver from 'semver';
import { exec } from 'child_process';

const SEP  = chalk.gray(': ');  // separator between key and value
const SEP0 = chalk.gray(':');
const BULLET = '▫️ ';
const MIN_PAD_VER = 6;  // minimum padding for version strings
const SEMVERSIGN = new Map([  // semverDiff
  ['major', '❌'],
  ['minor', '✅'],
  ['patch', '✔️ '],
]);

type TVMODE = 'all'|'scripts'|'dotenv'|'xoutdated';

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
interface TOutdatedResult extends TVersions {
  dependent: string;
  location:  string;
};
interface TPackages {
  dep:   string|undefined;
  name:  string;
  dev:   boolean;    // devDependencies
  ver:   string;     // version in package.json
  outd?: TVersions;  // outdated
};
const packVers: TPackages[] = [];
let packageName = '';
const dirBase = path.basename(process.cwd());

const isObject = (o: Object) =>
  (typeof (o) === 'object') && !Array.isArray(o);  // array also is an 'object'

let rootPath = './';
const PACKAGE = 'package.json';
const DOTENV  = '.env';
const HELP = [  // key-value pairs with the original insertion order of the keys
  ['v', "version",   "package version"],
  ['e', "env",       ".env only"],
  ['s', "scripts",   "scripts (in package.json) only"],
  ['x', "xoutdated", "skip check npm outdated packages (takes time)"],
  ['h', "help",      "help"],
];

const [,, ...args] = process.argv;
let vmode: TVMODE = 'all';
if (args[0]) {
  const arg = args[0];
  const { name, version, description } = require('../' + PACKAGE);  // own package
  const option = (arg[0] === '-')  // allow up to two '-' for the option prefix
    ? (arg[1] === '-')
      ? arg[2]  // arg.substring(2)  // long
      : arg[1]  // short
    : '';

  if (option) {
    switch (option.toLowerCase()[0]) {
      case 'e': vmode = 'dotenv';    break;
      case 's': vmode = 'scripts';   break;
      case 'x': vmode = 'xoutdated'; break;
      case 'v':
        console.log(version);
        // console.log(process.env.npm_package_version);
        process.exit(0);
      default:
        console.log(chalk.yellowBright(name), chalk.greenBright('v' + version), description,
          '-', chalk.yellowBright('node'), chalk.greenBright(process.version));
        console.log(' ', chalk.gray('by'), chalk.blue("SPACE") + chalk.green('TIME') + chalk.red('Q'));
        console.log(chalk.yellow("OPTIONS:"));
        let pad=7;  // set the longest length in HELP's long option
        HELP.forEach(arr => {
          if (arr[1].length > pad)
            pad = arr[1].length;
        });
        HELP.forEach(arr =>
          console.log(' ',
            chalk.green('-' + arr[0]) + ', ' +
            chalk.green('--' + arr[1].padEnd(pad)), arr[2])
        );
        process.exit(0);
    }
  } else {
    rootPath = arg;  // TODO: REGEX check required
    if (rootPath[rootPath.length-1] !== '/')
      rootPath += '/';
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
  if (isDep && vmode !== 'xoutdated') {
    const dev = key === 'devDependencies';
    Object.entries(o).forEach(([name, ver]) =>
      packVers.push({ dep: dirBase, name, dev, ver: ver as string })
    );
    return;  // just keep in packVers to print when outdated versions are fetched
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
  let content = obj[key];
  if (key === 'name' && packageName !== dirBase) {
    content += '🚨' + chalk.redBright(' ≠../' + dirBase);
  }
  console.log(BULLET, chalk.cyanBright(`${key.padEnd(pad)}`), SEP0, content);
}

try {
  fs.access(rootPath + DOTENV, fs.constants.F_OK, (err) => {
    if (err) {
      // console.log("No .env");
      return;
    }
    logFilename('.env');
    const env = dotenv.parse(fs.readFileSync(rootPath + DOTENV, 'utf8'));
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
    fs.access(rootPath + PACKAGE, fs.constants.F_OK, (err) => {
      if (err) {  // file not found
        console.log("⛔️ No", rootPath + PACKAGE);
        process.exit(1);
      }
      const json = JSON.parse(fs.readFileSync(rootPath + PACKAGE, 'utf8'));
      packageName = json.name;
      console.log(
        chalk.white.bgGray(` ${PACKAGE}  `) +
        chalk.black.bgWhite(` ${packageName} `) +
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
 * @param pd - padding 0: package nanme, 1: package version, 2: Current, 3: Wanted, 4: Latest
 */
const logPackVers = (pack: TPackages[], pd: number[]) => {
  if (!pack.length)
    return;
  const field = (pack[0].dev ? 'devDependencies' : 'dependencies').padEnd(pd[0] + pd[1] + 2);
  console.log(
    chalk.black.bgCyan(` ◀︎ ${field.padEnd(pd[0]+pd[1]+2)} ▶︎ `),
    chalk.black.bgWhite((pd[2] > MIN_PAD_VER ? 'Current' : 'Cur').padStart(pd[2])),
    chalk.black.bgGreen('Wanted'.padStart(pd[3])),
    chalk.black.bgMagenta('Latest'.padStart(pd[4]))
  );
  pack.forEach((p, i) => {
    const nk = ` ${p.name.padEnd(pd[0])} `;
    let sn = '';  // sign
    if (p.outd) {
      const df = semver.diff(p.outd.current || p.outd.wanted, p.outd.latest) || '';
      const svsn = df && SEMVERSIGN.get(df);
      sn = svsn || df;
      if (p.dep !== dirBase)
        sn += ' ' + chalk.blueBright(p.dep);
    }
    console.log(
      logNumbering(i),
      p.name.includes('@')
      ? chalk.redBright(nk) + SEP + chalk.blue(p.ver.padStart(pd[1]))
      : chalk.yellow(nk)    + SEP + chalk.cyan(p.ver.padStart(pd[1])),
      p.outd
      ? chalk.white(         (p.outd.current||'-').padStart(pd[2]) ) + ' ' +
        chalk.greenBright(   (p.outd.wanted ||' ').padStart(pd[3]) ) + ' ' +
        chalk.magentaBright( (p.outd.latest ||' ').padStart(pd[4]) ) + ' ' + sn
      : '✨'
    );
  });
}

/**
 * assumption that packVers was already built by reading package.json
 * depent name from 'npm outdated' is the current folder name
 */
if (vmode !== 'xoutdated') {
  // --------------------------------------------------------------------------------
  // takes time to run the external command
  exec('npm outdated --json', (error, stdout) => {  // stderr)
  // --------------------------------------------------------------------------------
    if (stdout) {
      // console.log(stdout);
      const pd = Array(5).fill(MIN_PAD_VER, 1);  // minimum padding
      pd[0]=0;  // minimum padding for package name
      const json: TOutdatedResult[] = JSON.parse(stdout);
      Object.entries(json).forEach(([key, val]) => {
        const { current, wanted, latest } = val;
        if (current?.length > pd[2]) pd[2] = current.length;
        if (wanted?.length  > pd[3]) pd[3] = wanted.length;
        if (latest?.length  > pd[4]) pd[4] = latest.length;
        if (val.dependent === dirBase) {
          const fo = packVers.find(x => x.name === key);
          if (fo) {
            fo.outd = { current, wanted, latest };
          } else {
            console.error(key, "not found!");
          }
        } else {  // dependent is another workspace
          packVers.push({
            dep: val.dependent,
            name: key,
            dev: false,
            ver: '',
            outd: { current, wanted, latest }
          });
        }
      });
      packVers.forEach(p => {
        if (p.name.length > pd[0])
          pd[0] = p.name.length;
        if (p.ver.length > pd[1])
          pd[1] = p.ver.length;
      });
      // partition array into prod dependencies and devDependencies
      const [pro, dev] = packVers.reduce<[TPackages[], TPackages[]]>(([pro, dev], k) =>
        (k.dev ? [pro, [...dev, k]] : [[...pro, k], dev]), [[], []]);
      logPackVers(pro, pd);
      logPackVers(dev, pd);
    }
    if (!error) {
      console.log(packVers.length ? '✨No outdated modules!' : "⚠️  No dependencies.");
    }
  });
}
