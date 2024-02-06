import { Context } from "#lib/context";
import { deleteSession, getSessionId } from "#lib/session";

const handler = async (ctx: Context): Promise<void> => {
  const sessionId = await getSessionId(ctx, "refreshToken");

  if (sessionId) {
    deleteSession(ctx, sessionId);
  }
};

export { handler };
