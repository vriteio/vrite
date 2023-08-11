import { format } from "prettier/standalone";
import type { Options, Plugin } from "prettier";

const languageParserMap = {
  javascript: "babel",
  typescript: "babel-ts",
  json: "yaml",
  graphql: "graphql",
  html: "html",
  vue: "vue",
  markdown: "markdown",
  yaml: "yaml",
  css: "css",
  less: "less",
  scss: "scss"
} as const;

type SupportedLanguages = keyof typeof languageParserMap;

const isFormattable = (language: string): boolean => {
  return Boolean(languageParserMap[language as SupportedLanguages]);
};
const loadParserPlugin = async (language: string): Promise<Plugin | null> => {
  switch (language as SupportedLanguages) {
    case "javascript":
    case "typescript":
      return import("prettier/plugins/babel");
    case "graphql":
      return import("prettier/plugins/graphql");
    case "html":
    case "vue":
      return import("prettier/plugins/html");
    case "markdown":
      return import("prettier/plugins/markdown");
    case "yaml":
    case "json":
      return import("prettier/plugins/yaml");
    case "css":
    case "less":
    case "scss":
      return import("prettier/plugins/postcss");
    default:
      return null;
  }
};
const formatCode = async (code: string, language: string, options?: Options): Promise<string> => {
  const parser = languageParserMap[language as SupportedLanguages];
  const parserPlugin = await loadParserPlugin(language);

  if (parser && parserPlugin) {
    return format(code, {
      ...(options || {}),
      parser,
      plugins: [parserPlugin],
      ...(language === "json" && {
        trailingComma: "none",
        singleQuote: false
      })
    });
  }

  return code;
};

export { formatCode, isFormattable };
