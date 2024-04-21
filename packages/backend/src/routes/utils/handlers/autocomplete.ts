import { z } from "zod";
import OpenAI from "openai";
import { Context } from "#lib/context";

const inputSchema = z.object({
  context: z.string().optional(),
  paragraph: z.string()
});
const outputSchema = z.object({
  autocompletion: z.string()
});
const handler = async (
  ctx: Context,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const openai = new OpenAI({
    apiKey: ctx.fastify.config.OPENAI_API_KEY,
    organization: ctx.fastify.config.OPENAI_ORGANIZATION
  });
  const prompt = `Briefly and concisely autocomplete the sentence to fit the provided context. RESPOND WITH EMPTY STRING IF YOU CANNOT PROVIDE AN AUTOCOMPLETION. DO NOT INCLUDE THE SENTENCE IN THE OUTPUT.\nContext: ${input.context || ""}\nSentence: ${input.paragraph}\nAutocompletion:`;
  const result = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    temperature: 0,
    max_tokens: 32,

    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  });

  let autocompletion = result.choices[0].message.content || "";
  console.log(JSON.stringify({ prompt, autocompletion }, null, 2));

  if (autocompletion.toLowerCase().startsWith("i'm sorry")) {
    autocompletion = "";
  }
  if (input.paragraph.endsWith(" ")) {
    autocompletion = autocompletion.trim();
  }

  autocompletion = autocompletion.replace(input.paragraph, "");
  return { autocompletion };
};

export { inputSchema, outputSchema, handler };
