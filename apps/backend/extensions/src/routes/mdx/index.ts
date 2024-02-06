import { mdxAsyncInputTransformer } from "./input-transformer";
import { mdxAsyncOutputTransformer } from "./output-transformer";
import { procedure, router } from "@vrite/backend";
import { InputTransformer } from "@vrite/sdk/transformers";
import { z } from "zod";

const basePath = "/mdx";
const mdxRouter = router({
  input: procedure
    .meta({
      openapi: {
        method: "POST",
        path: `${basePath}/input`
      }
    })
    .input(z.object({ data: z.array(z.string()) }))
    .output(
      z.array(
        z.object({
          content: z.string(),
          contentPiece: z.any()
        })
      )
    )
    .mutation(async ({ input }) => {
      const output: Array<ReturnType<InputTransformer>> = [];

      for await (const content of input.data) {
        output.push(await mdxAsyncInputTransformer(content));
      }

      return output;
    }),
  output: procedure
    .meta({
      openapi: {
        method: "POST",
        path: `${basePath}/output`
      }
    })
    .input(
      z.object({
        data: z.array(
          z.object({
            content: z.any(),
            metadata: z.any()
          })
        )
      })
    )
    .output(z.array(z.string()))
    .mutation(async ({ ctx, input }) => {
      const output: string[] = [];

      for await (const { content, metadata } of input.data) {
        output.push(await mdxAsyncOutputTransformer(content, metadata));
      }

      return output;
    })
});

export { mdxRouter };
