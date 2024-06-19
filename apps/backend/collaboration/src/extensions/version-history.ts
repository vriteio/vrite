import { Extension, onChangePayload } from "@hocuspocus/server";
import {
  docToJSON,
  getContentVersionsCollection,
  getVersionsCollection,
  jsonToBuffer,
  publishVersionEvent,
  fetchEntryMembers
} from "@vrite/backend";
import { FastifyInstance } from "fastify";
import { Binary, ObjectId } from "mongodb";

interface Configuration {
  debounce: number | false | null;
}

class VersionHistory implements Extension {
  private configuration: Configuration = {
    debounce: 45000
  };

  private fastify: FastifyInstance;

  private versionsCollection: ReturnType<typeof getVersionsCollection>;

  private contentVersionsCollection: ReturnType<typeof getContentVersionsCollection>;

  private debounced: Map<string, { timeout: NodeJS.Timeout; start: number; members: string[] }> =
    new Map();

  public constructor(fastify: FastifyInstance, configuration?: Partial<Configuration>) {
    this.fastify = fastify;
    this.configuration = {
      ...this.configuration,
      ...configuration
    };
    this.versionsCollection = getVersionsCollection(fastify.mongo.db!);
    this.contentVersionsCollection = getContentVersionsCollection(fastify.mongo.db!);
  }

  public async onChange({
    documentName,
    document,
    context,
    update,
    ...x
  }: onChangePayload): Promise<void> {
    return this.debounceUpdate({ documentName, document, context });
  }

  private debounceUpdate({
    documentName,
    context,
    document
  }: Pick<onChangePayload, "documentName" | "document" | "context">): void {
    if (
      documentName.startsWith("workspace:") ||
      documentName.startsWith("snippet:") ||
      documentName.startsWith("version:")
    ) {
      return;
    }

    const [contentPieceId, variantId = null] = documentName.split(":");
    const update = (): void => {
      const debouncedData = this.debounced.get(documentName);

      this.createVersion(contentPieceId, variantId, debouncedData?.members || [], {
        context,
        document
      });
    };

    this.debounce(
      documentName,
      update,
      [...document.awareness.getStates().values()]
        .map((state) => state.user.membershipId)
        .filter(Boolean)
    );
  }

  private async createVersion(
    contentPieceId: string,
    variantId: string | null,
    members: string[],
    details: Pick<onChangePayload, "context" | "document">
  ): Promise<void> {
    if (variantId) return;

    const ctx = {
      db: this.fastify.mongo.db!,
      auth: {
        workspaceId: new ObjectId(`${details.context.workspaceId}`),
        userId: new ObjectId(`${details.context.userId}`)
      }
    };
    const json = docToJSON(details.document);
    const buffer = jsonToBuffer(json);
    const versionId = new ObjectId();
    const date = new Date();
    const version = {
      _id: versionId,
      date,
      contentPieceId: new ObjectId(contentPieceId),
      ...(variantId ? { variantId: new ObjectId(variantId) } : {}),
      members: members.map((id) => new ObjectId(id)),
      workspaceId: ctx.auth.workspaceId
    };

    await this.versionsCollection.insertOne(version);
    await this.contentVersionsCollection.insertOne({
      _id: new ObjectId(),
      contentPieceId: new ObjectId(contentPieceId),
      versionId,
      ...(variantId ? { variantId: new ObjectId(variantId) } : {}),
      content: new Binary(buffer)
    });
    publishVersionEvent({ fastify: this.fastify }, `${details.context.workspaceId}`, {
      action: "create",
      userId: `${details.context.userId}`,
      data: {
        id: `${versionId}`,
        date: date.toISOString(),
        contentPieceId: `${contentPieceId}`,
        variantId: variantId ? `${variantId}` : null,
        members: await fetchEntryMembers(ctx.db, version),
        workspaceId: `${ctx.auth.workspaceId}`
      }
    });
  }

  private debounce(id: string, func: Function, members: string[]): void {
    const old = this.debounced.get(id);
    const start = old?.start || Date.now();
    const run = (): void => {
      func();
      this.debounced.delete(id);
    };

    if (old?.timeout) clearTimeout(old.timeout);

    this.debounced.set(id, {
      start,
      timeout: setTimeout(run, this.configuration.debounce as number),
      members: [...new Set([...(old?.members || []), ...members])]
    });
  }
}

export { VersionHistory };
