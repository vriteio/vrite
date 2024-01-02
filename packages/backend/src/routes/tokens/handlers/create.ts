import { z } from "zod";
import { AuthenticatedContext } from "#lib/middleware";
import { token } from "#collections";
import { zodId } from "#lib/mongo";
import { publishTokenEvent } from "#events";
import { createToken } from "#lib/utils";

const inputSchema = token.omit({ id: true });
const outputSchema = z.object({ value: z.string(), id: zodId() });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const { token, value } = await createToken(input, ctx);

  publishTokenEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "create",
    data: {
      id: `${token._id}`,
      name: token.name || "",
      description: token.description || "",
      permissions: token.permissions
    }
  });

  return {
    value,
    id: `${token._id}`
  };
};

export { inputSchema, outputSchema, handler };
