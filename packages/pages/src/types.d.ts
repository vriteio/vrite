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
  interface GeneralConfig {
    title: string;
    description: string;
    logo?: string;
    favicon?: string;
    theme?: string;
    links?: Array<{ url: string; label: string; icon?: string }>;
  }
  interface ContentSource {
    name: string;
    config: Record<string, any>;
    getContentMetadata(slug: string, group?: string): Promise<ContentMetadata>;
    getContentTree(group?: string): Promise<{
      branches: ContentTreeBranch[];
      contentMetadata: ContentMetadata[];
    }>;
    getFlattenContentTree(group?: string): Promise<
      Array<{
        contentMetadata: ContentMetadata;
        branches: ContentTreeBranch[];
      }>
    >;
    renderContent(
      slug: string,
      group?: string
    ): Promise<{
      Content: import("astro/dist/runtime/server").AstroComponentFactory;
      headings: Array<import("astro").MarkdownHeading>;
    }>;
    listContentMetadata(
      page: number | "all",
      perPage?: number,
      group?: string
    ): Promise<{ contentMetadata: ContentMetadata[]; totalPages: number }>;
  }

  export function useContentSource(
    Astro: Readonly<
      import("astro").AstroGlobal<Record<string, any>, import("astro").AstroComponentFactory>
    >
  ): ContentSource;
  export function useConfig(
    Astro: Readonly<
      import("astro").AstroGlobal<Record<string, any>, import("astro").AstroComponentFactory>
    >
  ): GeneralConfig;
  export type { ContentMetadata, ContentTreeBranch, ContentSource, GeneralConfig };
}
