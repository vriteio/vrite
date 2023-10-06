import { createInputTransformer } from "@vrite/sdk/transformers";
import { remark } from "remark";
import remarkMdx from "remark-mdx";

const docusaurusInputTransformer = createInputTransformer(() => {
  /* const myRemarkPlugin = () => {
    return (tree: Root) => {
      visit(tree, (node) => {
        console.log(node);
        // `node` can now be one of the nodes for JSX, expressions, or ESM.
      });
    };
  };*/
  const file = remark().use(remarkMdx).processSync('import a from "b"\n\na <b /> c {1 + 1} d');

  console.log(String(file));

  return {
    content: ""
  };
});

export { docusaurusInputTransformer };
