/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
interface ImportMetaEnv {
  readonly PUBLIC_VRITE_SEARCH_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
