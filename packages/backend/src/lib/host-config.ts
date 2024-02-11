import { z } from "zod";

const hostConfig = z.object({
  githubOAuth: z.boolean(),
  githubApp: z.boolean(),
  sendgrid: z.boolean(),
  smtp: z.boolean(),
  search: z.boolean(),
  aiSearch: z.boolean(),
  extensions: z.boolean(),
  billing: z.boolean()
});

interface HostConfig extends z.infer<typeof hostConfig> {}

export { hostConfig };
export type { HostConfig };
