import { format } from "prettier/standalone";
import type { Options, Plugin } from "prettier";

const languageParserMap = {
  javascript: "babel",
  typescript: "babel-ts",
  json: "json-stringify",
  graphql: "graphql",
  html: "html",
  vue: "vue",
  markdown: "markdown",
  yaml: "yaml",
  css: "css",
  less: "less",
  scss: "scss",
  mdx: "mdx"
} as const;

type SupportedLanguages = keyof typeof languageParserMap;

const isFormattable = (language: string): boolean => {
  return Boolean(languageParserMap[language as SupportedLanguages]);
};
const loadParserPlugins = async (language: string): Promise<Plugin[] | null> => {
  switch (language as SupportedLanguages) {
    case "javascript":
    case "typescript":
    case "json":
      return [
        await import("prettier/plugins/babel"),
        (await import("prettier/plugins/estree")) as Plugin
      ];
    case "graphql":
      return [await import("prettier/plugins/graphql")];
    case "html":
    case "vue":
      return [await import("prettier/plugins/html")];
    case "markdown":
    case "mdx":
      return [await import("prettier/plugins/markdown")];
    case "yaml":
      return [await import("prettier/plugins/yaml")];
    case "css":
    case "less":
    case "scss":
      return [await import("prettier/plugins/postcss")];
    default:
      return null;
  }
};
const formatCode = async (code: string, language: string, options?: Options): Promise<string> => {
  const parser = languageParserMap[language as SupportedLanguages];
  const parserPlugins = await loadParserPlugins(language);

  if (parser && parserPlugins) {
    return format(code, {
      ...(options || {}),
      parser,
      plugins: parserPlugins
    });
  }

  return code;
};

export { formatCode, isFormattable };
