import type { APIRoute } from "astro";

const get: APIRoute = async ({ redirect }) => {
  return redirect("/usage-guide/getting-started");
};

export { get };
