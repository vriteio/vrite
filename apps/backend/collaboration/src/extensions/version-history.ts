import { Extension, onChangePayload } from "@hocuspocus/server";
import {
  docToJSON,
  getContentVersionsCollection,
  getVersionsCollection,
  jsonToBuffer,
  publishVersionEvent,
  fetchEntryMembers,
  DocJSON
} from "@vrite/backend";
import { FastifyInstance } from "fastify";
import { Binary, ObjectId } from "mongodb";
import dayjs from "dayjs";

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

  public async onChange({ documentName, document, context }: onChangePayload): Promise<void> {
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

      this.createVersion({
        contentPieceId,
        variantId,
        members: debouncedData?.members || [],
        json: docToJSON(document),
        userId: `${context.userId}`,
        workspaceId: `${context.workspaceId}`
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

  private async createVersion(details: {
    contentPieceId: string;
    workspaceId: string;
    userId: string;
    variantId: string | null;
    members: string[];
    json: DocJSON;
  }): Promise<void> {
    const [previousVersionContent] = await this.contentVersionsCollection
      .find({
        contentPieceId: new ObjectId(details.contentPieceId),
        variantId: details.variantId ? new ObjectId(details.variantId) : null
      })
      .sort({ _id: -1 })
      .limit(1)
      .toArray();
    const ctx = {
      db: this.fastify.mongo.db!,
      auth: {
        workspaceId: new ObjectId(`${details.workspaceId}`),
        userId: new ObjectId(`${details.userId}`)
      }
    };
    const buffer = jsonToBuffer(details.json);

    if (previousVersionContent && buffer.equals(previousVersionContent.content.buffer)) {
      return;
    }

    const versionId = new ObjectId();
    const date = new Date();
    const version = {
      _id: versionId,
      date,
      contentPieceId: new ObjectId(details.contentPieceId),
      ...(details.variantId ? { variantId: new ObjectId(details.variantId) } : {}),
      members: details.members.map((id) => new ObjectId(id)),
      workspaceId: ctx.auth.workspaceId,
      expiresAt: dayjs(date).add(31, "days").toDate()
    };

    await this.versionsCollection.insertOne(version);
    await this.contentVersionsCollection.insertOne({
      _id: new ObjectId(),
      contentPieceId: new ObjectId(details.contentPieceId),
      versionId,
      ...(details.variantId ? { variantId: new ObjectId(details.variantId) } : {}),
      content: new Binary(buffer),
      expiresAt: dayjs(date).add(31, "days").toDate()
    });
    publishVersionEvent({ fastify: this.fastify }, `${details.workspaceId}`, {
      action: "create",
      userId: `${details.userId}`,
      data: {
        id: `${versionId}`,
        date: date.toISOString(),
        contentPieceId: `${details.contentPieceId}`,
        variantId: details.variantId ? `${details.variantId}` : null,
        members: await fetchEntryMembers(ctx.db, version),
        workspaceId: `${ctx.auth.workspaceId}`,
        expiresAt: version.expiresAt?.toISOString()
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
