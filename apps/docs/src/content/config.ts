import { z, defineCollection } from "astro:content";

const docsCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    category: z.string()
  })
});
const collections = {
  docs: docsCollection
};

export { collections };
