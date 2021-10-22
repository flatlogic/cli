#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import updateNotifier from 'update-notifier';

import generate from './commands/generate';

const pkg = require('../package.json');

program.version(`${chalk.yellow('Flatlogic Apps CLI')} ${pkg.version}`);

program.addCommand(generate);

updateNotifier({
    pkg,
    updateCheckInterval: 1000 * 60 * 60 * 24, // 1 day
}).notify();

program.parse(process.argv);
