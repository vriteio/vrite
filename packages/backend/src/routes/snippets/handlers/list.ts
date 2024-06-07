import { z } from "zod";
import { getSnippetsCollection, snippet } from "#collections";
import { AuthenticatedContext } from "#lib/middleware";

const outputSchema = z.array(snippet);
const handler = async (ctx: AuthenticatedContext): Promise<z.infer<typeof outputSchema>> => {
  const snippetsCollection = getSnippetsCollection(ctx.db);
  const snippets = await snippetsCollection
    .find({
      workspaceId: ctx.auth.workspaceId
    })
    .sort({ _id: -1 })
    .toArray();

  return snippets.map((snippet) => {
    return {
      id: `${snippet._id}`,
      name: snippet.name
    };
  });
};

export { outputSchema, handler };
