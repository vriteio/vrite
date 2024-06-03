interface PublicEnv {
  PUBLIC_APP_URL: string;
  PUBLIC_API_URL: string;
  PUBLIC_COLLAB_URL: string;
  PUBLIC_ASSETS_URL: string;
  PUBLIC_POSTHOG_TOKEN: string;
  PUBLIC_DISABLE_ANALYTICS: boolean;
}
interface ImportMetaEnv extends PublicEnv {}
interface Window {
  env: PublicEnv;
}
