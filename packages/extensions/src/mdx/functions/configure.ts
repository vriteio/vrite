import { ExtensionBaseContext } from "@vrite/extensions";

const configure = async (context: ExtensionBaseContext): Promise<void> => {
  const transformers = await context.client.transformers.list();
  const mdxTransformer = transformers.find((transformer) => {
    return (
      transformer.label === "MDX" &&
      transformer.input === "https://extensions.vrite.io/mdx/input" &&
      transformer.output === "https://extensions.vrite.io/mdx/output"
    );
  });

  if (!mdxTransformer) {
    await context.client.transformers.create({
      input: "https://extensions.vrite.io/mdx/input",
      output: "https://extensions.vrite.io/mdx/output",
      maxBatchSize: 100,
      label: "MDX"
    });
  }
};

export default configure;
