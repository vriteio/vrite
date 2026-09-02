import { OpenAICompatibleClient } from "@andesine/backend/lib/search";
import { config } from "../config";

const openAIClient = new OpenAICompatibleClient({
  apiKey: config.OPENAI_API_KEY,
  baseURL: config.OPENAI_BASE_URL,
  embeddingDimensions: config.SEARCH_EMBEDDING_DIMENSIONS,
  embeddingModel: config.SEARCH_EMBEDDING_MODEL
});
const createEmbeddings = async (texts: string[]): Promise<number[][]> => {
  return openAIClient.createEmbeddings(texts);
};

export { createEmbeddings };
