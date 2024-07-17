declare module "vrite:pages" {
  interface ContentMetadata {
    title: string;
    description: string;
    date?: string | Date;
    cover?: string;
    slug: string;
    authors: Array<{
      name: string;
      avatar?: string;
    }>;
    tags: string[];
  }
  interface ContentTreeBranch {
    branchName: string;
    contentMetadata: ContentMetadata[];
    branches: ContentTreeBranch[];
  }
  interface PageMetadata {
    title: string;
    description: string;
  }
  interface ContentSource {
    name: string;
    config: Record<string, any>;
    getPageMetadata(): Promise<PageMetadata>;
    getContentMetadata(slug: string): Promise<ContentMetadata>;
    getContentTree(): Promise<{
      branches: ContentTreeBranch[];
      contentMetadata: ContentMetadata[];
    }>;
    renderContent(slug: string): Promise<{
      Content: import("astro/dist/runtime/server").AstroComponentFactory;
      headings: Array<import("astro").MarkdownHeading>;
    }>;
    listContentMetadata(
      page: number | "all",
      perPage?: number
    ): Promise<{ contentMetadata: ContentMetadata[]; totalPages: number }>;
  }

  export function useContentSource(
    Astro: Readonly<
      import("astro").AstroGlobal<Record<string, any>, import("astro").AstroComponentFactory>
    >
  ): ContentSource;
  export type { ContentMetadata, ContentTreeBranch, PageMetadata, ContentSource };
}
