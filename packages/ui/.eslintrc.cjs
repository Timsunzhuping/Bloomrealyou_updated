module.exports = {
  root: true,
  extends: [require.resolve('@custom-merch/config/eslint/react')],
  parserOptions: {
    tsconfigRootDir: __dirname,
  },
};
