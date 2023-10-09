import { ExtensionGeneralContext } from "@vrite/extensions";

const uninstall = async (context: ExtensionGeneralContext): Promise<void> => {
  const transformers = await context.client.transformers.list();

  if (transformers.length > 0) {
    const mdxTransformer = transformers.find((transformer) => {
      return (
        transformer.label === "MDX" &&
        transformer.input === "http://localhost:7777/mdx/input" &&
        transformer.output === "http://localhost:7777/mdx/output"
      );
    });

    if (mdxTransformer) {
      await context.client.transformers.delete({
        id: mdxTransformer?.id
      });
    }
  }
};

export default uninstall;
