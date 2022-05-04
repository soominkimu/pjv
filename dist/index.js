#!/ur/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*=============================================================================
 viz - visualization tool for developers
   - an alternative of cat and bat tools providing formatted view of config files:
     .env: aligned table
     package.json: especially the "scripts" field

 - Installation
 $ yarn global add viz

 - Option arguments
   s - print scripts only in package.json and .env

 https://docs.npmjs.com/cli/v7/configuring-npm/package-json

 TODO: When the element of array is an object, formatting is required. [object Object]
 - test case: ~/.config/yarn/global/node_modules/yaml/

 (C) 2022 SpacetimeQ INC
=============================================================================*/
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
const chalk_1 = __importDefault(require("chalk")); // for TypeScript use version ^4
const semver_1 = __importDefault(require("semver"));
const child_process_1 = require("child_process");
const SEP = chalk_1.default.gray(': '); // separator between key and value
const SEP0 = chalk_1.default.gray(':');
const BULLET = '▫️ ';
const MIN_PAD_VER = 6; // minimum padding for version strings
const SEMVERSIGN = new Map([
    ['major', '❌'],
    ['minor', '✅'],
    ['patch', '✔️'],
]);
;
;
;
const packVers = [];
const isObject = (o) => (typeof (o) === 'object') && !Array.isArray(o); // array also is an 'object'
let rootPath = './';
const PACKAGE = 'package.json';
const DOTENV = '.env';
const HELP = [
    ['v', "version", "package version"],
    ['e', "env", ".env only"],
    ['s', "scripts", "scripts (in package.json) only"],
    ['o', "outdated", "check npm outdated packages (takes time)"],
    ['h', "help", "help"],
];
const [, , ...args] = process.argv;
let vmode = 'all';
if (args[0]) {
    const arg = args[0];
    const { name, version, description } = require('../' + PACKAGE); // own package
    const option = (arg[0] === '-') // allow up to two '-' for the option prefix
        ? (arg[1] === '-')
            ? arg.substring(2) // long
            : arg[1] // short
        : '';
    if (option) {
        switch (option.toUpperCase()) {
            case 'E':
                vmode = 'dotenv';
                break;
            case 'S':
                vmode = 'scripts';
                break;
            case 'O':
                vmode = 'outdated';
                break;
            case 'V':
                console.log(version);
                // console.log(process.env.npm_package_version);
                process.exit(0);
            default:
                console.log(chalk_1.default.yellowBright(name), chalk_1.default.greenBright('v' + version), description, '-', chalk_1.default.yellowBright('node'), chalk_1.default.greenBright(process.version));
                console.log(chalk_1.default.yellow("OPTIONS:"));
                let pad = 7; // set the longest length in HELP's long option
                HELP.forEach(arr => {
                    if (arr[1].length > pad)
                        pad = arr[1].length;
                });
                HELP.forEach(arr => console.log(' ', chalk_1.default.green('-' + arr[0]) + ', ' +
                    chalk_1.default.green('--' + arr[1].padEnd(pad)), arr[2]));
                process.exit(0);
        }
    }
    else {
        rootPath = arg; // TODO: REGEX check required
        if (rootPath[rootPath.length - 1] !== '/')
            rootPath += '/';
    }
}
// arg: a | A - all
const SCRIPT_HL = [
    'start',
    'serve',
    'build',
];
// pad should be the length of the longest key + 1
const maxKeyLen = (obj) => {
    let len = 0;
    (Array.isArray(obj) ? obj : Object.keys(obj)).forEach((key) => {
        if (key.length > len)
            len = key.length;
    });
    return len;
};
// log filename
const logFilename = (name) => console.log(chalk_1.default.white.bgGray(` ${name}`.padEnd(80)));
const logField = (field) => console.log(chalk_1.default.black.bgCyan(` ◀︎ ${field} ▶︎ `));
const logNumbering = (n) => chalk_1.default.gray(`${(n + 1).toString().padStart(3)}`);
const logSubObj = (obj, key) => {
    console.log(BULLET, chalk_1.default.cyanBright(key));
    Object.entries(obj).forEach(([kv, vv], iv) => {
        if (isObject(vv)) {
            logSubObj(vv, kv); // recursively call
        }
        else {
            const pk = ` ${kv.padEnd(maxKeyLen(obj))} `;
            console.log(logNumbering(iv), chalk_1.default.yellow(pk) + SEP + chalk_1.default.green(vv));
        }
    });
};
// iterate object
const logKeyValueObj = (obj, key) => {
    const o = obj[key];
    const isScript = key === 'scripts';
    const isDep = key.toLowerCase().includes('dependencies');
    if (!isScript && vmode === 'scripts')
        return;
    if (isDep && vmode === 'outdated') {
        const dev = key === 'devDependencies';
        Object.entries(o).forEach(([name, ver]) => packVers.push({ name, dev, ver: ver }));
        return;
    }
    logField(key);
    Object.entries(o).forEach(([k, val], i) => {
        if (isObject(val)) {
            logSubObj(val, k);
        }
        else {
            const pk = ` ${k.padEnd(maxKeyLen(o))} `; // padded key
            console.log(logNumbering(i), isScript
                ? SCRIPT_HL.includes(k)
                    ? chalk_1.default.black.bgYellow(pk) + SEP + chalk_1.default.yellow(val)
                    : chalk_1.default.yellow(pk) + SEP + chalk_1.default.white(val)
                : (isDep && k.includes('@'))
                    ? chalk_1.default.redBright(pk) + SEP + chalk_1.default.blue(val)
                    : chalk_1.default.yellow(pk) + SEP + chalk_1.default.cyan(val));
        }
    });
};
const logKeyValue = (obj, key, pad) => {
    console.log(BULLET, chalk_1.default.cyanBright(`${key.padEnd(pad)}`), SEP0, obj[key]);
};
try {
    fs_1.default.access(rootPath + DOTENV, fs_1.default.constants.F_OK, (err) => {
        if (err) {
            // console.log("No .env");
            return;
        }
        logFilename('.env');
        const env = dotenv_1.default.parse(fs_1.default.readFileSync(rootPath + DOTENV, 'utf8'));
        const pad = maxKeyLen(env);
        Object.entries(env).forEach(([key, val], i) => {
            console.log(logNumbering(i), key.padEnd(pad) + SEP + chalk_1.default.greenBright(val));
        });
    });
}
catch (err) {
    console.error(err);
}
if (vmode !== 'dotenv') {
    try {
        fs_1.default.access(rootPath + PACKAGE, fs_1.default.constants.F_OK, (err) => {
            if (err) { // file not found
                console.log("⛔️ No", rootPath + PACKAGE);
                process.exit(1);
            }
            const json = JSON.parse(fs_1.default.readFileSync(rootPath + PACKAGE, 'utf8'));
            console.log(chalk_1.default.white.bgGray(` ${PACKAGE}  `) +
                chalk_1.default.black.bgWhite(` ${json.name} `) +
                chalk_1.default.black.bgGreen(` ${json.version || 'no version'} `) +
                chalk_1.default.green.bgBlack(` ${json.description || ''} `));
            // Partition keys array by its content if it is of pure object type or not
            const [ob, no] = Object.keys(json).reduce(([ob, no], k) => (isObject(json[k])
                ? [[...ob, k], no]
                : [ob, [...no, k]]), [[], []]);
            if (vmode !== 'scripts') {
                const pad = maxKeyLen(no);
                no.forEach(key => logKeyValue(json, key, pad));
            }
            ob.forEach(key => logKeyValueObj(json, key));
        });
    }
    catch (err) {
        console.error(err);
    }
}
/**
 * package versions
 * @param pack - package versions object
 * @param pad - package name padding
 * @param dp - package version padding
 * @param dv - outdated versions padding
 */
