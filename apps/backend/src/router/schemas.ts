import { emitSchemaEvent, emitSchemaVersionEvent } from "#backend/events";
import {
  collectionSchemaDetailsType,
  localCollectionSchemaType,
  schemaApplicationResultType,
  toSchemaVersionSummary
} from "#backend/lib/data";
import { id, toCollectionID, toSchemaID, toSchemaMigrationID } from "#backend/lib/primitives";
import { authenticatedRoute, base } from "#backend/lib/transport";
import { Schema } from "#backend/services/schemas";
import * as z from "zod";

const schemasRouter = base.router({
  create: authenticatedRoute
    .route({ method: "POST", path: "/collections/:collectionID/schema" })
    .input(z.object({ collectionID: id().describe("ID of the collection") }))
    .output(localCollectionSchemaType)
    .handler(async ({ context, input }) => {
      const result = await Schema.create({
        auth: context.auth,
        collectionID: input.collectionID
      });

      if (result.changed) {
        emitSchemaEvent(context.auth.workspaceID, {
          action: "schema:create",
          memberID: context.auth.session?.memberID,
          data: {
            id: result.schema.id,
            collectionID: result.schema.collectionID,
            enabled: result.schema.enabled,
            hasActiveVersion: Boolean(result.schema.activeVersion),
            hasUnappliedChanges: result.schema.hasUnappliedChanges
          }
        });
      }

      return result.schema;
    }),
  delete: authenticatedRoute
    .route({ method: "DELETE", path: "/schemas/:schemaID" })
    .input(
      z.object({
        schemaID: id().describe("ID of the local collection schema"),
        confirmedDataLoss: z
          .boolean()
          .default(false)
          .describe("Confirmation that an inherited-schema migration can remove entry content")
      })
    )
    .output(
      z.object({
        migrationID: id().nullable(),
        affectedCollectionIDs: z.array(id()),
        totalEntries: z.number().int().nonnegative()
      })
    )
    .handler(async ({ context, input }) => {
      const result = await Schema.delete({
        auth: context.auth,
        schemaID: input.schemaID,
        confirmedDataLoss: input.confirmedDataLoss
      });

      if (!result.migrationID) {
        emitSchemaEvent(context.auth.workspaceID, {
          action: "schema:delete",
          memberID: context.auth.session?.memberID,
          data: {
            id: toSchemaID(result.schemaID),
            collectionID: toCollectionID(result.collectionID),
            enabled: false,
            hasActiveVersion: false,
            hasUnappliedChanges: false
          }
        });
      }

      return {
        migrationID: result.migrationID ? toSchemaMigrationID(result.migrationID) : null,
        affectedCollectionIDs: result.affectedCollectionIDs.map(toCollectionID),
        totalEntries: result.totalEntries
      };
    }),
  get: authenticatedRoute
    .route({ method: "GET", path: "/collections/:collectionID/schema" })
    .input(z.object({ collectionID: id().describe("ID of the collection") }))
    .output(collectionSchemaDetailsType)
    .handler(({ context, input }) => {
      return Schema.get({
        auth: context.auth,
        collectionID: input.collectionID
      });
    }),
  apply: authenticatedRoute
    .route({ method: "POST", path: "/schemas/:schemaID/apply" })
    .input(
      z.object({
        schemaID: id().describe("ID of the local collection schema"),
        confirmedDataLoss: z
          .literal(true)
          .describe("Confirmation that the migration can remove entry content"),
        name: z.string().trim().min(1).max(100).optional().describe("Optional version name")
      })
    )
    .output(schemaApplicationResultType)
    .handler(async ({ context, input }) => {
      const result = await Schema.Migrations.apply({
        auth: context.auth,
        schemaID: input.schemaID,
        confirmedDataLoss: input.confirmedDataLoss,
        name: input.name
      });

      if (result.changed) {
        const version = await Schema.Versions.get({
          auth: context.auth,
          versionID: result.schemaVersionID
        });

        emitSchemaVersionEvent(context.auth.workspaceID, {
          action: "schema-version:create",
          data: toSchemaVersionSummary(version),
          memberID: context.auth.session?.memberID
        });
      }

      return result;
    })
});

export { schemasRouter };
