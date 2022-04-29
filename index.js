"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
/*=============================================================================
 pkviz - package.json visualizer

 (C) 2022 SpacetimeQ INC
=============================================================================*/
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
const chalk_1 = __importDefault(require("chalk"));
// const chalk = require('chalk');
const PACKAGE = './package.json';
const DOTENV = './.env';
const args = process.argv.slice(2);
// arg: a | A - all
const PKG_KEYS = ['scripts'];
if (((_a = args[0]) === null || _a === void 0 ? void 0 : _a.toUpperCase()) === 'A') {
    PKG_KEYS.push('dependencies', 'devDependencies', 'engines');
}
const SCRIPT_HL = [
    'start',
    'serve',
    'build',
];
// log filename
const logFilename = (name) => console.log(chalk_1.default.white.bgGray(` ${name}`.padEnd(80)));
// iterate object
const logObj = (obj, key) => {
    console.log(chalk_1.default.black.bgCyan(` ◀︎ ${key} ▶︎ `));
    const o = obj[key];
    const colorWhite = (key === PKG_KEYS[0]);
    Object.keys(o).forEach((k, i) => {
        console.log(chalk_1.default.gray(`${(i + 1).toString().padStart(3, ' ')}`), colorWhite
            ? (SCRIPT_HL.includes(k)
                ? chalk_1.default.black.bgYellow(` ${k} `)
                : chalk_1.default.yellow(` ${k} `))
                + ': ' + chalk_1.default.white(o[k])
            : (k.includes('@'))
                ? chalk_1.default.redBright.underline(k) + ' ' + chalk_1.default.blue(o[k])
                : chalk_1.default.yellow(k) + ' ' + chalk_1.default.cyan(o[k]));
    });
};
try {
    fs_1.default.access(DOTENV, fs_1.default.constants.F_OK, (err) => {
        if (err) {
            // console.log("No .env");
            return;
        }
        logFilename('.env');
        const env = dotenv_1.default.parse(fs_1.default.readFileSync(DOTENV, 'utf8'));
        let pad = 0; // pad should be the length of the longest key + 1
        Object.keys(env).forEach((key) => {
            if (key.length > pad)
                pad = key.length + 1;
        });
        Object.keys(env).forEach((key) => {
            console.log(chalk_1.default.redBright(` ${key.padEnd(pad)} `), chalk_1.default.greenBright(env[key]));
        });
    });
}
catch (err) {
    console.error(err);
}
try {
    fs_1.default.access(PACKAGE, fs_1.default.constants.F_OK, (err) => {
        if (err) { // file not found
            console.log("No", chalk_1.default.red(PACKAGE));
            return;
        }
        const json = JSON.parse(fs_1.default.readFileSync(PACKAGE, 'utf8'));
        console.log(chalk_1.default.white.bgGray(` package.json  `) +
            chalk_1.default.black.bgWhite(` ${json.name} `) +
            chalk_1.default.black.bgGreen(` ${json.version || 'no version'} `) +
            chalk_1.default.green.bgBlack(` ${json.description || ''} `));
        Object.keys(json).forEach(key => {
            if (PKG_KEYS.includes(key))
                logObj(json, key);
        });
    });
}
catch (err) {
    console.error(err);
}
