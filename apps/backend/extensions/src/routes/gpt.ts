import { procedure, router, z } from "@vrite/backend";
import { Configuration, OpenAIApi } from "openai";

const basePath = "/gpt";
const gptRouter = router({
  prompt: procedure
    .meta({
      openapi: {
        method: "POST",
        path: `${basePath}`
      }
    })
    .input(z.object({ prompt: z.string() }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      const configuration = new Configuration({
        apiKey: ctx.fastify.config.OPENAI_API_KEY,
        organization: ctx.fastify.config.OPENAI_ORGANIZATION
      });
      const openai = new OpenAIApi(configuration);
      const response = await openai.createChatCompletion(
        {
          model: "gpt-3.5-turbo",
          stream: true,
          messages: [
            {
              role: "system",
              content:
                "You are a technical content generator in GitHub Flavored Markdown-based editor. For code snippets, include their language in the Markdown output."
            },
            { role: "user", content: input.prompt }
          ]
        },
        { responseType: "stream" }
      );
      ctx.res.raw.writeHead(200, {
        ...ctx.res.getHeaders(),
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        "connection": "keep-alive"
      });

      return new Promise<void>((resolve) => {
        const responseData = response.data as unknown as {
          on(event: string, data: (data: string) => void): void;
        };

        responseData.on("data", (data) => {
          const lines = data
            .toString()
            .split("\n")
            .filter((line) => line.trim() !== "");
          for (const line of lines) {
            const message = line.replace(/^data: /, "");
            if (message === "[DONE]") {
              ctx.res.raw.end();
              resolve();
              continue;
            }
            try {
              const parsed = JSON.parse(message);

              const content = parsed.choices[0].delta.content || "";

              if (content) {
                ctx.res.raw.write(`data: ${encodeURIComponent(content)}`);
                ctx.res.raw.write("\n\n");
              }
            } catch (error) {
              console.error("Could not JSON parse stream message", message, error);
            }
          }
        });
      });
    })
});

export { gptRouter };
