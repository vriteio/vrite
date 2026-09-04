import { getSchemaVersion } from "./get";
import { listSchemaVersions } from "./list";
import { revertSchemaVersion } from "./revert";
import { updateSchemaVersion } from "./update";

const Versions = {
  get: getSchemaVersion,
  list: listSchemaVersions,
  revert: revertSchemaVersion,
  update: updateSchemaVersion
};

export { Versions };
