const navigateAndReload = (path: string): void => {
  window.location.replace(path);
};
const escapeHTML = (input: string): string => {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};
const isEditorApp = (): boolean => {
  return import.meta.env.PUBLIC_APP === "editor";
};
const isAppleDevice = (): boolean => {
  const platform = typeof navigator === "object" ? navigator.platform : "";
  const appleDeviceRegex = /Mac|iPod|iPhone|iPad/;

  return appleDeviceRegex.test(platform);
};

export { navigateAndReload, escapeHTML, isEditorApp, isAppleDevice };
