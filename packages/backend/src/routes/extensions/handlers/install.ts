import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { getExtensionsCollection, tokenPermission } from "#collections";
import { publishExtensionEvent } from "#events";
import { errors } from "#lib/errors";
import { zodId } from "#lib/mongo";
import { createToken } from "#lib/utils";

const inputSchema = z.object({
  extension: z.object({
    name: z.string(),
    url: z.string(),
    permissions: z.array(tokenPermission),
    displayName: z.string()
  })
});
const outputSchema = z.object({
  id: zodId(),
  token: z.string()
});
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const extensionsCollection = getExtensionsCollection(ctx.db);
  const existingExtension = await extensionsCollection.findOne({
    workspaceId: ctx.auth.workspaceId,
    name: input.extension.name
  });

  if (existingExtension) {
    throw errors.alreadyExists("extension");
  }

  const _id = new ObjectId();
  const { value } = await createToken(
    {
      description: "",
      name: input.extension.displayName,
      permissions: input.extension.permissions
    },
    ctx,
    _id
  );

  await extensionsCollection.insertOne({
    _id,
    config: {},
    url: input.extension.url,
    name: input.extension.name,
    workspaceId: ctx.auth.workspaceId,
    token: value
  });
  publishExtensionEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "create",
    data: {
      config: {},
      url: input.extension.url,
      name: input.extension.name,
      token: value,
      id: `${_id}`
    }
  });

  return { id: `${_id}`, token: value };
};

export { inputSchema, outputSchema, handler };
