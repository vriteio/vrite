import type { APIRoute } from "astro";

const get: APIRoute = async ({ redirect }) => {
  return redirect("/");
};

export { get };
