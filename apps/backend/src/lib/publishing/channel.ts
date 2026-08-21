import { ORPCError } from "@orpc/server";
import * as z from "zod";

const publishingChannelNameType = z
  .string()
  .trim()
  .transform((name) => name.toLowerCase().replace(/[-\s_]+/g, "-"))
  .pipe(
    z
      .string()
      .min(1)
      .max(50)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  );
const normalizePublishingChannelName = (name: string): string => {
  const result = publishingChannelNameType.safeParse(name);

  if (!result.success) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Channel names must be 1-50 lowercase letters, numbers, or hyphen-separated words"
    });
  }

  return result.data;
};

export { normalizePublishingChannelName, publishingChannelNameType };
