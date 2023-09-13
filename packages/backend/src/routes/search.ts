import { z } from "zod";
import { isAuthenticated, isEnabled } from "#lib/middleware";
import { procedure, router } from "#lib/trpc";
import { errors, zodId } from "#lib";

const authenticatedProcedure = procedure.use(isAuthenticated).use(isEnabled);
const basePath = "/search";
const searchRouter = router({
  search: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: `${basePath}`, protect: true },
      requiredConfig: ["search"],
      permissions: { token: ["contentPieces:read"] }
    })
    .input(
      z.object({
        query: z.string(),
        limit: z.number().optional(),
        variantId: zodId().optional(),
        contentPieceId: zodId().optional()
      })
    )
    .output(
      z.array(
        z.object({
          contentPieceId: z.string(),
          breadcrumb: z.array(z.string()),
          content: z.string()
        })
      )
    )
    .query(async ({ ctx, input }) => {
      const results = await ctx.fastify.search.search({
        query: input.query,
        workspaceId: ctx.auth.workspaceId,
        limit: input.limit || 8,
        variantId: input.variantId,
        contentPieceId: input.contentPieceId
      });

      return results.data.Get.Content.map(({ _additional, ...result }) => result);
    }),
  ask: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: `${basePath}/ask`, protect: true },
      requiredConfig: ["aiSearch"],
      permissions: { token: ["contentPieces:read"] }
    })
    .input(
      z.object({
        query: z.string(),
        variantId: zodId().optional()
      })
    )
    .output(z.any())
    .query(async ({ ctx, input }) => {
      try {
        const responseStream = await ctx.fastify.search.ask({
          question: input.query,
          workspaceId: ctx.auth.workspaceId,
          variantId: input.variantId
        });

        if (!responseStream) throw errors.serverError();

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
      } catch (error) {
        ctx.res.raw.writeHead(500, {
          ...ctx.res.getHeaders(),
          "content-type": "application/json",
          "cache-control": "no-cache",
          "connection": "keep-alive"
        });
        throw errors.serverError();
      }
    })
});

export { searchRouter };
