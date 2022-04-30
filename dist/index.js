#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
const chalk_1 = __importDefault(require("chalk"));
// const chalk = require('chalk');
const SEP = chalk_1.default.gray(': '); // separator between key and value
const BULLET = '▫️ ';
;
const PACKAGE = './package.json';
const DOTENV = './.env';
let vmode = 'all';
const [, , ...args] = process.argv;
if (args[0]) {
    const { name, version, description } = require('../package.json');
    const option = (args[0][0] === '-') // allow up to two '-' for the option prefix
        ? (args[0][1] === '-')
            ? args[0][2]
            : args[0][1]
        : args[0][0];
    switch (option.toUpperCase()) {
        case 'E':
            vmode = 'dotenv';
            break;
        case 'S':
            vmode = 'scripts';
            break;
        case 'V':
            console.log(version);
            // console.log(process.env.npm_package_version);
            process.exit(0);
        default:
            console.log(chalk_1.default.yellowBright(name), chalk_1.default.greenBright('v' + version), description);
            console.log(chalk_1.default.yellow("OPTIONS:"), `\n`, chalk_1.default.green('-v, v'), SEP, "version", '\n', chalk_1.default.green('-e, e'), SEP, ".env only", '\n', chalk_1.default.green('-s, s'), SEP, "scripts (in package.json) only");
            process.exit(0);
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
    Object.keys(obj).forEach((key) => {
        if (key.length > len)
            len = key.length;
    });
    return len;
};
// log filename
const logFilename = (name) => console.log(chalk_1.default.white.bgGray(` ${name}`.padEnd(80)));
const logField = (field) => console.log(chalk_1.default.black.bgCyan(` ◀︎ ${field} ▶︎ `));
const logNumbering = (n) => chalk_1.default.gray(`${(n + 1).toString().padStart(3)}`);
// iterate object
const logKeyValueObj = (obj, key) => {
    const o = obj[key];
    if ((typeof (o) !== 'object') || Array.isArray(o))
        return;
    const isScript = key === 'scripts';
    if (vmode === 'scripts' && !isScript)
        return;
    const pad = maxKeyLen(o);
    logField(key);
    Object.keys(o).forEach((k, i) => {
        const pk = ` ${k.padEnd(pad)} `; // padded key
        console.log(logNumbering(i), isScript
            ? SCRIPT_HL.includes(k)
                ? chalk_1.default.black.bgYellow(pk) + SEP + chalk_1.default.yellow(o[k])
                : chalk_1.default.yellow(pk) + SEP + chalk_1.default.white(o[k])
            : (k.includes('@'))
                ? chalk_1.default.redBright(pk) + SEP + chalk_1.default.blue(o[k])
                : chalk_1.default.yellow(pk) + SEP + chalk_1.default.cyan(o[k]));
    });
};
const logKeyValue = (obj, key) => {
    const o = obj[key];
    if ((typeof (o) !== 'object') || Array.isArray(o))
        console.log(BULLET, chalk_1.default.cyanBright(key), ':', o);
};
try {
    fs_1.default.access(DOTENV, fs_1.default.constants.F_OK, (err) => {
        if (err) {
            // console.log("No .env");
            return;
        }
        logFilename('.env');
        const env = dotenv_1.default.parse(fs_1.default.readFileSync(DOTENV, 'utf8'));
        const pad = maxKeyLen(env);
        Object.keys(env).forEach((key, i) => {
            console.log(logNumbering(i), key.padEnd(pad), chalk_1.default.gray(':'), chalk_1.default.greenBright(env[key]));
        });
    });
}
catch (err) {
    console.error(err);
}
if (vmode !== 'dotenv') {
    try {
        fs_1.default.access(PACKAGE, fs_1.default.constants.F_OK, (err) => {
            if (err) { // file not found
                console.log("⛔️ No", chalk_1.default.red(PACKAGE));
                return;
            }
            const json = JSON.parse(fs_1.default.readFileSync(PACKAGE, 'utf8'));
            console.log(chalk_1.default.white.bgGray(` package.json  `) +
                chalk_1.default.black.bgWhite(` ${json.name} `) +
                chalk_1.default.black.bgGreen(` ${json.version || 'no version'} `) +
                chalk_1.default.green.bgBlack(` ${json.description || ''} `));
            // if ((typeof (o) !== 'object') || Array.isArray(o))
            if (vmode !== 'scripts')
                Object.keys(json).forEach(key => logKeyValue(json, key));
            Object.keys(json).forEach(key => logKeyValueObj(json, key));
        });
    }
    catch (err) {
        console.error(err);
    }
}
