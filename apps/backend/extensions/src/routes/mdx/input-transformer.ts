import { createInputTransformer } from "@vrite/sdk/transformers";
import { mdxjs } from "micromark-extension-mdxjs";
import { fromMarkdown } from "mdast-util-from-markdown";
import { mdxFromMarkdown } from "mdast-util-mdx";
import { frontmatter } from "micromark-extension-frontmatter";
import { frontmatterFromMarkdown } from "mdast-util-frontmatter";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";
import { toHtml } from "hast-util-to-html";
import { toHast } from "mdast-util-to-hast";

import fs from "node:fs";
import path from "node:path";

const mdxInputTransformer = createInputTransformer(() => {
  const doc = fs.readFileSync(path.join(__dirname, "test.mdx"), "utf8");
  const tree = fromMarkdown(doc, {
    extensions: [gfm(), frontmatter(), mdxjs()],
    mdastExtensions: [gfmFromMarkdown(), frontmatterFromMarkdown(), mdxFromMarkdown()]
  });
  const hast = toHast(tree, { handlers: {} });
  const html = toHtml(hast);

  console.log(tree, html);

  return {
    content: ""
  };
});

export { mdxInputTransformer };
