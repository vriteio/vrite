import { removeMemberFromWorkspace } from "../utils";
import { z } from "zod";
import { AuthenticatedContext } from "#lib/middleware";
import { zodId } from "#lib/mongo";

const inputSchema = z.object({ id: zodId() });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  return removeMemberFromWorkspace(ctx, input.id);
};

export { inputSchema, handler };
