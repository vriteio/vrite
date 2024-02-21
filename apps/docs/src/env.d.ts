/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
interface ImportMetaEnv {
  readonly PUBLIC_VRITE_SEARCH_TOKEN: string;
  readonly PUBLIC_VRITE_SEARCH_CONTENT_GROUP: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
