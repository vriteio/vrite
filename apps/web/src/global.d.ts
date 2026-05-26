/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly PUBLIC_API_HOST: string;
  readonly PUBLIC_APP_HOST: string;
  readonly PUBLIC_COOKIE_DOMAIN?: string;
  readonly PUBLIC_SECURE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
