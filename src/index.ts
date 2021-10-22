#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';

import generate from './commands/generate';

program.version(`${chalk.yellow('Flatlogic Apps CLI')} ${require('../package.json').version}`);

program.addCommand(generate);

program.parse(process.argv);
