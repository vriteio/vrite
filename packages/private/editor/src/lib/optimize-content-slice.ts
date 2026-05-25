import { Slice, Fragment } from "@tiptap/pm/model";

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

export { optimizeContentSlice };
