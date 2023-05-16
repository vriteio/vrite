import MiniSearch from "minisearch";
import { createSignal } from "solid-js";
import { monaco } from "#lib/code-editor";

const [searchEngine, setSearchEngine] = createSignal<MiniSearch | null>(null);
const languageIds = monaco.languages
  .getLanguages()
  .filter((language) => {
    return !language.id.includes(".");
  })
  .map((language) => {
    return { id: language.id };
  });
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
    engine.addAll(languageIds);
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
