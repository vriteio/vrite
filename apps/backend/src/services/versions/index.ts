import { createVersion } from "./create";
import { getVersion } from "./get";
import { listVersions } from "./list";
import { revertVersion } from "./revert";
import { updateVersion } from "./update";

const Versions = {
  create: createVersion,
  get: getVersion,
  list: listVersions,
  revert: revertVersion,
  update: updateVersion
};

export { Versions };
