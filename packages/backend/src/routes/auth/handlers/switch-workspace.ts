import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { getUserSettingsCollection } from "#collections";
import { errors } from "#lib/errors";
import { switchWorkspaceSession } from "#lib/session";

const inputSchema = z.object({
  workspaceId: z.string().describe("The ID of the workspace to switch to")
});
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const userSettingsCollection = getUserSettingsCollection(ctx.db);
  const { matchedCount } = await userSettingsCollection.updateOne(
    { userId: ctx.auth.userId },
    { $set: { currentWorkspaceId: new ObjectId(input.workspaceId) } }
  );

  if (!matchedCount) throw errors.notFound("userSettings");

  await switchWorkspaceSession(ctx);
};

export { inputSchema, handler };
