import MiniSearch from "minisearch";
import { createSignal } from "solid-js";
import type { monaco } from "#lib/monaco";

const [searchEngine, setSearchEngine] = createSignal<MiniSearch | null>(null);
const getLanguageIds = (
  languages: monaco.languages.ILanguageExtensionPoint[]
): Array<{ id: string }> => {
  return languages
    .filter((language) => {
      return !language.id.includes(".");
    })
    .map((language) => {
      return { id: language.id };
    });
};
const useSuggestLanguage = (): ((query: string) => string[]) => {
  const engine =
    searchEngine() ||
    new MiniSearch({
      fields: ["id"],
      searchOptions: {
        prefix: true
      }
    });

  if (!searchEngine()) {
    import("#lib/monaco").then(({ monaco }) => {
      const languageIds = getLanguageIds(monaco.languages.getLanguages());

      engine.addAll(languageIds);
    });
    setSearchEngine(engine);
  }

  return (query: string) => {
    const suggestions = engine.autoSuggest(query, { prefix: true });

    return suggestions
      .filter((v) => v)
      .map(({ suggestion }) => {
        return suggestion;
      });
  };
};

export { useSuggestLanguage };
