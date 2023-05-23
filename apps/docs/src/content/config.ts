import { z, defineCollection } from "astro:content";

const usageGuideCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string()
  })
});
const collections = {
  "usage-guide": usageGuideCollection
};

export { collections };
