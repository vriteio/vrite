import { procedure, router, z } from "@vrite/backend";
import { Configuration, OpenAIApi } from "openai";

const basePath = "/gpt";
const gptRouter = router({
  prompt: procedure
    .meta({ openapi: { method: "POST", path: `${basePath}` } })
    .input(z.object({ prompt: z.string() }))
    .output(
      z.object({
        message: z.string()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const configuration = new Configuration({
        apiKey: ctx.fastify.config.OPENAI_API_KEY,
        organization: ctx.fastify.config.OPENAI_ORGANIZATION
      });
      const openai = new OpenAIApi(configuration);
      const response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        max_tokens: 128,
        messages: [{ role: "user", content: input.prompt }]
      });

      return {
        message: response.data.choices[0].message?.content || ""
      };
    })
});

export { gptRouter };
