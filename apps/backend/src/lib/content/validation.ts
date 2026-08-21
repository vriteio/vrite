import * as z from "zod";
import type { ContentNode } from "./document";

const contentMarkType = z.object({
  type: z.string(),
  attrs: z.record(z.string(), z.unknown()).optional()
});
const contentNodeType: z.ZodType<ContentNode> = z.lazy(() => {
  return z.object({
    type: z.string(),
    attrs: z.record(z.string(), z.unknown()).optional(),
    content: z.array(contentNodeType).optional(),
    marks: z.array(contentMarkType).optional(),
    text: z.string().optional()
  });
});

export { contentMarkType, contentNodeType };
