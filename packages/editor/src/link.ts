import { Link as BaseLink } from "@tiptap/extension-link";

const Link = BaseLink.extend({
  excludes: "_"
}).configure({
  openOnClick: false,
  validate(url) {
    return url.startsWith("http://") || url.startsWith("https://") || url.startsWith("mailto:");
  }
});

export { Link };
