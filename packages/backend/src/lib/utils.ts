import { OgObject } from "open-graph-scraper/dist/lib/types";

const stringToRegex = (str: string): RegExp => {
  return new RegExp(`^${str.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&")}`, "i");
};
const extractPreviewDataFromOpenGraph = (input: OgObject): string => {
  if (input.ogImage) {
    if (typeof input.ogImage === "string") {
      return input.ogImage;
    }

    if (Array.isArray(input.ogImage)) {
      return input.ogImage[0].url;
    }

    return input.ogImage.url;
  }

  if (input.twitterImage && typeof input.twitterImage === "string") {
    return input.twitterImage;
  }

  return "";
};

export { stringToRegex, extractPreviewDataFromOpenGraph };
