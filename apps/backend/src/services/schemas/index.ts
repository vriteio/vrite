import { createCollectionSchema } from "./create";
import { deleteCollectionSchema } from "./delete";
import { getCollectionSchema } from "./get";
import { Migrations } from "./migrations";
import { Versions } from "./versions";

const Schema = {
  create: createCollectionSchema,
  delete: deleteCollectionSchema,
  get: getCollectionSchema,
  Migrations,
  Versions
};

export { Schema };
