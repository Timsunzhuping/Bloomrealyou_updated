module.exports = {
  root: true,
  extends: [require.resolve('@custom-merch/config/eslint/nest')],
  parserOptions: {
    tsconfigRootDir: __dirname,
  },
};
