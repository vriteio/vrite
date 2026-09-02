import type { SearchCollectionDefinition, TypesenseCollectionSchema } from "./schema";

interface TypesenseClientConfig {
  apiKey: string;
  url: string;
}

interface TypesenseAlias {
  collection_name: string;
  name: string;
}

interface TypesenseImportResult {
  error?: string;
  success: boolean;
}

interface TypesenseDeleteResult {
  num_deleted: number;
}

interface TypesenseSearchHit<TDocument> {
  document: TDocument;
  hybrid_search_info?: {
    rank_fusion_score: number;
  };
  text_match?: number;
  vector_distance?: number;
}

interface TypesenseSearchGroup<TDocument> {
  group_key: string[];
  hits: Array<TypesenseSearchHit<TDocument>>;
}

interface TypesenseSearchResult<TDocument> {
  code?: number;
  error?: string;
  found: number;
  grouped_hits?: Array<TypesenseSearchGroup<TDocument>>;
  hits?: Array<TypesenseSearchHit<TDocument>>;
  page?: number;
  search_time_ms?: number;
}

interface TypesenseMultiSearchResponse<TDocument> {
  results: Array<TypesenseSearchResult<TDocument>>;
}

interface TypesenseSearchParameters {
  [key: string]: boolean | number | string | undefined;
}

const TYPESENSE_REQUEST_TIMEOUT_MS = 30_000;

class TypesenseAPIError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "TypesenseAPIError";
    this.status = status;
  }
}

class TypesenseClient {
  private readonly config: TypesenseClientConfig;

  constructor(config: TypesenseClientConfig) {
    this.config = config;
  }

  private async getResponse(path: string, init?: RequestInit): Promise<Response> {
    const timeoutSignal = AbortSignal.timeout(TYPESENSE_REQUEST_TIMEOUT_MS);
    const signal = init?.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;
    const response = await fetch(`${this.config.url}${path}`, {
      ...init,
      signal,
      headers: {
        "X-TYPESENSE-API-KEY": this.config.apiKey,
        ...init?.headers
      }
    });

    if (!response.ok) {
      const responseText = await response.text();

      throw new TypesenseAPIError(
        response.status,
        responseText || `Typesense request failed with status ${response.status}`
      );
    }

    return response;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await this.getResponse(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers
      }
    });

    return (await response.json()) as T;
  }

  async createCollection(schema: TypesenseCollectionSchema): Promise<void> {
    await this.request("/collections", {
      method: "POST",
      body: JSON.stringify(schema)
    });
  }

  async getCollection(name: string): Promise<TypesenseCollectionSchema | null> {
    try {
      return await this.request(`/collections/${encodeURIComponent(name)}`);
    } catch (error) {
      if (error instanceof TypesenseAPIError && error.status === 404) return null;

      throw error;
    }
  }

  async getAlias(name: string): Promise<TypesenseAlias | null> {
    try {
      return await this.request(`/aliases/${encodeURIComponent(name)}`);
    } catch (error) {
      if (error instanceof TypesenseAPIError && error.status === 404) return null;

      throw error;
    }
  }

  async upsertAlias(name: string, collectionName: string): Promise<void> {
    await this.request(`/aliases/${encodeURIComponent(name)}`, {
      method: "PUT",
      body: JSON.stringify({ collection_name: collectionName })
    });
  }

  async deleteDocuments(collection: string, filterBy: string): Promise<number> {
    const parameters = new URLSearchParams({ filter_by: filterBy });
    const result = await this.request<TypesenseDeleteResult>(
      `/collections/${encodeURIComponent(collection)}/documents?${parameters}`,
      { method: "DELETE" }
    );

    return result.num_deleted;
  }

  async importDocuments(collection: string, documents: object[]): Promise<void> {
    if (documents.length === 0) return;

    const parameters = new URLSearchParams({ action: "upsert" });
    const response = await this.getResponse(
      `/collections/${encodeURIComponent(collection)}/documents/import?${parameters}`,
      {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: documents.map((document) => JSON.stringify(document)).join("\n")
      }
    );
    const results = (await response.text())
      .split("\n")
      .filter(Boolean)
      .map((result) => JSON.parse(result) as TypesenseImportResult);
    const failed = results.find((result) => !result.success);

    if (results.length !== documents.length) {
      throw new TypesenseAPIError(502, "Typesense returned an incomplete import response");
    }

    if (failed) {
      throw new TypesenseAPIError(422, failed.error || "Typesense document import failed");
    }
  }

  async searchDocuments<TDocument>(
    collection: string,
    parameters: TypesenseSearchParameters
  ): Promise<TypesenseSearchResult<TDocument>> {
    const response = await this.request<TypesenseMultiSearchResponse<TDocument>>("/multi_search", {
      method: "POST",
      body: JSON.stringify({
        searches: [{ collection, ...parameters }]
      })
    });
    const result = response.results[0];

    if (!result) throw new TypesenseAPIError(502, "Typesense returned an empty search response");
    if (result.error) throw new TypesenseAPIError(result.code || 502, result.error);

    if (result.grouped_hits) {
      result.hits = result.grouped_hits.flatMap(({ hits }) => hits);
    }

    return result;
  }
}

const ensureSearchCollection = async (
  client: TypesenseClient,
  definition: SearchCollectionDefinition
): Promise<void> => {
  const collection = await client.getCollection(definition.schema.name);

  if (!collection) {
    try {
      await client.createCollection(definition.schema);
    } catch (error) {
      const collectionCreatedByAnotherWorker =
        error instanceof TypesenseAPIError && error.status === 409;

      if (!collectionCreatedByAnotherWorker) throw error;
    }
  }

  const alias = await client.getAlias(definition.alias);

  if (alias?.collection_name !== definition.schema.name) {
    await client.upsertAlias(definition.alias, definition.schema.name);
  }
};
const ensureSearchCollections = async (
  client: TypesenseClient,
  definitions: SearchCollectionDefinition[]
): Promise<void> => {
  for (const definition of definitions) {
    await ensureSearchCollection(client, definition);
  }
};

export { TypesenseAPIError, TypesenseClient, ensureSearchCollections };
export type {
  TypesenseAlias,
  TypesenseClientConfig,
  TypesenseImportResult,
  TypesenseSearchHit,
  TypesenseSearchParameters,
  TypesenseSearchResult
};
