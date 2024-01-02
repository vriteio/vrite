import { Context } from "#lib/context";
import { errors } from "#lib/errors";
import { getSessionId, refreshSession } from "#lib/session";

const handler = async (ctx: Context): Promise<void> => {
  let sessionId = await getSessionId(ctx, "accessToken");

  if (sessionId) {
    return;
  }

  sessionId = await getSessionId(ctx, "refreshToken");

  if (!sessionId) {
    throw errors.unauthorized("invalidRefreshToken");
  }

  await refreshSession(ctx, sessionId);
};

export { handler };
