import { ExtensionBaseContext } from "@vrite/extensions";

const configure = async (context: ExtensionBaseContext): Promise<void> => {
  const transformers = await context.client.transformers.list();
  const mdxTransformer = transformers.find((transformer) => {
    return (
      transformer.label === "MDX" &&
      transformer.input === "http://localhost:7777/mdx/input" &&
      transformer.output === "http://localhost:7777/mdx/output"
    );
  });

  if (!mdxTransformer) {
    await context.client.transformers.create({
      input: "http://localhost:7777/mdx/input",
      output: "http://localhost:7777/mdx/output",
      maxBatchSize: 100,
      label: "MDX"
    });
  }
};

export default configure;
