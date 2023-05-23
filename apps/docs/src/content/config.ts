import { z, defineCollection } from "astro:content";

const apiDocsCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string()
  })
});
const collections = {
  apiDocs: apiDocsCollection
};

export { collections };
