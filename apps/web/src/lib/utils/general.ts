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

export { navigateAndReload, escapeHTML, isEditorApp };
