import { z } from "zod";
import { processAuth } from "#lib/auth";
import { Context } from "#lib/context";

const outputSchema = z.object({
  isSignedIn: z.boolean().describe("Whether the user is signed in")
});
const handler = async (ctx: Context): Promise<z.infer<typeof outputSchema>> => {
  const auth = await processAuth(ctx);

  return {
    isSignedIn: Boolean(auth)
  };
};

export { outputSchema, handler };
