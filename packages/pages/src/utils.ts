import type { AstroGlobal } from "astro";
import type { ContentSource } from "vrite:pages";

// eslint-disable-next-line no-use-before-define
type JSONValue = string | number | boolean | JSONObject | JSONArray;

interface JSONObject {
  [x: string]: JSONValue;
}

interface JSONArray extends Array<JSONValue> {}

type PagesConfig<T extends JSONObject> = T | ((Astro: AstroGlobal) => T);

interface SourceContext<T extends JSONObject> {
  Astro: AstroGlobal;
  sourceConfig: T;
  config: JSONObject;
}
type CreateSource<T extends JSONObject> = (
  ctx: SourceContext<T>
) => Omit<ContentSource, "name" | "config">;
type ConfigureSource<T extends JSONObject> = (
  config: PagesConfig<T>
) => (Astro: AstroGlobal, config: PagesConfig<JSONObject>) => ContentSource;

const createContentSource = <T extends JSONObject>(
  name: string,
  creator: CreateSource<T>
): ConfigureSource<T> => {
  return (sourceConfig) => {
    return (Astro, config) => {
      const resolvedConfig = typeof config === "function" ? config(Astro) : config;
      const resolvedSourceConfig =
        typeof sourceConfig === "function" ? sourceConfig(Astro) : sourceConfig;

      return {
        name,
        config: resolvedSourceConfig,
        ...creator({
          Astro,
          sourceConfig: resolvedSourceConfig,
          config: resolvedConfig
        })
      };
    };
  };
};

export { createContentSource };
