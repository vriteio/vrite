import { replaceDocumentContent } from "#backend/collaboration";
import { entryVersions } from "#backend/db";
import { db } from "#backend/lib/adapters";
import type { VersionDetails } from "#backend/lib/data";
import { toUUID } from "#backend/lib/primitives";
import { and, eq } from "drizzle-orm";
import { createVersion } from "./create";
import { getVersion } from "./get";

const revertVersion = async (input: {
  workspaceID: string;
  versionID: string;
  contributorIDs: string[];
}): Promise<{ createdVersions: VersionDetails[]; version: VersionDetails }> => {
  const target = await getVersion(input);
  const previous = await replaceDocumentContent(target.entryID, target.document, input.workspaceID);
  const createdVersions: VersionDetails[] = [];

  try {
    const [existing] = await db
      .select({ id: entryVersions.id })
      .from(entryVersions)
      .where(
        and(
          eq(entryVersions.workspaceID, toUUID(input.workspaceID)),
          eq(entryVersions.entryID, toUUID(target.entryID)),
          eq(entryVersions.hash, previous.hash)
        )
      )
      .limit(1);

    if (!existing) {
      const safetyVersion = await createVersion({
        workspaceID: input.workspaceID,
        entryID: target.entryID,
        reason: "auto",
        contributorIDs: input.contributorIDs,
        snapshot: previous
      });

      createdVersions.push(safetyVersion);
    }

    const version = await createVersion({
      workspaceID: input.workspaceID,
      entryID: target.entryID,
      reason: "revert",
      contributorIDs: input.contributorIDs,
      sourceVersionID: target.id,
      snapshot: {
        document: target.document,
        hash: target.hash
      }
    });

    createdVersions.push(version);

    return { createdVersions, version };
  } catch (error) {
    try {
      await replaceDocumentContent(target.entryID, previous.document, input.workspaceID);
    } catch (rollbackError) {
      console.error("Failed to roll back reverted document", {
        error: rollbackError,
        entryID: target.entryID
      });
    }

    throw error;
  }
};

export { revertVersion };
