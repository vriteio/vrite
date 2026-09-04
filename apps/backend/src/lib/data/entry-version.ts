import type { entryVersions } from "#backend/db";
import { contentNodeType, type ContentNode } from "#backend/lib/content";
import { id, toEntryID, toMembershipID, toVersionID } from "#backend/lib/primitives";
import * as z from "zod";

interface VersionSummary {
  id: string;
  entryID: string;
  entryName: string;
  hash: string;
  name: string | null;
  reason: VersionReason;
  sourceVersionID: string | null;
  contributorIDs: string[];
  createdAt: string;
  updatedAt: string;
}
interface VersionDetails extends VersionSummary {
  document: ContentNode;
}
type VersionReason = "auto" | "manual" | "revert" | "schema-migration";
type EntryVersionRow = typeof entryVersions.$inferSelect;

const versionReasonType = z.enum(["auto", "manual", "revert", "schema-migration"]);
const versionSummaryType = z.object({
  id: id().describe("ID of the version"),
  entryID: id().describe("ID of the versioned entry"),
  entryName: z.string().describe("Entry name stored in the version"),
  hash: z.string().length(64).describe("Hash of the version content"),
  name: z.string().nullable().describe("Optional name of the version"),
  reason: versionReasonType.describe("Reason why the version was created"),
  sourceVersionID: id().nullable().describe("Source version used for a revert"),
  contributorIDs: z.array(id()).describe("Memberships that contributed to the version"),
  createdAt: z.iso.datetime().describe("Time when the version was created"),
  updatedAt: z.iso.datetime().describe("Time when the version name was last updated")
});
const versionDetailsType = versionSummaryType.extend({
  document: contentNodeType.describe("ProseMirror JSON stored in the version")
});
const mapVersionSummary = (row: EntryVersionRow, contributorIDs: string[]): VersionSummary => {
  return {
    id: toVersionID(row.id),
    entryID: toEntryID(row.entryID),
    entryName: row.entryName,
    hash: row.hash,
    name: row.name,
    reason: row.reason,
    sourceVersionID: row.sourceVersionID ? toVersionID(row.sourceVersionID) : null,
    contributorIDs: contributorIDs.map(toMembershipID),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
};
const mapVersion = (row: EntryVersionRow, contributorIDs: string[]): VersionDetails => {
  return {
    ...mapVersionSummary(row, contributorIDs),
    document: row.document
  };
};

export { mapVersion, mapVersionSummary, versionDetailsType, versionReasonType, versionSummaryType };
export type { VersionDetails, VersionReason, VersionSummary };
