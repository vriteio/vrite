import { __content } from "./content";
import { createContentSource } from "../../utils";
import { createClient, type ContentGroupWithSubtree } from "@vrite/sdk/api";
import type { ContentTreeBranch } from "vrite:pages";
import type { MarkdownHeading } from "astro";

const vrite = createContentSource<{
  accessToken: string;
  contentGroupId: string;
  baseURL?: string;
}>("vrite", ({ sourceConfig }) => {
  const client = createClient({
    token: sourceConfig.accessToken,
    baseURL: sourceConfig.baseURL
  });

  return {
    async getPageMetadata() {
      const workspace = await client.workspace.get();
      const title = workspace.name;
      const description = workspace.description || "";

      return {
        title,
        description
      };
    },
    async getContentTree() {
      const contentGroups = await client.contentGroups.list({
        ancestor: sourceConfig.contentGroupId,
        subtree: true
      });
      const extractIdsFromTreeLevel = (
        treeLevel: ContentGroupWithSubtree[],
        contentGroupIdsSet?: Set<string>
      ): string[] => {
        const contentGroupIds =
          contentGroupIdsSet || new Set<string>([sourceConfig.contentGroupId]);

        treeLevel.forEach((entry) => {
          contentGroupIds.add(entry.id);
          extractIdsFromTreeLevel(entry.descendants, contentGroupIds);
        });

        return [...contentGroupIds.values()];
      };
      const contentGroupIds = extractIdsFromTreeLevel(contentGroups);
      const contentPieces = await client.contentPieces.list({
        contentGroupId: `${contentGroupIds.join(",")}`,
        perPage: 0
      });
      const contentGroupToContentTree = (
        contentGroup: ContentGroupWithSubtree
      ): ContentTreeBranch => {
        return {
          branchName: contentGroup.name,
          contentMetadata: contentPieces
            .filter((piece) => piece.contentGroupId === contentGroup.id)
            .map((piece) => {
              return {
                title: piece.title || "",
                description: piece.description || "",
                date: piece.date || undefined,
                cover: piece.coverUrl || undefined,
                slug: piece.slug,
                tags: piece.tags.map((tag) => tag.label || ""),
                authors: piece.members.map((member) => ({
                  name: member.profile.fullName || member.profile.username,
                  avatar: member.profile.avatar
                }))
              };
            }),
          branches: contentGroup.descendants.map(contentGroupToContentTree)
        };
      };

      return {
        branches: contentGroups.map(contentGroupToContentTree),
        contentMetadata: contentGroupToContentTree({
          ancestors: [],
          descendants: [],
          id: sourceConfig.contentGroupId,
          name: ""
        }).contentMetadata
      };
    },
    async getContentMetadata(slug) {
      const [contentPiece] = await client.contentPieces.list({
        contentGroupId: sourceConfig.contentGroupId,
        slug,
        perPage: 1
      });

      return {
        title: contentPiece.title || "",
        description: contentPiece.description || "",
        date: contentPiece.date || undefined,
        cover: contentPiece.coverUrl || undefined,
        slug: contentPiece.slug,
        tags: contentPiece.tags.map((tag) => tag.label || ""),
        authors: contentPiece.members.map((member) => ({
          name: member.profile.fullName || member.profile.username,
          avatar: member.profile.avatar
        }))
      };
    },
    async renderContent(slug) {
      const [contentPiece] = await client.contentPieces.list({
        slug,
        perPage: 1,
        content: true
      });
      const headings: MarkdownHeading[] = [];

      if (contentPiece && contentPiece.content) {
        contentPiece.content.content?.map((node) => {
          if (node.type === "heading") {
            const text =
              node.content
                ?.map((textNode) => {
                  return textNode.text || "";
                })
                ?.join("") || "";

            headings.push({
              depth: Number(node.attrs?.level) || 1,
              slug: text.toLowerCase(),
              text
            });
          }
        });
      }

      (globalThis as any)[__content] = contentPiece?.content;

      const module = await import("./content.astro");
      const Content = module.default;

      return { Content, headings };
      // () => Content.default({ content: contentPiece.content });
    },
    async listContentMetadata(page, perPage = 50) {
      const contentPieces = await client.contentPieces.list({
        perPage,
        page: page === "all" ? 0 : page,
        contentGroupId: sourceConfig.contentGroupId
      });

      return {
        contentMetadata: contentPieces.map((contentPiece) => {
          return {
            title: contentPiece.title || "",
            description: contentPiece.description || "",
            date: contentPiece.date || undefined,
            cover: contentPiece.coverUrl || undefined,
            slug: contentPiece.slug,
            tags: contentPiece.tags.map((tag) => tag.label || ""),
            authors: contentPiece.members.map((member) => ({
              name: member.profile.fullName || member.profile.username,
              avatar: member.profile.avatar
            }))
          };
        }),
        totalPages: contentPieces.meta.pagination.pages
      };
    }
  };
});

export { vrite };
