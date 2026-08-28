import { emitPublishingEntryUpdates, emitVersionEvent } from "#backend/events";
import {
  type VersionDetails,
  type VersionSummary,
  versionDetailsType,
  versionSummaryType
} from "#backend/lib/data";
import { id } from "#backend/lib/primitives";
import { authenticatedRoute, base } from "#backend/lib/transport";
import { Versions } from "#backend/services/versions";
import * as z from "zod";

const versionListType = z.object({
  data: z.array(versionSummaryType),
  pagination: z.object({
    nextCursor: id().nullable(),
    hasMore: z.boolean()
  })
});
const getContributorIDs = (auth: { session?: { memberID: string } }): string[] => {
  return auth.session ? [auth.session.memberID] : [];
};
const toVersionSummary = ({ document: _document, ...version }: VersionDetails): VersionSummary => {
  return version;
};

const versionsRouter = base.router({
  create: authenticatedRoute
    .route({ method: "POST", path: "/entries/:entryID/versions" })
    .input(
      z.object({
        entryID: id().describe("ID of the entry to version"),
        name: z.string().trim().min(1).max(100).optional().describe("Optional version name")
      })
    )
    .output(versionDetailsType)
    .handler(async ({ context, input }) => {
      const version = await Versions.create({
        auth: context.auth,
        entryID: input.entryID,
        reason: "manual",
        contributorIDs: getContributorIDs(context.auth),
        name: input.name
      });

      emitVersionEvent(context.auth.workspaceID, {
        action: "version:create",
        data: toVersionSummary(version),
        memberID: context.auth.session?.memberID
      });

      return version;
    }),
  list: authenticatedRoute
    .route({ method: "GET", path: "/entries/:entryID/versions" })
    .input(
      z.object({
        entryID: id().describe("ID of the entry whose versions to list"),
        cursor: id().optional().describe("Cursor from the previous page"),
        limit: z.number().int().min(1).max(100).optional().describe("Maximum versions to return")
      })
    )
    .output(versionListType)
    .handler(async ({ context, input }) => {
      const { versions, nextCursor } = await Versions.list({
        auth: context.auth,
        entryID: input.entryID,
        cursor: input.cursor,
        limit: input.limit
      });

      return {
        data: versions,
        pagination: {
          nextCursor,
          hasMore: nextCursor !== null
        }
      };
    }),
  get: authenticatedRoute
    .route({ method: "GET", path: "/versions/:id" })
    .input(z.object({ id: id().describe("ID of the version to get") }))
    .output(versionDetailsType)
    .handler(({ context, input }) => {
      return Versions.get({
        auth: context.auth,
        versionID: input.id
      });
    }),
  update: authenticatedRoute
    .route({ method: "PATCH", path: "/versions/:id" })
    .input(
      z.object({
        id: id().describe("ID of the version to update"),
        name: z
          .union([z.string().trim().min(1).max(100), z.null()])
          .describe("New version name, or null to remove it")
      })
    )
    .output(z.void())
    .handler(async ({ context, input }) => {
      const version = await Versions.update({
        auth: context.auth,
        versionID: input.id,
        name: input.name
      });

      emitVersionEvent(context.auth.workspaceID, {
        action: "version:update",
        data: toVersionSummary(version),
        memberID: context.auth.session?.memberID
      });
    }),
  revert: authenticatedRoute
    .route({ method: "POST", path: "/versions/:id/revert" })
    .input(z.object({ id: id().describe("ID of the version to restore") }))
    .output(versionDetailsType)
    .handler(async ({ context, input }) => {
      const result = await Versions.revert({
        auth: context.auth,
        versionID: input.id,
        contributorIDs: getContributorIDs(context.auth)
      });

      for (const version of result.createdVersions) {
        emitVersionEvent(context.auth.workspaceID, {
          action: "version:create",
          data: toVersionSummary(version),
          memberID: context.auth.session?.memberID
        });
      }

      emitPublishingEntryUpdates({
        workspaceID: context.auth.workspaceID,
        entries: result.publishingEntries,
        memberID: context.auth.session?.memberID
      });

      return result.version;
    })
});

export { versionsRouter };
