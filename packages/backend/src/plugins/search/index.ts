import { deleteContent } from "./content/delete";
import { SearchContentHandlerData, WhereOperand } from "./utils";
import { upsertContent } from "./content/upsert";
import { bulkUpsertContent } from "./content/bulk-upsert";
import weaviate, { FusionType, WeaviateClient } from "weaviate-ts-client";
import { FastifyInstance, RouteCallbackHandler, SearchService } from "fastify";
import { OpenAI } from "openai";
import { Stream } from "openai/streaming";
import { ChatCompletionChunk } from "openai/resources/chat";
import { ObjectId } from "mongodb";
import { createPlugin } from "#lib/plugin";
import { getContentGroupsCollection, getContentPiecesCollection } from "#collections";

interface RawSearchResult {
  data: {
    Get: {
      Content: Array<{
        content: string;
        type: "content" | "description";
        breadcrumb: string[];
        contentPieceId: string;
        contentGroupIds: string[];
        _additional: { id: string; score: number };
      }>;
    };
  };
}

declare module "fastify" {
  interface SearchService {
    content: {
      bulkUpsert(data: SearchContentHandlerData<typeof bulkUpsertContent>): Promise<void>;
      upsert(data: SearchContentHandlerData<typeof upsertContent>): Promise<void>;
      delete(data: SearchContentHandlerData<typeof deleteContent>): Promise<void>;
    };
    createTenant(workspaceId: ObjectId | string): Promise<void>;
    deleteTenant(workspaceId: ObjectId | string): Promise<void>;
    search(details: {
      query: string;
      workspaceId: ObjectId | string;
      byTitle?: boolean;
      contentPieceId?: ObjectId | string;
      variantId?: ObjectId | string;
      contentGroupId?: ObjectId | string;
      limit?: number;
    }): Promise<RawSearchResult>;
    ask(details: {
      question: string;
      workspaceId: ObjectId | string;
      variantId?: ObjectId | string;
      contentGroupId?: ObjectId | string;
      contentPieceId?: ObjectId | string;
    }): Promise<Stream<ChatCompletionChunk> | null>;
  }
  interface FastifyInstance {
    search: SearchService;
  }
}

