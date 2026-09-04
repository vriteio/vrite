import { emitSchemaEvent, emitSchemaVersionEvent } from "#backend/events";
import {
  schemaApplicationResultType,
  schemaVersionDetailsType,
  schemaVersionSummaryType,
  toSchemaVersionSummary
} from "#backend/lib/data";
import { id } from "#backend/lib/primitives";
import { authenticatedRoute, base } from "#backend/lib/transport";
import { Schema } from "#backend/services/schemas";
import * as z from "zod";

const schemaVersionListType = z.object({
  data: z.array(schemaVersionSummaryType),
  pagination: z.object({
    nextCursor: id().nullable(),
    hasMore: z.boolean()
  })
});
const schemaVersionsRouter = base.router({
  list: authenticatedRoute
    .route({ method: "GET", path: "/schemas/:schemaID/versions" })
    .input(
      z.object({
        schemaID: id().describe("ID of the local collection schema"),
        cursor: id().optional().describe("Cursor from the previous page"),
        limit: z.number().int().min(1).max(100).optional().describe("Maximum versions to return")
      })
    )
    .output(schemaVersionListType)
    .handler(async ({ context, input }) => {
      const { versions, nextCursor } = await Schema.Versions.list({
        auth: context.auth,
        schemaID: input.schemaID,
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
    .route({ method: "GET", path: "/schema-versions/:id" })
    .input(z.object({ id: id().describe("ID of the schema version") }))
    .output(schemaVersionDetailsType)
    .handler(({ context, input }) => {
      return Schema.Versions.get({
        auth: context.auth,
        versionID: input.id
      });
    }),
  revert: authenticatedRoute
    .route({ method: "POST", path: "/schema-versions/:id/revert" })
    .input(
      z.object({
        id: id().describe("ID of the schema version to restore"),
        confirmedDataLoss: z
          .literal(true)
          .describe("Confirmation that the migration can remove entry content"),
        name: z.string().trim().min(1).max(100).optional().describe("Optional version name")
      })
    )
    .output(schemaApplicationResultType)
    .handler(async ({ context, input }) => {
      const result = await Schema.Versions.revert({
        auth: context.auth,
        versionID: input.id,
        confirmedDataLoss: input.confirmedDataLoss,
        name: input.name
      });
      for (const versionID of result.createdVersionIDs) {
        const version = await Schema.Versions.get({
          auth: context.auth,
          versionID
        });

        emitSchemaVersionEvent(context.auth.workspaceID, {
          action: "schema-version:create",
          data: toSchemaVersionSummary(version),
          memberID: context.auth.session?.memberID
        });
      }
      emitSchemaEvent(context.auth.workspaceID, {
        action: "schema:update",
        data: {
          id: result.schemaID,
          collectionID: result.collectionID,
          enabled: true,
          hasActiveVersion: true,
          hasUnappliedChanges: Boolean(result.application.migrationID)
        },
        memberID: context.auth.session?.memberID
      });
      emitSchemaEvent(context.auth.workspaceID, {
        action: "schema:content-reset",
        data: {
          id: result.schemaID,
          collectionID: result.collectionID,
          enabled: true,
          hasActiveVersion: true,
          hasUnappliedChanges: Boolean(result.application.migrationID)
        }
      });

      return result.application;
    }),
  update: authenticatedRoute
    .route({ method: "PATCH", path: "/schema-versions/:id" })
    .input(
      z.object({
        id: id().describe("ID of the schema version"),
        name: z
          .union([z.string().trim().min(1).max(100), z.null()])
          .describe("New version name, or null to remove it")
      })
    )
    .output(z.void())
    .handler(async ({ context, input }) => {
      const version = await Schema.Versions.update({
        auth: context.auth,
        versionID: input.id,
        name: input.name
      });

      emitSchemaVersionEvent(context.auth.workspaceID, {
        action: "schema-version:update",
        data: toSchemaVersionSummary(version),
        memberID: context.auth.session?.memberID
      });
    })
});

export { schemaVersionsRouter };
