import { createContentSource } from "../../utils";
import type { ContentMetadata, ContentTreeBranch } from "vrite:pages";

type SourceConfigTreeBranch = {
  branchName: string;
  contentSlugs?: string[];
  branches?: SourceConfigTreeBranch[];
};
type AstroContentSourceGroup = {
  collection: string;
  data?: Record<string, any>;
  tree?: {
    contentSlugs?: string[];
    branches?: SourceConfigTreeBranch[];
  };
};
type BaseAstroContentSourceConfig = {
  authorsCollection?: string;
};

const content = createContentSource<
  | (BaseAstroContentSourceConfig & AstroContentSourceGroup)
  | (BaseAstroContentSourceConfig & { groups: Record<string, AstroContentSourceGroup> })
>("vrite", ({ sourceConfig }) => {
  const getGroup = (groupName?: string): AstroContentSourceGroup | null => {
    if (groupName && "groups" in sourceConfig) {
      return sourceConfig.groups[groupName];
    }

    if ("collection" in sourceConfig) {
      return sourceConfig as AstroContentSourceGroup;
    }

    if ("groups" in sourceConfig) {
      return Object.values(sourceConfig.groups)[0];
    }

    return null;
  };

  return {
    async getContentTree(groupName) {
      const group = getGroup(groupName);
      const collection = group?.collection;
      const tree = group?.tree;

      if (!group || !collection) {
        throw new Error('Config error encountered when calling "getContentTree()"');
      }

      // @ts-expect-error
      const { getCollection } = await import("astro:content");
      const allEntries: any[] = await getCollection(collection);

      let allAuthors: any[] = [];

      if (sourceConfig.authorsCollection) {
        allAuthors = await getCollection(sourceConfig.authorsCollection);
      }

      const slugToContentMetadata = (slug: string): ContentMetadata | null => {
        const entry = allEntries.find((entry) => entry.slug === slug);

        if (!entry) {
          return null;
        }

        const authors = allAuthors.filter((author) => entry.data.authors.includes(author.id));

        return {
          title: entry.data.title || "",
          description: entry.data.description || "",
          date: entry.data.date || undefined,
          cover: entry.data.coverUrl || undefined,
          slug: entry.slug,
          tags: entry.data.tags,
          authors: authors.map((author) => {
            return {
              name: author.data.name,
              avatar: author.data.avatar
            };
          })
        };
      };
      const sourceConfigToContentTreeBranch = (
        branch: SourceConfigTreeBranch
      ): ContentTreeBranch => {
        return {
          branchName: branch.branchName,
          contentMetadata: (branch.contentSlugs || [])
            .map((slug) => {
              return slugToContentMetadata(slug);
            })
            .filter(Boolean) as ContentMetadata[],
          branches: (branch.branches || []).map(sourceConfigToContentTreeBranch)
        };
      };

      if (tree) {
        return {
          branches: (tree.branches || []).map(sourceConfigToContentTreeBranch),
          contentMetadata: (tree.contentSlugs || [])
            .map((slug) => {
              return slugToContentMetadata(slug);
            })
            .filter(Boolean) as ContentMetadata[]
        };
      }

      return {
        branches: [],
        contentMetadata: allEntries
          .map((entry) => {
            return slugToContentMetadata(entry.slug);
          })
          .filter(Boolean) as ContentMetadata[]
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
      const group = getGroup(groupName);
      const collection = group?.collection;

      if (!collection) {
        throw new Error('Config error encountered when calling "getContentMetadata()"');
      }

      // @ts-expect-error
      const { getEntry, getEntries } = await import("astro:content");
      const entry = await getEntry(collection, slug);

      let authors: any[] = [];

      if (sourceConfig.authorsCollection) {
        authors = await getEntries(sourceConfig.authorsCollection, entry.data.authors);
      }

      return {
        title: entry.data.title || "",
        description: entry.data.description || "",
        date: entry.data.date || undefined,
        cover: entry.data.coverUrl || undefined,
        slug: entry.slug,
        tags: entry.data.tags,
        authors: authors.map((author) => ({
          name: author.data.name,
          avatar: author.data.avatar
        }))
      };
    },
    async renderContent(slug, groupName) {
      const group = getGroup(groupName);
      const collection = group?.collection;

      if (!collection) {
        throw new Error('Config error encountered when calling "renderContent()"');
      }

      // @ts-expect-error
      const { getEntry } = await import("astro:content");
      const entry = await getEntry(collection, slug);
      const { Content, headings } = await entry.render();

      return { Content, headings };
    },
    async listContentMetadata(page, perPage = 50, groupName) {
      const group = getGroup(groupName);
      const collection = group?.collection;

      if (!collection) return { contentMetadata: [], totalPages: 0 };

      // @ts-expect-error
      const { getCollection } = await import("astro:content");
      const allEntries = await getCollection(collection);

      let allAuthors: any[] = [];

      if (sourceConfig.authorsCollection) {
        allAuthors = await getCollection(sourceConfig.authorsCollection);
      }

      let paginatedEntries: any[] = allEntries;

      if (page !== "all") {
        paginatedEntries = allEntries.slice((page - 1) * perPage, page * perPage);
      }

      return {
        contentMetadata: paginatedEntries.map((entry) => {
          const authors: any[] = allAuthors.filter((author) => {
            return entry.data.authors.includes(author.id);
          });

          return {
            title: entry.data.title || "",
            description: entry.data.description || "",
            date: entry.data.date || undefined,
            cover: entry.data.coverUrl || undefined,
            slug: entry.slug,
            tags: entry.data.tags,
            authors: authors.map((author) => ({
              name: author.data.name,
              avatar: author.data.avatar
            }))
          };
        }),
        totalPages: Math.ceil(allEntries.length / perPage)
      };
    }
  };
});

export { content };
