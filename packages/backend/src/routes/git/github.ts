import { z } from "zod";
import { LexoRank } from "lexorank";
import { Binary } from "mongodb";
import { marked } from "marked";
import crypto from "node:crypto";
import { isAuthenticated, isAuthenticatedUser } from "#lib/middleware";
import { procedure, router } from "#lib/trpc";
import * as errors from "#lib/errors";
import {
  FullContentGroup,
  FullContentPiece,
  FullContents,
  GitRecord,
  getContentGroupsCollection,
  getContentPiecesCollection,
  getContentsCollection,
  getGitDataCollection,
  getWorkspacesCollection,
  githubData
} from "#database";
import { ObjectId, UnderscoreID, htmlToJSON, jsonToBuffer } from "#lib";

const authenticatedProcedure = procedure.use(isAuthenticated);
const githubRouter = router({
  configure: authenticatedProcedure
    .input(githubData)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      const gitDataCollection = getGitDataCollection(ctx.db);
      const { matchedCount } = await gitDataCollection.updateOne(
        { workspaceId: ctx.auth.workspaceId },
        { $set: { github: input } },
        { upsert: true }
      );

      if (!matchedCount) throw errors.notFound("gitData");
    }),
  sync: authenticatedProcedure
    .input(z.void())
    .output(z.any())
    .mutation(async ({ ctx }) => {
      const gitDataCollection = getGitDataCollection(ctx.db);
      const contentGroupsCollection = getContentGroupsCollection(ctx.db);
      const contentPiecesCollection = getContentPiecesCollection(ctx.db);
      const contentsCollection = getContentsCollection(ctx.db);
      const workspaceCollection = getWorkspacesCollection(ctx.db);
      const gitData = await gitDataCollection.findOne({ workspaceId: ctx.auth.workspaceId });

      if (!gitData?.github) throw errors.notFound("gitData");

      const newContentGroups: UnderscoreID<FullContentGroup<ObjectId>>[] = [];
      const newContentPieces: UnderscoreID<FullContentPiece<ObjectId>>[] = [];
      const newContents: UnderscoreID<FullContents<ObjectId>>[] = [];
      const newRecords: Array<GitRecord<ObjectId>> = [];
      const octokit = await ctx.fastify.github.getInstallationOctokit(
        gitData?.github.installationId
      );
      const getDirectoryEntries = async (
        path: string
      ): Promise<
        Array<{
          name: string;
          type: "blob" | "tree";
          object: {
            text: string | null;
          };
        }>
      > => {
        const { repository } = await octokit.graphql<{
          repository: {
            object: {
              entries: Array<{
                name: string;
                type: "blob" | "tree";
                object: {
                  text: string | null;
                };
              }>;
            };
          };
        }>(
          `query ($owner: String!, $name: String!, $expr: String!) {
            repository(owner: $owner, name: $name) {
              object(expression: $expr) {
                ... on Tree {
                  entries {
                    name
                    type
                    object {
                      ... on Blob {
                        text
                      }
                    }
                  }
                }
              }
            }
          }`,
          {
            owner: gitData.github.repositoryOwner,
            name: gitData.github.repositoryName,
            expr: `${gitData.github.branchName}:${path.startsWith("/") ? path.slice(1) : path}`
          }
        );

        return repository?.object?.entries || [];
      };

      marked.use({
        renderer: {
          paragraph(text) {
            if (text.startsWith("<img")) {
              return `${text}\n`;
            }

            return `<p>${text}</p>`;
          },
          image(href, _title, text) {
            const link = (href || "").replace(
              /^(?:\[.*\]\((.*)\))|(?:(.*))$/,
              (_match, p1, p2) => p1 || p2
            );

            return `<img src="${link}" alt="${text}">`;
          },
          listitem(text, task, checked) {
            return `<li${task ? ` data-type="taskItem"` : ""}${
              checked ? ` data-checked="true"` : ""
            }>${text.replace(/<br><(img|p|pre|blockquote|ul|ol|table)\s/g, "<$1 ")}</li>`;
          },
          list(body, ordered, start) {
            const type = ordered ? "ol" : "ul";
            const startAt = ordered && start !== 1 ? ` start="${start}"` : "";
            const dataType = body.includes(`data-type="taskItem"`) ? ` data-type="taskList"` : "";

            return `<${type}${startAt}${dataType}>${body}</${type}>\n`;
          }
        }
      });

      const syncDirectory = async (path: string, ancestors: ObjectId[]): Promise<ObjectId> => {
        const entries = await getDirectoryEntries(path);
        const name = path.split("/").pop() || "base";
        const contentGroupId = new ObjectId();
        const descendants: ObjectId[] = [];

        let order = LexoRank.min();

        for await (const entry of entries) {
          if (entry.type === "tree") {
            const id = await syncDirectory(`${path}/${entry.name}`, [...ancestors, contentGroupId]);

            descendants.push(id);
          } else if (entry.type === "blob" && entry.object.text) {
            const contentPiece: UnderscoreID<FullContentPiece<ObjectId>> = {
              _id: new ObjectId(),
              workspaceId: ctx.auth.workspaceId,
              contentGroupId,
              members: [],
              slug: entry.name,
              tags: [],
              title: entry.name,
              order: order.toString()
            };

            order = order.genNext();
            newContentPieces.push(contentPiece);
            newContents.push({
              _id: new ObjectId(),
              contentPieceId: contentPiece._id,
              workspaceId: ctx.auth.workspaceId,
              content: new Binary(
                jsonToBuffer(
                  htmlToJSON(
                    marked.parse(entry.object.text || "", {
                      mangle: false,
                      headerIds: false,
                      breaks: true,
                      gfm: true
                    })
                  )
                )
              )
            });

            const currentHash = crypto.createHash("md5").update(entry.object.text).digest("hex");

            newRecords.push({
              contentPieceId: contentPiece._id,
              currentHash,
              syncedHash: currentHash,
              path: `${path}/${entry.name}`
            });
          }
        }

        const contentGroup: UnderscoreID<FullContentGroup<ObjectId>> = {
          _id: contentGroupId,
          workspaceId: ctx.auth.workspaceId,
          name,
          ancestors,
          descendants
        };

        newContentGroups.push(contentGroup);

        return contentGroup._id;
      };
      const id = await syncDirectory("", []);

      await contentGroupsCollection.insertMany(newContentGroups);
      await contentPiecesCollection.insertMany(newContentPieces);
      await contentsCollection.insertMany(newContents);
      await gitDataCollection.updateOne(
        { workspaceId: ctx.auth.workspaceId },
        {
          $set: {
            records: newRecords
          }
        }
      );
      await workspaceCollection.updateOne(
        { _id: ctx.auth.workspaceId },
        {
          $push: { contentGroups: id }
        }
      );

      return { synced: true };
    }),
  commit: authenticatedProcedure
    .input(z.void())
    .output(z.any())
    .mutation(async ({ ctx }) => {
      const gitDataCollection = getGitDataCollection(ctx.db);
      const contentGroupsCollection = getContentGroupsCollection(ctx.db);
      const contentPiecesCollection = getContentPiecesCollection(ctx.db);
      const contentsCollection = getContentsCollection(ctx.db);
      const workspaceCollection = getWorkspacesCollection(ctx.db);
      const gitData = await gitDataCollection.findOne({ workspaceId: ctx.auth.workspaceId });

      if (!gitData?.github) throw errors.notFound("gitData");

      const octokit = await ctx.fastify.github.getInstallationOctokit(
        gitData?.github.installationId
      );

      return octokit.graphql(
        `mutation ($input: CreateCommitOnBranchInput!) {
        createCommitOnBranch(input: $input) {
          commit {
            oid
          }
        }
      }`,
        {
          input: {
            branch: {
              repositoryNameWithOwner: `${gitData.github.repositoryOwner}/${gitData.github.repositoryName}`,
              branchName: gitData.github.branchName
            },
            message: { headline: "Update from Vrite" }, // TODO: add commit message
            expectedHeadOid: "f4ff6078c47ed365595512662713c64a4e513e89", // oid of the last commit
            fileChanges: {
              additions: [
                {
                  path: "README.md",
                  // TODO: add content (base64 encoded)
                  contents: "IyBIZWxsbyBXb3JsZCBmcm9tIFZyaXRl"
                },
                { path: "vrite.md", contents: "IyBIZWxsbyBXb3JsZCBmcm9tIFZyaXRl" }
              ],
              deletions: []
            }
          }
        }
      );
    })
});

export { githubRouter };

/*

query ($owner: String!, $name: String!, $branch: String!, $since:GitTimestamp!) {
  rateLimit {
    cost
  }
  repository(owner: $owner, name: $name) {
    object(expression: $branch) {
      ... on Commit {
        history(first: 100, since: $since) {
          nodes {
            id
            oid
            messageHeadline
            message
            committedDate
            authoredDate
            pushedDate
            url
            author {
              name
              email
              user {
                login
              }
            }
            history(first: 0) {
              totalCount
            }
          }
        }
      }
    }
  }
}
*/
