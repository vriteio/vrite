import { createHash } from "node:crypto";

interface CacheHeaders {
  "Cache-Control": string;
  "ETag": string;
}

const CACHE_CONTROL = "private, no-cache";
const formatEntityTag = (value: string): string => `"${value}"`;
const hashEntityTag = (value: unknown): string => {
  const hash = createHash("sha256").update(JSON.stringify(value)).digest("hex");

  return formatEntityTag(hash);
};
const getCacheHeaders = (entityTag: string): CacheHeaders => {
  return {
    "Cache-Control": CACHE_CONTROL,
    "ETag": entityTag
  };
};
const matchesEntityTag = (header: string | null | undefined, entityTag: string): boolean => {
  if (!header) return false;

  const normalizedEntityTag = entityTag.replace(/^W\//, "");

  return header.split(",").some((candidate) => {
    const normalizedCandidate = candidate.trim().replace(/^W\//, "");

    return normalizedCandidate === "*" || normalizedCandidate === normalizedEntityTag;
  });
};

export { formatEntityTag, getCacheHeaders, hashEntityTag, matchesEntityTag };
export type { CacheHeaders };
