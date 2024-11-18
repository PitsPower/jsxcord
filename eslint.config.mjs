import antfu from '@antfu/eslint-config'

export default antfu({
  rules: {
    'antfu/consistent-chaining': 'off', // I think this rule is broken?
    'node/prefer-global/process': 'off',
  },
  typescript: { tsconfigPath: './tsconfig.json' },
})