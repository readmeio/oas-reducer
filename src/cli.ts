import fs from 'fs';

import chalk from 'chalk';
import inquirer from 'inquirer';
import inquirerFuzzyPath from 'inquirer-fuzzy-path';
import jsonpath from 'jsonpath';
import OASNormalize from 'oas-normalize';
import { version as getAPIDefinitionVersion } from 'oas-normalize/dist/lib/utils';

import pkg from '../package.json';

import oasReducer from '.';

const args = process.argv.slice(2);

if (args.includes('--version')) {
  console.log(pkg.version);
  process.exit();
} else if (args.includes('--help')) {
  console.log('Usage: oas-reducer <file>');
  console.log('');
  process.exit();
}

inquirer.registerPrompt('fuzzypath', inquirerFuzzyPath);

inquirer
  .prompt([
    {
      type: 'fuzzypath',
      name: 'filePath',
      excludePath: (nodePath: string) => nodePath.startsWith('node_modules') || nodePath.startsWith('.git/'),
      excludeFilter: (nodePath: string) => nodePath === '.',
      when: answers => {
        // If the user is supplying a path to the CLI, prefill this answer out because Inquirer's
        // `default` doesn't get processed if `when` is set to skip a question.
        if (args.length) {
          // eslint-disable-next-line no-param-reassign
          answers.filePath = args.shift();
          return false;
        }

        return true;
      },
      itemType: 'file',
      message: 'Enter the path to an API definition to reduce:',
      suggestOnly: false,
      depthLimit: 5,
    },
  ])
  .then(({ filePath }) => new OASNormalize(filePath, { enablePaths: true }).load())
  .then(apiDefinition => {
    const baseVersion = parseInt(getAPIDefinitionVersion(apiDefinition), 10);
    if (baseVersion !== 3) {
      throw new Error('Sorry, OpenAPI v3.x definitions are supported.');
    }

    return apiDefinition;
  })
  .then(apiDefinition => {
    return inquirer
      .prompt([
        {
          type: 'list',
          name: 'reduceBy',
          message: 'Would you like to reduce by paths or tags?',
          default: 'tags',
          choices: [
            { name: 'tags', message: 'Tags', value: 'tags' },
            { name: 'paths', message: 'Paths', value: 'paths' },
          ],
        },
        {
          type: 'checkbox',
          name: 'tags',
          message: 'Choose which tags to reduce by:',
          when: answers => answers.reduceBy === 'tags',
          choices: () => {
            const tags = jsonpath.query(apiDefinition, '$..paths..tags').flat();
            return [...new Set(tags)];
          },
        },
        {
          type: 'checkbox',
          name: 'paths',
          message: 'Choose which paths to reduce by:',
          default: [],
          when: answers => answers.reduceBy === 'paths',
          choices: () => {
            return Object.keys(apiDefinition.paths);
          },
        },
        {
          type: 'checkbox',
          name: 'methods',
          message: 'Choose which available methods to reduce by:',
          default: [],
          when: answers => answers.reduceBy === 'paths',
          choices: answers => {
            const paths = answers.paths;
            let methods = paths
              .map((path: string) => Object.keys(apiDefinition.paths[path]))
              .flat()
              .filter((method: string) => method.toLowerCase() !== 'parameters');

            methods = [...new Set(methods)];
            methods.sort();

            methods = methods.map((method: string) => ({
              name: method.toUpperCase(),
              value: method,
            }));

            methods.push(new inquirer.Separator());
            methods.push({ name: 'All', value: '*' });

            return methods;
          },
          filter: methods => (methods.includes('*') || !methods.length ? '*' : methods),
        },
        {
          type: 'input',
          name: 'ouputPath',
          message: 'Enter the path to save your reduced API definition to:',
          validate: value => {
            if (value.length) {
              if (!fs.existsSync(value)) {
                return true;
              }

              return 'Specified output path already exists.';
            }

            return 'An output path must be supplied.';
          },
        },
      ])
      .then(answers => {
        const tags = answers.tags || [];
        const methods = answers.methods || '*';
        const paths = (answers.paths || []).reduce((acc: Record<string, string[] | '*'>, p: string) => {
          acc[p] = methods;
          return acc;
        }, {});

        const reduction = oasReducer(apiDefinition, { tags, paths });
        fs.writeFileSync(answers.ouputPath, JSON.stringify(reduction, null, 2));

        console.log('');
        console.log(`API definition has been reduced to ${chalk.cyan(answers.ouputPath)}! 🏅`);
      });
  })
  .catch(err => {
    console.error(chalk.red(err.message));
  });
