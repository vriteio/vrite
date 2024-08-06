import { __content } from "./content";
import { createContentSource } from "../../utils";
import { createClient, type ContentGroupWithSubtree } from "@vrite/sdk/api";
import type { ContentMetadata, ContentTreeBranch } from "vrite:pages";
import type { MarkdownHeading } from "astro";

type VriteContentSourceGroup = {
  contentGroupId: string;
  data?: Record<string, any>;
};
type BaseVriteContentSourceConfig = {
  accessToken: string;
  baseURL?: string;
};

const vrite = createContentSource<
  | (BaseVriteContentSourceConfig & VriteContentSourceGroup)
  | (BaseVriteContentSourceConfig & { groups: Record<string, VriteContentSourceGroup> })
>("vrite", ({ sourceConfig }) => {
  const client = createClient({
    token: sourceConfig.accessToken,
    baseURL: sourceConfig.baseURL
  });
  const getGroup = (groupName?: string): VriteContentSourceGroup | null => {
    if (groupName && "groups" in sourceConfig) {
      return sourceConfig.groups[groupName];
    }

    if ("contentGroupId" in sourceConfig) {
      return sourceConfig as VriteContentSourceGroup;
    }

    if ("groups" in sourceConfig) {
      return Object.values(sourceConfig.groups)[0];
    }

    return null;
  };

  return {
    async getContentTree(groupName) {
      const group = getGroup(groupName);
      const contentGroupId = group?.contentGroupId;

      if (!group || !contentGroupId) {
        throw new Error('Config error encountered when calling "getContentTree()"');
      }

      const contentGroups = await client.contentGroups.list({
        ancestor: contentGroupId,
        subtree: true
      });
      const extractIdsFromTreeLevel = (
        treeLevel: ContentGroupWithSubtree[],
        contentGroupIdsSet?: Set<string>
      ): string[] => {
        const contentGroupIds = contentGroupIdsSet || new Set<string>([contentGroupId]);

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
          id: contentGroupId,
          name: ""
        }).contentMetadata
      };
    },
    async getFlattenContentTree(groupName?: string) {
      const contentTree = await this.getContentTree(groupName);
      const flattenContentTree: Array<{
        contentMetadata: ContentMetadata;
        branches: ContentTreeBranch[];
      }> = [];
      const flatten = (branch: ContentTreeBranch, parentBranches: ContentTreeBranch[]): void => {
        const branches = [...parentBranches, branch];

        branch.contentMetadata.forEach((contentMetadata) => {
          flattenContentTree.push({
            contentMetadata,
            branches
          });
        });
        branch.branches.forEach((childBranch) => flatten(childBranch, branches));
      };

      contentTree.branches.forEach((branch) => flatten(branch, []));
      contentTree.contentMetadata.forEach((contentMetadata) => {
        flattenContentTree.push({
          contentMetadata,
          branches: []
        });
      });

      return flattenContentTree;
    },
    async getContentMetadata(slug, groupName) {
      const [contentPiece] = await client.contentPieces.list({
        slug,
        perPage: 1
      });

      if (!contentPiece) {
        throw new Error(`Content with slug "${slug}" not found`);
      }

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
    async listContentMetadata(page, perPage = 50, groupName) {
      const group = getGroup(groupName);
      const contentGroupId = group?.contentGroupId;

      if (!contentGroupId) return { contentMetadata: [], totalPages: 0 };

      const contentPieces = await client.contentPieces.list({
        perPage,
        page: page === "all" ? 0 : page,
        contentGroupId
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
