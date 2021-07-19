const { prompt, MultiSelect } = require('enquirer');
const inquirer = require('inquirer');
const jsonpath = require('jsonpath');

const question = [
  {
    type: 'input',
    name: 'spec',
    message: 'Enter the path to your spec file:',
    default: '/Users/emilykuo/Downloads/huge-oas.json',
    result: pathToSpec => {
      // TODO: pass this to other questions
      return require(pathToSpec);
    },
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
    type: 'autocomplete',
    name: 'paths',
    message: 'Choose which paths to reduce by:',
    multiple: true,
    default: [],
    skip() {
      console.log('reduceBy', this.state.answers.reduceBy)
      return this.state.answers.reduceBy !== 'paths';
    },
    choices() {
      const spec = this.state.answers.spec;
      // console.log('spec.paths', spec.paths)
      return Object.keys(spec.paths);
    },
    result(paths) {
      // do something with the paths
      const spec = this.state.answers.spec;
      return paths.map(path => spec.paths[path]);
    },
  },
];

inquirer.prompt(question).then(args => console.log(args));