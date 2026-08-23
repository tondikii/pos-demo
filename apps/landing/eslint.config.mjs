import astro from 'eslint-plugin-astro'

export default [
  { ignores: ['dist/**', 'node_modules/**', '.astro/**'] },
  ...astro.configs.recommended,
]