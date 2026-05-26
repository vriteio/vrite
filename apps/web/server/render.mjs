import { getRequestURL, isPageRequestMethod, notFoundResponse } from "./http.mjs";

const createRenderHandler = ({ loadModule, loadTemplate, vite }) => {
  return async (request) => {
    if (!isPageRequestMethod(request.method)) {
      return notFoundResponse;
    }

    const url = getRequestURL(request);

    try {
      const [module, template] = await Promise.all([
        loadModule(),
        loadTemplate(url.pathname + url.search + url.hash)
      ]);

      return await module.render({
        request,
        template
      });
    } catch (error) {
      if (vite) {
        vite.ssrFixStacktrace(error);
      }

      throw error;
    }
  };
};

export { createRenderHandler };
