import { createEntry } from "./create";
import { deleteEntries } from "./delete";
import { getEntry } from "./get";
import { listEntries } from "./list";
import { moveEntry } from "./move";
import { updateEntry } from "./update";

const Entries = {
  create: createEntry,
  get: getEntry,
  list: listEntries,
  delete: deleteEntries,
  update: updateEntry,
  move: moveEntry
};

export { Entries };
