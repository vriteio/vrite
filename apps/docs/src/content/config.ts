import { z, defineCollection } from "astro:content";

const docsCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional()
  })
});
const apiCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional()
  })
});
const recipesCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional()
  })
});
const collections = {
  docs: docsCollection,
  api: apiCollection,
  recipes: recipesCollection
};

export { collections };
