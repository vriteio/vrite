import { schemaMigrationDetailsType } from "#backend/lib/data";
import { id } from "#backend/lib/primitives";
import { authenticatedRoute, base } from "#backend/lib/transport";
import { Schema } from "#backend/services/schemas";
import * as z from "zod";

const schemaMigrationsRouter = base.router({
  getActive: authenticatedRoute
    .route({ method: "GET", path: "/collections/:collectionID/schema-migration" })
    .input(z.object({ collectionID: id().describe("ID of the affected collection") }))
    .output(schemaMigrationDetailsType.nullable())
    .handler(({ context, input }) => {
      return Schema.Migrations.getActive({
        auth: context.auth,
        collectionID: input.collectionID
      });
    }),
  get: authenticatedRoute
    .route({ method: "GET", path: "/schema-migrations/:id" })
    .input(z.object({ id: id().describe("ID of the schema migration") }))
    .output(schemaMigrationDetailsType)
    .handler(({ context, input }) => {
      return Schema.Migrations.get({
        auth: context.auth,
        migrationID: input.id
      });
    })
});

export { schemaMigrationsRouter };
