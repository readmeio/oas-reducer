/* eslint-disable import/no-dynamic-require,global-require
 */
const inquirer = require('inquirer');

const question = [
  {
    type: 'input',
    name: 'spec',
    message: 'Enter the path to your spec file:',
    default: '/Users/rafegoldberg/Downloads/petstore.json',
    filter: pathToSpec => require(pathToSpec),
  },
  {
    type: 'select',
    name: 'reduceBy',
    message: 'Would you like to reduce by paths or tags',
    default: 'tags',
    choices: [
      { name: 'paths', message: 'Paths', value: 'paths' },
      { name: 'tags', message: 'Tags', value: 'tags' },
    ],
  },
  {
    type: 'checkbox',
    name: 'paths',
    message: 'Choose which paths to reduce by:',
    multiple: true,
    default: [],
    when: answers => answers.reduceBy === 'paths',
    choices: answers => {
      const spec = answers.spec;
      return Object.keys(spec.paths);
    },
    filter: (paths, answers) => {
      const spec = answers.spec;
      const each = paths.map(path => Object.keys(spec.paths[path])).flat();
      return [...new Set(each)].reduce((acc, p) => {
        acc[p] = each;
        return acc;
      }, {});
    },
  },
];

inquirer.prompt(question).then((answers, ...rest) => {
  answers.spec = '{ SPEC HIDDEN FOR BREVITY }';
  console.log(JSON.stringify({ answers, rest }, null, 2));
});
