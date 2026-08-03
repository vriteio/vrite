const MAX_CONTENT_NAME_LENGTH = 300;

const normalizeEntryName = (name: string) => name.trim() || "Untitled";
const normalizeCollectionName = (name: string) => name.trim();

export { MAX_CONTENT_NAME_LENGTH, normalizeCollectionName, normalizeEntryName };
