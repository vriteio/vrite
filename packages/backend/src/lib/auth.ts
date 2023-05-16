import { Context } from "./context";
import { SessionData, getSessionId } from "./session";
import { verifyValue } from "./hash";
import { TokenPermission, getTokensCollection } from "#database/tokens";

interface TokenData {
  permissions: TokenPermission[];
  userId: string;
  workspaceId: string;
}

const processToken = async (ctx: Context, tokenValue: string): Promise<TokenData | null> => {
  const tokensCollection = getTokensCollection(ctx.db);
  const [username, password] = tokenValue.split(":");
  const token = await tokensCollection.findOne({
    username
  });

  if (!token) return null;

  const verified = await verifyValue(password, token.salt, token.password);

  if (verified) {
    return {
      permissions: token.permissions,
      userId: `${token.userId}`,
      workspaceId: `${token.workspaceId}`
    };
  }

  return null;
};
const processAuth = async (
  ctx: Context
): Promise<{ type: "session"; data: SessionData } | { type: "token"; data: TokenData } | null> => {
  const sessionId = await getSessionId(ctx, "accessToken");

  if (sessionId) {
    try {
      const sessionCache = await ctx.fastify.redis.get(`session:${sessionId}`);

      if (!sessionCache) {
        return null;
      }

      return {
        type: "session",
        data: JSON.parse(sessionCache) as SessionData
      };
    } catch (error) {
      return null;
    }
  }

  try {
    const header = ctx.req.headers.authorization || "";
    const token = header.split(" ")[1]?.trim();

    if (!token) {
      return null;
    }

    const tokenData = await processToken(ctx, token);

    if (!tokenData) {
      return null;
    }

    return {
      type: "token",
      data: tokenData
    };
  } catch (error) {
    return null;
  }
};

export { processAuth };
