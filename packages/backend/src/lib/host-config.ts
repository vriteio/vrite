import { z } from "zod";

const hostConfig = z.object({
  githubOAuth: z.boolean().describe("Whether GitHub OAuth is enabled"),
  githubApp: z.boolean().describe("Whether GitHub App is configured for Git sync"),
  sendgrid: z.boolean().describe("Whether SendGrid is configured for email"),
  smtp: z.boolean().describe("Whether SMTP is configured for email"),
  search: z.boolean().describe("Whether Weaviate is configured for search"),
  aiSearch: z.boolean().describe("Whether Weaviate and OpenAI is configured for Q&A search"),
  extensions: z.boolean().describe("Whether extensions are enabled"),
  billing: z.boolean().describe("Whether subscription billing is enabled")
});

interface HostConfig extends z.infer<typeof hostConfig> {}

export { hostConfig };
export type { HostConfig };
