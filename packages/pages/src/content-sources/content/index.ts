import { createContentSource } from "../../utils";
// @ts-expect-error
import { getCollection, getEntry, getEntries } from "astro:content";
import type { ContentMetadata, ContentTreeBranch } from "vrite:pages";

type SourceConfigTreeBranch = {
  branchName: string;
  contentSlugs: string[];
  branches: SourceConfigTreeBranch[];
};

const content = createContentSource<{
  collection: string;
  authorsCollection?: string;
  tree?: {
    contentSlugs: string[];
    branches: SourceConfigTreeBranch[];
  };
  page: {
    title: string;
    description?: string;
  };
}>("vrite", ({ sourceConfig }) => {
  return {
    async getPageMetadata() {
      const { title, description = "" } = sourceConfig.page;

      return {
        title,
        description
      };
    },
    async getContentTree() {
      const allEntries = await getCollection(sourceConfig.collection);

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
          contentMetadata: branch.contentSlugs
            .map((slug) => {
              return slugToContentMetadata(slug);
            })
            .filter(Boolean) as ContentMetadata[],
          branches: branch.branches.map(sourceConfigToContentTreeBranch)
        };
      };

      if (sourceConfig.tree) {
        return {
          branches: sourceConfig.tree.branches.map(sourceConfigToContentTreeBranch),
          contentMetadata: sourceConfig.tree.contentSlugs
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
    async getContentMetadata(slug) {
      const entry = await getEntry(sourceConfig.collection, slug);

      let authors = [];

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
        authors: authors.map((author) => {
          return {
            name: author.data.name,
            avatar: author.data.avatar
          };
        })
      };
    },
    async renderContent(slug) {
      const entry = await getEntry(sourceConfig.collection, slug);
      const { Content, headings } = await entry.render();

      return { Content, headings };
    },
    async listContentMetadata(page, perPage = 50) {
      const allEntries = await getCollection(sourceConfig.collection);

      let allAuthors: any[] = [];

      if (sourceConfig.authorsCollection) {
        allAuthors = await getCollection(sourceConfig.authorsCollection);
      }

      let paginatedEntries = allEntries;

      if (page !== "all") {
        paginatedEntries = allEntries.slice((page - 1) * perPage, page * perPage);
      }

      return {
        contentMetadata: paginatedEntries.map((entry) => {
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
        }),
        totalPages: Math.ceil(allEntries.length / perPage)
      };
    }
  };
});

export { content };
