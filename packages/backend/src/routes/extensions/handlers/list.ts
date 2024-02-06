import { z } from "zod";
import { AuthenticatedContext } from "#lib/middleware";
import { extension, getExtensionsCollection } from "#collections";

const inputSchema = z
  .object({
    perPage: z.number().default(20),
    page: z.number().default(1)
  })
  .default({});
const outputSchema = z.array(extension);
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const extensionsCollection = getExtensionsCollection(ctx.db);
  const extensions = await extensionsCollection
    .find({
      workspaceId: ctx.auth.workspaceId
    })
    .sort({ _id: -1 })
    .skip((input.page - 1) * input.perPage)
    .limit(input.perPage)
    .toArray();

  return extensions.map(({ _id, workspaceId, ...extension }) => ({
    ...extension,
    id: `${_id}`
  }));
};

export { inputSchema, outputSchema, handler };
