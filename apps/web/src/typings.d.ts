interface PublicEnv {
  PUBLIC_APP_URL: string;
  PUBLIC_API_URL: string;
  PUBLIC_COLLAB_URL: string;
  PUBLIC_ASSETS_URL: string;
  PUBLIC_APP_TYPE: string;
}
interface ImportMetaEnv extends PublicEnv {}
interface Window {
  env: PublicEnv;
}
