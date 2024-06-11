import { Fragment, Slice } from "@tiptap/pm/model";

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
const isAppleDevice = (): boolean => {
  const platform = typeof navigator === "object" ? navigator.platform : "";
  const appleDeviceRegex = /Mac|iPod|iPhone|iPad/;

  return appleDeviceRegex.test(platform);
};
const optimizeContentSlice = (slice: Slice): Slice => {
  const expectedSize = slice.size + 2;

  if (slice.content.childCount > 1) return slice;

  let currentFragment: Fragment = slice.content;
  let { openStart } = slice;
  let { openEnd } = slice;

  while (currentFragment.size > expectedSize) {
    const newFragment = currentFragment.child(0).content;

    if (newFragment.childCount !== 1) {
      break;
    }

    currentFragment = newFragment;
    openStart += 1;
    openEnd += 1;
  }

  return new Slice(currentFragment, openStart, openEnd);
};

export { navigateAndReload, escapeHTML, isAppleDevice, optimizeContentSlice };
