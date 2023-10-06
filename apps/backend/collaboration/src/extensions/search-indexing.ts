import { Extension, onChangePayload, onDisconnectPayload } from "@hocuspocus/server";
import { docToBuffer, getContentPiecesCollection } from "@vrite/backend";
import { FastifyInstance } from "fastify";
import { ObjectId } from "mongodb";

interface Configuration {
  debounce: number | false | null;
  debounceMaxWait: number;
}
class SearchIndexing implements Extension {
  private configuration: Configuration = {
    debounce: 15000,
    debounceMaxWait: 60000
  };

  private fastify: FastifyInstance;

  private contentPiecesCollection: ReturnType<typeof getContentPiecesCollection>;

  private debounced: Map<string, { timeout: NodeJS.Timeout; start: number }> = new Map();

  public constructor(fastify: FastifyInstance, configuration?: Partial<Configuration>) {
    this.fastify = fastify;
    this.configuration = {
      ...this.configuration,
      ...configuration
    };
    this.contentPiecesCollection = getContentPiecesCollection(fastify.mongo.db!);
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
    document,
    context
  }: Pick<onChangePayload, "documentName" | "document" | "context">): void {
    if (documentName.startsWith("workspace:")) return;

    const [contentPieceId, variantId] = documentName.split(":");
    const state = docToBuffer(document);
    const update = (): void => {
      this.upsertSearchContent(contentPieceId, {
        workspaceId: context.workspaceId,
        contentBuffer: state,
        variantId
      });
    };

    this.debounce(documentName, update);
  }

  private async upsertSearchContent(
    contentPieceId: string,
    details: {
      contentBuffer: Buffer;
      workspaceId: string;
      variantId?: string;
    }
  ): Promise<void> {
    if (!this.fastify.hostConfig.search) return;

    const contentPiece = await this.contentPiecesCollection.findOne({
      _id: new ObjectId(contentPieceId),
      workspaceId: new ObjectId(details.workspaceId)
    });

    await this.fastify.search.upsertContent({
      contentPiece,
      content: details.contentBuffer,
      variantId: details.variantId
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

export { SearchIndexing };
