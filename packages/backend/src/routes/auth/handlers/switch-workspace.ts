import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { getUserSettingsCollection } from "#collections";
import { errors } from "#lib/errors";
import { getSessionId, updateSession } from "#lib/session";

const inputSchema = z.object({
  workspaceId: z.string()
});
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const userSettingsCollection = getUserSettingsCollection(ctx.db);
  const sessionId = await getSessionId(ctx, "accessToken");
  const { matchedCount } = await userSettingsCollection.updateOne(
    { userId: ctx.auth.userId },
    { $set: { currentWorkspaceId: new ObjectId(input.workspaceId) } }
  );

  if (!matchedCount) throw errors.notFound("userSettings");

  if (sessionId) {
    await updateSession(ctx, sessionId, `${ctx.auth.userId}`);
  }
};

export { inputSchema, handler };