const logPackVers = (pack, pad, dp, dv) => {
    if (!pack.length)
        return;
    const field = (pack[0].dev ? 'devDependencies' : 'dependencies').padEnd(pad + dp + 2);
    console.log(chalk_1.default.black.bgCyan(` ◀︎ ${field.padEnd(pad + dp + 2)} ▶︎ `), chalk_1.default.black.bgWhite((dv > MIN_PAD_VER ? 'Current' : 'Cur').padStart(dv)), chalk_1.default.black.bgGreen('Wanted'.padStart(dv)), chalk_1.default.black.bgMagenta('Latest'.padStart(dv)));
    pack.forEach((p, i) => {
        var _a;
        const nk = ` ${p.name.padEnd(pad)} `;
        const od = (_a = packVers.find(pk => pk.name === p.name)) === null || _a === void 0 ? void 0 : _a.outd;
        let sn = '';
        if (od) {
            const df = semver_1.default.diff(od.current || od.wanted, od.latest) || '';
            const svsn = df && SEMVERSIGN.get(df);
            sn = svsn || df;
        }
        console.log(logNumbering(i), p.name.includes('@')
            ? chalk_1.default.redBright(nk) + SEP + chalk_1.default.blue(p.ver.padStart(dp))
            : chalk_1.default.yellow(nk) + SEP + chalk_1.default.cyan(p.ver.padStart(dp)), od
            ? chalk_1.default.white((od.current || '-').padStart(dv)) + ' ' +
                chalk_1.default.greenBright((od.wanted || ' ').padStart(dv)) + ' ' +
                chalk_1.default.magentaBright((od.latest || ' ').padStart(dv))
            : '', sn);
    });
};
/**
 * assumption that packVers was already built by reading package.json
 */
if (vmode === 'outdated') {
    // takes time to run the external command
    (0, child_process_1.exec)('npm outdated --json', (error, stdout) => {
        if (stdout) {
            // console.log(stdout);
            let pad = 0; // package name padding
            let dp = MIN_PAD_VER; // minimum padding for version string
            let dv = MIN_PAD_VER; // outdated version padding
            packVers.forEach(p => {
                if (p.name.length > pad)
                    pad = p.name.length;
                if (p.ver.length > dp)
                    dp = p.ver.length;
            });
            const json = JSON.parse(stdout);
            Object.entries(json).forEach(([key, val]) => {
                const { current, wanted, latest } = val;
                const fo = packVers.find(x => x.name === key);
                if (fo) {
                    fo.outd = { current, wanted, latest };
                    if ((current === null || current === void 0 ? void 0 : current.length) > dv)
                        dv = current.length;
                    if ((wanted === null || wanted === void 0 ? void 0 : wanted.length) > dv)
                        dv = wanted.length;
                    if ((latest === null || latest === void 0 ? void 0 : latest.length) > dv)
                        dv = latest.length;
                }
                else {
                    console.error(key, "not found!");
                }
            });
            const [pro, dev] = packVers.reduce(([pro, dev], k) => (k.dev ? [pro, [...dev, k]] : [[...pro, k], dev]), [[], []]);
            logPackVers(pro, pad, dp, dv);
            logPackVers(dev, pad, dp, dv);
        }
        if (!error) {
            console.log(packVers.length ? '✨No outdated modules!' : "⚠️  No dependencies.");
        }
    });
}
