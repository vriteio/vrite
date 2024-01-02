import { AuthenticatedContext } from "../../../lib/middleware";
import { UnderscoreID } from "../../../lib/mongo";
import { jsonToBuffer, htmlToJSON, bufferToJSON } from "../../../lib/content-processing";
import { InputContentProcessor, OutputContentProcessor } from "../types";
import {
  GenericJSONContentNode,
  gfmInputTransformer,
  gfmOutputTransformer,
  InputTransformer,
  OutputTransformer
} from "@vrite/sdk/transformers";
import { ObjectId } from "mongodb";
import * as prettier from "prettier/standalone";
import markdownPlugin from "prettier/plugins/markdown";
import htmlPlugin from "prettier/plugins/html";
import axios from "axios";
import crypto from "node:crypto";
import {
  FullGitData,
  getTransformersCollection,
  getWorkspaceSettingsCollection,
  Transformer
} from "#collections";

const extensionParserMap = {
  mdx: "mdx",
  html: "html",
  md: "markdown"
} as const;
const createInputContentProcessor = async (
  ctx: Pick<AuthenticatedContext, "db" | "auth">,
  gitData: UnderscoreID<FullGitData<ObjectId>>
): Promise<InputContentProcessor> => {
  const transformersCollection = getTransformersCollection(ctx.db);
  const transformer = gitData.github?.transformer || "markdown";

  let remoteTransformer: UnderscoreID<Transformer<ObjectId>> | null = null;

  if (transformer !== "markdown") {
    remoteTransformer = await transformersCollection.findOne({
      _id: new ObjectId(transformer),
      workspaceId: ctx.auth.workspaceId
    });
  }

  const transformInputContent = async (
    input: string[]
  ): Promise<Array<ReturnType<InputTransformer>>> => {
    const output: Array<ReturnType<InputTransformer>> = [];

    if (transformer === "markdown" && !remoteTransformer) {
      input.forEach((content) => {
        output.push(gfmInputTransformer(content));
      });
    } else if (remoteTransformer) {
      const maxBatchSize = remoteTransformer.maxBatchSize || 1;
      const batches: Array<string[]> = [];

      for (let i = 0; i < input.length; i += maxBatchSize) {
        batches.push(input.slice(i, i + maxBatchSize));
      }

      for await (const batch of batches) {
        const { data } = await axios.post(
          `${remoteTransformer.input}`,
          { data: batch },
          {
            headers: {
              "Content-Type": "application/json"
            }
          }
        );

        output.push(...data);
      }
    }

    return output;
  };

  return {
    async processBatch(inputContents) {
      const transformed = await transformInputContent(inputContents);

      return inputContents.map((inputContent, index) => {
        const { content, contentPiece } = transformed[index];
        const buffer = jsonToBuffer(htmlToJSON(content || "<p></p>"));
        const metadata = contentPiece || {};
        const contentHash = crypto.createHash("md5").update(inputContent).digest("hex");

        return {
          buffer,
          metadata,
          contentHash
        };
      });
    },
    async process(inputContent) {
      const [{ content, contentPiece }] = await transformInputContent([inputContent]);
      const buffer = jsonToBuffer(htmlToJSON(content || "<p></p>"));
      const metadata = contentPiece || {};
      const contentHash = crypto.createHash("md5").update(inputContent).digest("hex");

      return {
        buffer,
        metadata,
        contentHash
      };
    }
  };
};
const createOutputContentProcessor = async (
  ctx: Pick<AuthenticatedContext, "db" | "auth">,
  gitData: UnderscoreID<FullGitData<ObjectId>>
): Promise<OutputContentProcessor> => {
  const transformersCollection = getTransformersCollection(ctx.db);
  const transformer = gitData.github?.transformer || "markdown";

  let remoteTransformer: UnderscoreID<Transformer<ObjectId>> | null = null;

  if (transformer !== "markdown") {
    remoteTransformer = await transformersCollection.findOne({
      _id: new ObjectId(transformer),
      workspaceId: ctx.auth.workspaceId
    });
  }

  const workspaceSettingsCollection = getWorkspaceSettingsCollection(ctx.db);
  const workspaceSettings = await workspaceSettingsCollection.findOne({
    workspaceId: ctx.auth.workspaceId
  });
  const prettierConfig = JSON.parse(workspaceSettings?.prettierConfig || "{}");
  const transformOutputContent = async (
    input: Array<{ content: GenericJSONContentNode; metadata: Parameters<OutputTransformer>[1] }>
  ): Promise<string[]> => {
    const output: string[] = [];

    if (transformer === "markdown" && !remoteTransformer) {
      for await (const { content, metadata } of input) {
        const result = gfmOutputTransformer(content, metadata);
        const extension = metadata?.filename?.split(".").pop();
        const parser =
          extensionParserMap[extension as keyof typeof extensionParserMap] || undefined;

        if (parser) {
          output.push(
            await prettier.format(result, {
              ...prettierConfig,
              plugins: [parser === "html" ? htmlPlugin : markdownPlugin],
              parser
            })
          );
        } else {
          output.push(result);
        }
      }
    } else if (remoteTransformer) {
      const maxBatchSize = remoteTransformer.maxBatchSize || 1;
      const batches: Array<
        Array<{
          content: GenericJSONContentNode;
          metadata: Parameters<OutputTransformer>[1];
        }>
      > = [];

      for (let i = 0; i < input.length; i += maxBatchSize) {
        batches.push(input.slice(i, i + maxBatchSize));
      }

      for await (const batch of batches) {
        const { data } = await axios.post(
          `${remoteTransformer.output}`,
          { data: batch },
          {
            headers: {
              "Content-Type": "application/json"
            }
          }
        );

        output.push(...data);
      }
    }

    return output;
  };

  return {
    async processBatch(input) {
      return await transformOutputContent(
        input.map(({ buffer, contentPiece }) => {
          return {
            content: bufferToJSON(buffer),
            metadata: {
              coverWidth: contentPiece.coverWidth || "100%",
              members: contentPiece.members.map((memberId) => `${memberId}`),
              tags: contentPiece.tags.map((tagId) => `${tagId}`),
              canonicalLink: contentPiece.canonicalLink || undefined,
              filename: contentPiece.filename || undefined,
              coverAlt: contentPiece.coverAlt || undefined,
              coverUrl: contentPiece.coverUrl || undefined,
              description: contentPiece.description || undefined,
              customData: contentPiece.customData,
              date: contentPiece.date?.toISOString(),
              title: contentPiece.title,
              slug: contentPiece.slug
            }
          };
        })
      );
    },
    async process({ buffer, contentPiece }) {
      const [output] = await transformOutputContent([
        {
          content: bufferToJSON(buffer),
          metadata: {
            coverWidth: contentPiece.coverWidth || "100%",
            members: contentPiece.members.map((memberId) => `${memberId}`),
            tags: contentPiece.tags.map((tagId) => `${tagId}`),
            canonicalLink: contentPiece.canonicalLink || undefined,
            filename: contentPiece.filename || undefined,
            coverAlt: contentPiece.coverAlt || undefined,
            coverUrl: contentPiece.coverUrl || undefined,
            description: contentPiece.description || undefined,
            customData: contentPiece.customData,
            date: contentPiece.date?.toISOString(),
            title: contentPiece.title,
            slug: contentPiece.slug
          }
        }
      ]);

      return output;
    }
  };
};

export { createInputContentProcessor, createOutputContentProcessor };