const createSchema = async (fastify: FastifyInstance, client: WeaviateClient): Promise<void> => {
  try {
    await client.schema
      .classCreator()
      .withClass({
        class: "Content",
        multiTenancyConfig: { enabled: true },
        invertedIndexConfig: {
          indexPropertyLength: true
        },
        properties: [
          {
            name: "content",
            dataType: ["text"],
            indexFilterable: false
          },
          {
            name: "breadcrumb",
            dataType: ["text[]"]
          },
          {
            name: "contentPieceId",
            dataType: ["text"],
            moduleConfig: {
              "text2vec-openai": {
                skip: true
              }
            },
            indexSearchable: false
          },
          {
            name: "contentGroupIds",
            dataType: ["text[]"],
            moduleConfig: {
              "text2vec-openai": {
                skip: true
              }
            },
            indexSearchable: false
          },
          {
            name: "variantId",
            dataType: ["text"],
            moduleConfig: {
              "text2vec-openai": {
                skip: true
              }
            },
            indexSearchable: false
          },
          {
            name: "type",
            dataType: ["text"],
            moduleConfig: {
              "text2vec-openai": {
                skip: true
              }
            },
            indexSearchable: false
          }
        ]
      })
      .do();
  } catch (error) {
    fastify.log.error("Search Error:", error);
  }
};
const registerSearch = async (fastify: FastifyInstance): Promise<void> => {
  const url = new URL(fastify.config.WEAVIATE_URL || "");
  const client = weaviate.client({
    scheme: url.protocol.replace(":", "") as "http" | "https",
    host: url.host,
    apiKey: new weaviate.ApiKey(fastify.config.WEAVIATE_API_KEY || ""),
    headers: {
      "X-OpenAI-Api-Key": fastify.config.OPENAI_API_KEY || ""
    }
  });

  createSchema(fastify, client);
  fastify.decorate("search", {
    async createTenant(workspaceId: ObjectId) {
      await client.schema.tenantsCreator("Content", [{ name: `${workspaceId}` }]).do();
    },
    async deleteTenant(workspaceId: ObjectId) {
      await client.schema.tenantsDeleter("Content", [`${workspaceId}`]).do();
    },
    async search(details) {
      let getter = client.graphql
        .get()
        .withClassName("Content")
        .withTenant(`${details.workspaceId}`)
        .withHybrid({
          query: details.query,
          properties: details.byTitle ? ["breadcrumb"] : ["breadcrumb^2", "content"],
          fusionType: FusionType.relativeScoreFusion,
          alpha: 0.4
        })
        .withAutocut(2);

      const operands: WhereOperand[] = [];

      if (details.contentPieceId) {
        operands.push({
          path: ["contentPieceId"],
          operator: "Equal",
          valueText: `${details.contentPieceId}`
        });
      }

      if (details.contentGroupId) {
        operands.push({
          path: ["contentGroupIds"],
          operator: "ContainsAny",
          valueTextArray: [`${details.contentGroupId}`]
        });
      }

      operands.push({
        path: ["type"],
        operator: "Equal",
        valueText: details.byTitle ? "description" : "content"
      });
      operands.push({
        path: ["variantId"],
        operator: "Equal",
        valueText: `${details.variantId || "base"}`
      });

      if (operands.length) {
        getter = getter.withWhere({ operator: "And", operands });
      }

      try {
        return await getter
          .withLimit(details.limit || 10)
          .withFields("content breadcrumb contentPieceId contentGroupIds _additional { score }")
          .do();
      } catch (e) {
        return {
          data: {
            Get: {
              Content: []
            }
          }
        };
      }
    },
    async ask(details) {
      const results = await this.search({
        query: details.question,
        workspaceId: details.workspaceId,
        variantId: details.variantId,
        contentGroupId: details.contentGroupId,
        contentPieceId: details.contentPieceId,
        limit: 8
      });
      const openai = new OpenAI({
        apiKey: fastify.config.OPENAI_API_KEY,
        organization: fastify.config.OPENAI_ORGANIZATION
      });
      const stringifiedResults = results.data.Get.Content.map(({ content, breadcrumb }) => {
        return `${breadcrumb?.join(" > ") || ""}:\n${content}`;
      });

      let contentLength = stringifiedResults.join("\n\n").length;

      while (contentLength > 12288) {
        stringifiedResults.pop();
        contentLength = stringifiedResults.join("\n\n").length;
      }

      return await openai.chat.completions.create({
        model: "gpt-4o",
        stream: true,
        messages: [
          {
            role: "user",
            content: `Please answer the question according to the above context.

          ===
          Context: ${stringifiedResults.join("\n\n")}
          ===
          Q: ${details.question}
          A:`
          }
        ]
      });
    },
    content: {
      async upsert(details) {
        await upsertContent(fastify, client, details);
      },
      async bulkUpsert(details) {
        await bulkUpsertContent(fastify, client, details);
      },
      async delete(details) {
        await deleteContent(fastify, client, details);
      }
    }
  } as SearchService);
};
const registerStub = (fastify: FastifyInstance): void => {
  fastify.decorate("search", {
    createTenant: () => Promise.resolve(),
    deleteTenant: () => Promise.resolve(),
    content: {
      upsert: () => Promise.resolve(),
      bulkUpsert: () => Promise.resolve(),
      delete: () => Promise.resolve()
    },
    async search() {
      return {
        data: {
          Get: {
            Content: []
          }
        }
      };
    },
    async ask() {
      return null;
    }
  });
};
const searchPlugin = createPlugin(async (fastify) => {
  if (fastify.hostConfig.search) {
    await registerSearch(fastify);

    const handleContentGroupMoved: RouteCallbackHandler<
      "contentGroups.update" | "contentGroups.move"
    > = async (ctx, data) => {
      if (
        `${data.contentGroup.ancestors.at(-1)}` === `${data.updatedContentGroup.ancestors.at(-1)}`
      ) {
        return;
      }

      const contentGroupsCollection = getContentGroupsCollection(ctx.db);
      const contentPiecesCollection = getContentPiecesCollection(ctx.db);
      const nestedContentGroups = await contentGroupsCollection
        .find({
          ancestors: data.contentGroup._id
        })
        .toArray();
      const contentGroups = [data.contentGroup, ...nestedContentGroups];
      const contentPieces = await contentPiecesCollection
        .find({
          contentGroupId: {
            $in: contentGroups.map(({ _id }) => _id)
          }
        })
        .toArray();

      ctx.fastify.search.content.bulkUpsert({
        entries: contentPieces.map((contentPiece) => ({
          contentPiece,
          contentGroup: contentGroups.find(({ _id }) => _id.equals(contentPiece.contentGroupId))
        })),
        workspaceId: ctx.auth.workspaceId
      });
    };

    fastify.routeCallbacks.register("contentGroups.move", handleContentGroupMoved);
    fastify.routeCallbacks.register("contentGroups.update", handleContentGroupMoved);
    fastify.routeCallbacks.register("contentPieces.move", (ctx, data) => {
      ctx.fastify.search.content.upsert({
        contentPiece: data.updatedContentPiece,
        contentGroup: data.contentGroup,
        workspaceId: ctx.auth.workspaceId
      });
    });
    fastify.routeCallbacks.register("contentPieces.create", async (ctx, data) => {
      ctx.fastify.search.content.upsert({
        contentPiece: data.contentPiece,
        contentGroup: data.contentGroup,
        content: data.contentBuffer,
        workspaceId: ctx.auth.workspaceId
      });
    });
    fastify.routeCallbacks.register("contentPieces.delete", async (ctx, data) => {
      ctx.fastify.search.content.delete({
        contentPieceId: data.contentPiece._id,
        workspaceId: ctx.auth.workspaceId
      });
    });
    fastify.routeCallbacks.register("contentPieces.update", async (ctx, data) => {
      ctx.fastify.search.content.upsert({
        contentPiece: data.updatedContentPiece,
        variantId: data.variantId || undefined,
        content: data.contentBuffer || undefined,
        workspaceId: ctx.auth.workspaceId
      });
    });
    fastify.routeCallbacks.register("contentGroups.delete", async (ctx, data) => {
      ctx.fastify.search.content.delete({
        contentGroupId: data.contentGroup._id,
        workspaceId: ctx.auth.workspaceId
      });
    });
    fastify.routeCallbacks.register("variants.delete", async (ctx, data) => {
      ctx.fastify.search.content.delete({
        variantId: data.variantId,
        workspaceId: ctx.auth.workspaceId
      });
    });
  } else {
    registerStub(fastify);
  }
});

export { searchPlugin };
