interface OpenAICompatibleClientConfig {
  apiKey: string;
  baseURL: string;
  embeddingDimensions: number;
  embeddingModel: string;
}

interface OpenAICompatibleMessage {
  content: string;
  role: "assistant" | "system" | "user";
}

interface OpenAICompatibleCompletionInput {
  maxTokens?: number;
  messages: OpenAICompatibleMessage[];
  model: string;
  reasoningEffort?: "high" | "low" | "max" | "medium" | "minimal" | "none" | "xhigh";
}

interface OpenAICompatibleEmbedding {
  embedding: number[];
  index: number;
}

interface OpenAICompatibleEmbeddingResponse {
  data: OpenAICompatibleEmbedding[];
}

interface OpenAICompatibleCompletionResponse {
  choices: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

const EMBEDDING_BATCH_SIZE = 64;
const OPENAI_REQUEST_TIMEOUT_MS = 60_000;

class OpenAICompatibleClient {
  private readonly config: OpenAICompatibleClientConfig;

  constructor(config: OpenAICompatibleClientConfig) {
    this.config = config;
  }

  private async request<T>(path: string, body: object): Promise<T> {
    const response = await fetch(`${this.config.baseURL}${path}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(OPENAI_REQUEST_TIMEOUT_MS)
    });

    if (!response.ok) {
      const message = await response.text();

      throw new Error(message || `AI request failed with status ${response.status}`);
    }

    return (await response.json()) as T;
  }

  private isEmbedding(value: unknown): value is OpenAICompatibleEmbedding {
    if (typeof value !== "object" || value === null) return false;

    const embedding = (value as OpenAICompatibleEmbedding).embedding;
    const index = (value as OpenAICompatibleEmbedding).index;

    return (
      Number.isInteger(index) &&
      Array.isArray(embedding) &&
      embedding.length === this.config.embeddingDimensions &&
      embedding.every((item) => typeof item === "number" && Number.isFinite(item))
    );
  }

  private async requestEmbeddings(texts: string[]): Promise<number[][]> {
    const result = await this.request<OpenAICompatibleEmbeddingResponse>("/embeddings", {
      model: this.config.embeddingModel,
      input: texts,
      dimensions: this.config.embeddingDimensions
    });

    if (!Array.isArray(result.data) || !result.data.every((item) => this.isEmbedding(item))) {
      throw new Error("The AI API returned an invalid embedding response");
    }

    const embeddings = [...result.data].sort((first, second) => first.index - second.index);
    const hasUnexpectedIndices = embeddings.some(({ index }, expectedIndex) => {
      return index !== expectedIndex;
    });

    if (embeddings.length !== texts.length || hasUnexpectedIndices) {
      throw new Error("The AI API returned an unexpected number of embeddings");
    }

    return embeddings.map(({ embedding }) => embedding);
  }

  async createEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (let index = 0; index < texts.length; index += EMBEDDING_BATCH_SIZE) {
      const batch = texts.slice(index, index + EMBEDDING_BATCH_SIZE);

      embeddings.push(...(await this.requestEmbeddings(batch)));
    }

    return embeddings;
  }

  async createChatCompletion(input: OpenAICompatibleCompletionInput): Promise<string> {
    const result = await this.request<OpenAICompatibleCompletionResponse>("/chat/completions", {
      model: input.model,
      messages: input.messages,
      max_completion_tokens: input.maxTokens || 1000,
      reasoning_effort: input.reasoningEffort
    });
    const content = result.choices[0]?.message?.content?.trim();

    if (!content) throw new Error("The AI API returned an empty completion");

    return content;
  }
}

export { OpenAICompatibleClient };
export type {
  OpenAICompatibleClientConfig,
  OpenAICompatibleCompletionInput,
  OpenAICompatibleMessage
};
