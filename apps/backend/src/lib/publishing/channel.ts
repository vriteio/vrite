import { normalizeResourceName } from "@andesine/editor/normalize-resource-name";
import { ORPCError } from "@orpc/server";
import * as z from "zod";

const publishingChannelCodeType = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .transform((code) => normalizeResourceName(code, "channel"));
const publishingChannelNameType = z.string().trim().min(1).max(50);
const normalizePublishingChannelCode = (code: string): string => {
  const result = publishingChannelCodeType.safeParse(code);

  if (!result.success) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Channel codes must be between 1 and 50 characters"
    });
  }

  return result.data;
};

export { normalizePublishingChannelCode, publishingChannelCodeType, publishingChannelNameType };
