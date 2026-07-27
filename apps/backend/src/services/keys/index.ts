import { createKey } from "./create";
import { deleteKeys } from "./delete";
import { getKey } from "./get";
import { listKeys } from "./list";
import { rotateKey } from "./rotate";
import { updateKey } from "./update";
import { verifyKey } from "./verify";

const Keys = {
  create: createKey,
  get: getKey,
  list: listKeys,
  delete: deleteKeys,
  update: updateKey,
  rotate: rotateKey,
  verify: verifyKey
};

export { Keys };
