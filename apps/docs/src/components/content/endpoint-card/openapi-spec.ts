import type { OASDocument } from "oas/dist/types.d.cts";

let spec: OASDocument | null = null;

const getOpenAPISpec = async (): Promise<OASDocument> => {
  const response = await fetch("https://api.vrite.io/swagger.json");

  spec = await response.json();

  return spec as OASDocument;
};

export { getOpenAPISpec };
