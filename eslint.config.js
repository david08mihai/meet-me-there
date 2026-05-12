const expoConfig = require('eslint-config-expo/flat');
const reactPlugin = require('eslint-config-expo/node_modules/eslint-plugin-react');
const prettierConfig = require('eslint-config-prettier');

const disabledReactRules = Object.fromEntries(
  Object.keys(reactPlugin.configs.recommended.rules).map((rule) => [rule, 'off']),
);

module.exports = [
  ...expoConfig,
  prettierConfig,
  {
    rules: {
      ...disabledReactRules,
      'react/no-this-in-sfc': 'off',
      'react/no-unknown-property': 'off',
    },
  },
  {
    ignores: ['node_modules/', 'dist/', '.expo/', '.eslintrc.js'],
  },
];
