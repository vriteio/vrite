module.exports = {
  plugins: [require.resolve("prettier-plugin-astro")],
  printWidth: 100,
  useTabs: false,
  arrowParens: "always",
  quoteProps: "consistent",
  endOfLine: "lf",
  trailingComma: "none",
  embeddedLanguageFormatting: "off",
  overrides: [
    {
      files: ["*.mdx"],
      options: { embeddedLanguageFormatting: "auto" }
    },
    {
      files: "*.astro",
      options: {
        parser: "astro"
      }
    }
  ]
};
