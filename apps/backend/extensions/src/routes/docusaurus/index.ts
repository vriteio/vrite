import { docusaurusInputTransformer } from "./input-transformer";
import { procedure, router, z } from "@vrite/backend";
import { OpenAI } from "openai";

// test
docusaurusInputTransformer("");

const basePath = "/docusaurus";
const docusaurusRouter = router({
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
      const openai = new OpenAI({
        apiKey: ctx.fastify.config.OPENAI_API_KEY,
        organization: ctx.fastify.config.OPENAI_ORGANIZATION
      });
      const responseStream = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        stream: true,
        messages: [{ role: "user", content: input.prompt }]
      });

      ctx.res.raw.writeHead(200, {
        ...ctx.res.getHeaders(),
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        "connection": "keep-alive"
      });

      for await (const part of responseStream) {
        const content = part.choices[0].delta.content || "";

        if (content) {
          ctx.res.raw.write(`data: ${encodeURIComponent(content)}`);
          ctx.res.raw.write("\n\n");
        }
      }

      ctx.res.raw.end();
    })
});

export { docusaurusRouter };
