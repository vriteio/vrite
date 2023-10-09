import { z, defineCollection } from "astro:content";

const docsCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional()
  })
});
const recipesCollection = defineCollection({
  type: "content"
});
const apiCollection = defineCollection({
  type: "content"
});
const collections = {
  docs: docsCollection,
  recipes: recipesCollection,
  api: apiCollection
};

export { collections };
