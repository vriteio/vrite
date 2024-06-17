import { Extension, onChangePayload, onDisconnectPayload } from "@hocuspocus/server";
import {
  createOutputContentProcessor,
  docToJSON,
  getContentPieceVariantsCollection,
  getContentPiecesCollection,
  getGitDataCollection,
  jsonToBuffer,
  publishGitDataEvent,
  useGitProvider
} from "@vrite/backend";
import { FastifyInstance } from "fastify";
import { ObjectId } from "mongodb";
import crypto from "node:crypto";

interface Configuration {
  debounce: number | false | null;
  debounceMaxWait: number;
}

class GitSync implements Extension {
  private configuration: Configuration = {
    debounce: 2500,
    debounceMaxWait: 10000
  };

  private fastify: FastifyInstance;

  private gitDataCollection: ReturnType<typeof getGitDataCollection>;

  private contentPiecesCollection: ReturnType<typeof getContentPiecesCollection>;

  private contentPieceVariantsCollection: ReturnType<typeof getContentPieceVariantsCollection>;

  private debounced: Map<string, { timeout: NodeJS.Timeout; start: number }> = new Map();

  public constructor(fastify: FastifyInstance, configuration?: Partial<Configuration>) {
    this.fastify = fastify;
    this.configuration = {
      ...this.configuration,
      ...configuration
    };
    this.gitDataCollection = getGitDataCollection(fastify.mongo.db!);
    this.contentPiecesCollection = getContentPiecesCollection(fastify.mongo.db!);
    this.contentPieceVariantsCollection = getContentPieceVariantsCollection(fastify.mongo.db!);
  }

  public async onDisconnect({
    documentName,
    document,
    context
  }: onDisconnectPayload): Promise<any> {
    return this.debounceUpdate({ documentName, document, context });
  }

  public async onChange({ documentName, document, context }: onChangePayload): Promise<void> {
    return this.debounceUpdate({ documentName, document, context });
  }

  private debounceUpdate({
    documentName,
    context,
    document
  }: Pick<onChangePayload, "documentName" | "document" | "context">): void {
    if (documentName.startsWith("workspace:") || documentName.startsWith("snippet:")) return;

    const [contentPieceId, variantId = null] = documentName.split(":");
    const update = (): void => {
      this.updateGitRecord(contentPieceId, variantId, {
        context,
        document
      });
    };

    this.debounce(documentName, update);
  }

  private async updateGitRecord(
    contentPieceId: string,
    variantId: string | null,
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
    const gitData = await this.gitDataCollection.findOne({
      workspaceId: new ObjectId(`${details.context.workspaceId}`)
    });
    const gitProvider = useGitProvider(ctx, gitData);

    if (!gitData || !gitProvider) return;

    const contentPiece = await this.contentPiecesCollection.findOne({
      _id: new ObjectId(contentPieceId),
      workspaceId: new ObjectId(`${details.context.workspaceId}`)
    });

    if (!contentPiece) return;

    const json = docToJSON(details.document);
    const outputContentProcessor = await createOutputContentProcessor(
      ctx,
      gitProvider.data.transformer
    );
    const output = await outputContentProcessor.process({
      buffer: jsonToBuffer(json),
      contentPiece
    });
    const currentHash = crypto.createHash("md5").update(output).digest("hex");

    await this.gitDataCollection.updateOne(
      {
        "workspaceId": new ObjectId(details.context.workspaceId),
        "records.contentPieceId": new ObjectId(contentPieceId)
      },
      {
        $set: {
          "records.$.currentHash": currentHash
        }
      }
    );
    publishGitDataEvent({ fastify: this.fastify }, `${details.context.workspaceId}`, {
      action: "update",
      data: {
        records: gitData.records.map((record: any) => {
          if (record.contentPieceId.toString() === contentPieceId) {
            return {
              ...record,
              currentHash
            };
          }

          return record;
        })
      }
    });
  }

  private debounce(id: string, func: Function): void {
    const old = this.debounced.get(id);
    const start = old?.start || Date.now();
    const run = (): void => {
      this.debounced.delete(id);
      func();
    };

    if (old?.timeout) clearTimeout(old.timeout);
    if (Date.now() - start >= this.configuration.debounceMaxWait) return run();

    this.debounced.set(id, {
      start,
      timeout: setTimeout(run, this.configuration.debounce as number)
    });
  }
}

export { GitSync };
