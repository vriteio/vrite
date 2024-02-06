import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import { prettierConfig } from "#collections";
import { Context } from "#lib/context";

const outputSchema = z.any();
const handler = async (_ctx: Context): Promise<z.infer<typeof outputSchema>> => {
  return zodToJsonSchema(prettierConfig);
};

export { outputSchema, handler };
