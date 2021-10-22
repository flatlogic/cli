import { createCommand } from 'commander';
import * as inquirer from 'inquirer';
import chalk from 'chalk';
import got from 'got';

import stream from 'stream/promises';
import fs, { rm } from 'fs/promises';
import path from 'path';
import { createWriteStream } from 'fs';
import os from 'os';
import extract from 'extract-zip';

const TEMP_FILE = path.join(os.tmpdir(), 'flatlogic.zip');

/**
 * Database presets
 */
const PRESETS: { [key: string]: Entity[] } = {
    blank: [{
        'name': 'users',
        'show_field': 'firstName',
        'fields': [{
            'name': 'firstName',
            'type': 'string',
            'show_in_form': true,
            'show_in_table': true,
            'editable': false,
            'title': 'First Name',
        }, {
            'name': 'lastName',
            'type': 'string',
            'show_in_form': true,
            'show_in_table': true,
            'editable': false,
            'title': 'Last Name',
        }, {
            'name': 'phoneNumber',
            'type': 'string',
            'show_in_form': true,
            'show_in_table': true,
            'editable': false,
            'title': 'Phone Number',
        }, {
            'name': 'email',
            'type': 'string',
            'show_in_form': true,
            'show_in_table': true,
            'editable': false,
            'title': 'E-mail',
        }, {
            'name': 'role',
            'type': 'enum',
            'options': ['admin', 'user'],
            'widget': 'radio',
            'show_in_form': true,
            'show_in_table': true,
            'editable': false,
            'title': 'Role',
        }, {
            'name': 'disabled',
            'type': 'boolean',
            'show_in_form': true,
            'show_in_table': true,
            'editable': false,
            'title': 'Disabled',
        }, {
            'name': 'avatar',
            'type': 'images',
            'show_in_form': true,
            'show_in_table': true,
            'editable': false,
            'title': 'Avatar',
        }, {
            'name': 'password',
            'type': 'string',
            'editable': false,
            'title': 'Password',
            show_in_form: false,
            show_in_table: false,
        }, {
            'name': 'emailVerified',
            'type': 'boolean',
            'editable': false,
            'title': 'emailVerified',
            show_in_form: false,
            show_in_table: false,
        }, {
            'name': 'emailVerificationToken',
            'type': 'string',
            'editable': false,
            'title': 'emailVerificationToken',
            show_in_form: false,
            show_in_table: false,
        }, {
            'name': 'emailVerificationTokenExpiresAt',
            'type': 'datetime',
            'editable': false,
            'title': 'emailVerificationTokenExpiresAt',
            show_in_form: false,
            show_in_table: false,
        }, {
            'name': 'passwordResetToken',
            'type': 'string',
            'editable': false,
            'title': 'passwordResetToken',
            show_in_form: false,
            show_in_table: false,
        }, {
            'name': 'passwordResetTokenExpiresAt',
            'type': 'datetime',
            'editable': false,
            'title': 'passwordResetTokenExpiresAt',
            show_in_form: false,
            show_in_table: false,
        }, {
            'name': 'provider',
            'type': 'string',
            'editable': false,
            'title': 'provider',
            show_in_form: false,
            show_in_table: false,
        }],
    }],
};

interface GenericField {
    name: string,
    title: string,
    show_in_form: boolean,
    show_in_table: boolean,
    editable: boolean,
}

interface StringField extends GenericField {
    type: 'string',
}

interface DateTimeField extends GenericField {
    type: 'datetime',
}

interface BooleanField extends GenericField {
    type: 'boolean',
}

interface ImagesField extends GenericField {
    type: 'images',
}

interface EnumField extends GenericField {
    type: 'enum',
    options: string[],
    widget: 'radio',
}

type Field = EnumField
    | ImagesField
    | BooleanField
    | StringField
    | DateTimeField;

interface Entity {
    name: string,
    show_field: string,
    fields: Field[],
}

interface Application {
    title: string,
    frontend: string,
    backend: string,
    db: string,
    design: string,
    entities: Entity[],
}

type ApplicationProps = Omit<Application, 'title'>;

function validateOption(arg: any, option: string): string {
    if (!arg[option]) {
        console.error(chalk.red(`error: option '--${option}' is required`));
        process.exit(1);
    }

    return arg[option] as string;
}

function cliMode(options: any): ApplicationProps {
    return {
        frontend: validateOption(options, 'frontend'),
        backend: validateOption(options, 'backend'),
        db: validateOption(options, 'db'),
        design: validateOption(options, 'design'),
        entities: PRESETS.blank,
    };
}

async function interactiveMode(): Promise<ApplicationProps> {
    const props = await inquirer.prompt([{
        name: 'frontend',
        type: 'list',
        message: 'Frontend framework',
        choices: [
            { name: 'React', value: 'react' },
        ],
    }, {
        name: 'backend',
        type: 'list',
        message: 'Select backend stack',
        choices: [
            { name: 'NodeJS', value: 'nodejs' },
        ],
    }, {
        name: 'db',
        type: 'list',
        message: 'Select database engine',
        choices: [
            { name: 'PostgreSQL', value: 'postgresql' },
        ],
    }, {
        name: 'design',
        type: 'list',
        message: 'Choose design',
        choices: [
            { name: 'Classic', value: 'classic' },
        ],
    }, {
        name: 'schemaPreset',
        type: 'list',
        choices: [
            { name: 'Blank', value: 'blank' },
        ],
    }]);

    return {
        ...props,
        entities: PRESETS[props.schemaPreset],
    };
}

async function pathExists(path: string) {
    try {
        const stat = await fs.stat(path);
        if (stat.isDirectory() || stat.isFile()) {
            return true;
        }
    } catch (e) {
        return false;
    }
}

export default createCommand('generate')
    .argument('name', 'Project name')
    .option('--frontend <frontend>', 'Frontend framework')
    .option('--backend <backend>', 'Backend framework')
    .option('--db <db>', 'Database type')
    .option('--design <design>', 'Application design')
    .action(async (name, options) => {
        const projectPath = path.join(process.cwd(), name);
        if (await pathExists(projectPath)) {
            console.error(chalk.red(`error: folder ${projectPath} already exists`));
            process.exit(1);
        }

        const hasArguments = Object.keys(options).length !== 0;

        const props = hasArguments ? cliMode(options) : await interactiveMode();
        const app: Application = {
            title: name,
            ...props,
        };

        await fs.mkdir(projectPath);
        await stream.pipeline(
            got.stream('https://flatlogic.com/projects/cli', {
                method: 'POST',
                json: {
                    schema: app,
                },
            }),
            createWriteStream(TEMP_FILE),
        );
        await extract(TEMP_FILE, { dir: projectPath });
        await rm(TEMP_FILE);
        await fs.writeFile(path.join(projectPath, '.flatlogicrc'), JSON.stringify(app, null, 2));
    });
