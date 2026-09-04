import { applySchema } from "./apply";
import { getActiveSchemaMigration } from "./get-active";
import { getSchemaMigration } from "./get";

const Migrations = {
  apply: applySchema,
  getActive: getActiveSchemaMigration,
  get: getSchemaMigration
};

export { Migrations };
