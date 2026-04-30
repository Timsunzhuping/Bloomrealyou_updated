module.exports = {
  root: true,
  extends: [require.resolve('@custom-merch/config/eslint/base')],
  parserOptions: {
    tsconfigRootDir: __dirname,
  },
};
