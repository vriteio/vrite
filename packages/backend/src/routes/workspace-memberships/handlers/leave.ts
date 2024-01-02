import { removeMemberFromWorkspace } from "../utils";
import { AuthenticatedContext } from "#lib/middleware";

const handler = async (ctx: AuthenticatedContext): Promise<void> => {
  return removeMemberFromWorkspace(ctx);
};

export { handler };
