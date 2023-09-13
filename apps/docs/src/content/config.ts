import { z, defineCollection } from "astro:content";

const docsCollection = defineCollection({
  type: "content"
});
const collections = {
  docs: docsCollection
};

export { collections };
