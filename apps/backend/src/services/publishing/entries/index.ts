import { getPublishedEntryContent } from "./get-content";
import { getPublishedEntryVersion } from "./get-version";
import { publishEntry } from "./publish";
import { unpublishEntry } from "./unpublish";

const Entries = {
  getContent: getPublishedEntryContent,
  getVersion: getPublishedEntryVersion,
  publish: publishEntry,
  unpublish: unpublishEntry
};

export { Entries };
