interface PublicEnv {
  PUBLIC_APP_HOST: string;
  PUBLIC_API_HOST: string;
  PUBLIC_COLLAB_HOST: string;
  PUBLIC_ASSETS_HOST: string;
  PUBLIC_APP_TYPE: string;
}
interface ImportMetaEnv extends PublicEnv {}
interface Window {
  env: PublicEnv;
}
