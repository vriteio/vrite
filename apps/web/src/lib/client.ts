import type { App } from "@andesine/backend";
import { treaty } from "@elysiajs/eden";

const client = treaty<App>("localhost:3333", {
  fetch: {
    credentials: "include"
  }
});

export { client };
export type * from "@andesine/backend";
