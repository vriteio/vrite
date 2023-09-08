import { procedure, router, z } from "@vrite/backend";
import { gfmInputTransformer, gfmOutputTransformer } from "@vrite/sdk/transformers";

const basePath = "/docusaurus";
const docusaurusRouter = router({
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
    .mutation(async ({ ctx, input }) => {
      return input.data.map((input) => {
        return gfmInputTransformer(input);
      });
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
    .mutation(async ({ input }) => {
      return input.data.map((input) => {
        return gfmOutputTransformer(input.content, input.metadata);
      });
    })
});

export { docusaurusRouter };
