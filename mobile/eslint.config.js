const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*'] },
  // Apostrophes in <Text> are fine in React Native; the rule exists for HTML.
  { rules: { 'react/no-unescaped-entities': 'off' } },
]);
