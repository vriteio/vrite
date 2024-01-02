import { z } from "zod";
import { hostConfig } from "#lib/host-config";
import { Context } from "#lib/context";

const outputSchema = hostConfig;
const handler = async (ctx: Context): Promise<z.infer<typeof outputSchema>> => {
  return ctx.fastify.hostConfig;
};

export { outputSchema, handler };
