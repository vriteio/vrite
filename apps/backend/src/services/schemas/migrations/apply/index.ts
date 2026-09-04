import {
  getCurrentSchemaDefinition,
  prepareSchemaMigrationConnections
} from "#backend/collaboration";
import type { SchemaApplicationResult } from "#backend/lib/data";
import type { AuthorizedServiceInput } from "#backend/lib/policy";
import { submitSchemaMigration } from "#backend/lib/queue";
import { ORPCError } from "@orpc/server";
import { createSchemaApplicationPlan } from "./plan";

interface ApplySchemaInput extends AuthorizedServiceInput {
  confirmedDataLoss: boolean;
  name?: string;
  schemaID: string;
}

const applySchema = async (input: ApplySchemaInput): Promise<SchemaApplicationResult> => {
  if (!input.confirmedDataLoss) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Schema migrations require explicit data-loss confirmation"
    });
  }

  // Read and persist the collaboration draft before the migration transaction locks the schema.
  // Closing a direct collaboration connection can store the document in a separate transaction.
  const definition = await getCurrentSchemaDefinition(input.schemaID, input.auth.workspaceID);
  const plan = await createSchemaApplicationPlan({
    auth: input.auth,
    name: input.name,
    schemaID: input.schemaID,
    definition
  });

  await submitSchemaMigration({
    affectedCollectionIDs: plan.affectedCollectionIDs,
    prepareAffectedContent: () => prepareSchemaMigrationConnections(plan.affectedCollectionIDs),
    migrationID: plan.migrationID,
    totalEntries: plan.totalEntries,
    workspaceID: input.auth.workspaceID
  });

  return plan;
};

export { applySchema };
