import { ORPCError } from "@orpc/server";
import * as z from "zod";

const MAX_CONTENT_NAME_LENGTH = 300;
const ROOT_COLLECTION_NAME = "~";
const CONTENT_NAME_TOO_LONG_MESSAGE = `Name cannot exceed ${MAX_CONTENT_NAME_LENGTH} characters`;
const COLLECTION_NAME_REQUIRED_MESSAGE = "Collection name cannot be empty";

const entryName = () =>
  z
    .string()
    .trim()
    .max(MAX_CONTENT_NAME_LENGTH, { error: CONTENT_NAME_TOO_LONG_MESSAGE })
    .transform((name) => name || "Untitled");
const collectionName = () =>
  z
    .string()
    .trim()
    .min(1, { error: COLLECTION_NAME_REQUIRED_MESSAGE })
    .max(MAX_CONTENT_NAME_LENGTH, { error: CONTENT_NAME_TOO_LONG_MESSAGE });

const normalizeEntryName = (name: string) => {
  const result = entryName().safeParse(name);

  if (!result.success) {
    throw new ORPCError("BAD_REQUEST", { message: result.error.issues[0]?.message });
  }

  return result.data;
};
const normalizeCollectionName = (name: string) => {
  const result = collectionName().safeParse(name);

  if (!result.success) {
    throw new ORPCError("BAD_REQUEST", { message: result.error.issues[0]?.message });
  }

  return result.data;
};

export {
  MAX_CONTENT_NAME_LENGTH,
  ROOT_COLLECTION_NAME,
  collectionName,
  entryName,
  normalizeCollectionName,
  normalizeEntryName
};
