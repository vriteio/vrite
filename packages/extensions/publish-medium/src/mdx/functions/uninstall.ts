import { ExtensionGeneralContext } from "@vrite/extensions";

const uninstall = async (context: ExtensionGeneralContext): Promise<void> => {
  const transformers = await context.client.transformers.list();

  if (transformers.length > 0) {
    const mdxTransformer = transformers.find((transformer) => {
      return (
        transformer.label === "MDX" &&
        transformer.input === "https://extensions.vrite.io/mdx/input" &&
        transformer.output === "https://extensions.vrite.io/mdx/output"
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
