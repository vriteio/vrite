import {
  hashContentDocument,
  replaceContentDocument,
  serializeContentDocument,
  type ContentNode
} from "#backend/lib/content";
import { applyUpdate, Doc, encodeStateAsUpdate } from "yjs";
import type { SchemaDefinition } from "../contract";
import { migrateContentToSchema, type SchemaContentDefaultMode } from "./content";

interface MigrateSchemaContentStateInput {
  defaultMode?: SchemaContentDefaultMode;
  document: ContentNode;
  schema: SchemaDefinition;
  state: Buffer | null;
}
interface MigratedSchemaContentState {
  changed: boolean;
  contentLost: boolean;
  document: ContentNode;
  hash: string;
  previousDocument: ContentNode;
  previousHash: string;
  state: Buffer;
}
interface ReplacedContentState {
  document: ContentNode;
  state: Buffer;
}

const migrateSchemaContentState = (
  input: MigrateSchemaContentStateInput
): MigratedSchemaContentState => {
  const yDocument = new Doc();

  if (input.state) {
    applyUpdate(yDocument, new Uint8Array(input.state));
  } else {
    replaceContentDocument(yDocument, input.document);
  }

  const currentDocument = serializeContentDocument(yDocument);
  const migration = migrateContentToSchema({
    defaultMode: input.defaultMode,
    document: currentDocument,
    schema: input.schema
  });

  if (migration.changed) replaceContentDocument(yDocument, migration.document);

  const document = serializeContentDocument(yDocument);

  return {
    changed: migration.changed,
    contentLost: migration.contentLost,
    document,
    hash: hashContentDocument(document),
    previousDocument: currentDocument,
    previousHash: hashContentDocument(currentDocument),
    state: Buffer.from(encodeStateAsUpdate(yDocument))
  };
};
const replaceSchemaContentState = (
  state: Buffer | null,
  targetDocument: ContentNode
): ReplacedContentState => {
  const yDocument = new Doc();

  if (state) applyUpdate(yDocument, new Uint8Array(state));

  replaceContentDocument(yDocument, targetDocument);

  const document = serializeContentDocument(yDocument);

  return {
    document,
    state: Buffer.from(encodeStateAsUpdate(yDocument))
  };
};

export { migrateSchemaContentState, replaceSchemaContentState };
export type { MigrateSchemaContentStateInput, MigratedSchemaContentState, ReplacedContentState };
