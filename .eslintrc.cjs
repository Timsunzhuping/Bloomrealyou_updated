/** Root ESLint config for the monorepo. Apps/packages extend their own configs. */
module.exports = {
  root: true,
  ignorePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/.next/**',
    '**/.turbo/**',
    '**/build/**',
    '**/coverage/**',
    '**/generated/**',
    'pnpm-lock.yaml',
  ],
  extends: [require.resolve('@custom-merch/config/eslint/base')],
};
