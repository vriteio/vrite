import { createEntry } from "./create";
import { deleteEntries } from "./delete";
import { listEntries } from "./list";
import { moveEntry } from "./move";
import { updateEntry } from "./update";

const Entries = {
  create: createEntry,
  list: listEntries,
  delete: deleteEntries,
  update: updateEntry,
  move: moveEntry
};

export { Entries };
