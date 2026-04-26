module.exports = {
  root: true,
  extends: [require.resolve('@custom-merch/config/eslint/next')],
  parserOptions: {
    tsconfigRootDir: __dirname,
  },
  settings: {
    next: { rootDir: __dirname },
  },
};
