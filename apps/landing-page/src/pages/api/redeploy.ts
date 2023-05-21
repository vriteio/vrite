import type { APIRoute } from "astro";
import sendgrid from "@sendgrid/client";

const post: APIRoute = async ({ request }) => {
  const secret = new URLSearchParams(
    request.url.slice(request.url.indexOf("?"))
  ).get("secret");

  if (secret !== import.meta.env.REDEPLOYMENT_SECRET) {
    return new Response(
      JSON.stringify({ success: false, error: "secret-not-matching" }),
      {
        status: 400,
      }
    );
  }

  try {
    const response = await fetch("https://backboard.railway.app/graphql/v2", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${import.meta.env.RAILWAY_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `query project {
        project(id: "${import.meta.env.RAILWAY_PROJECT_ID}") {
          id
          name
          deployments(first: 1) {
            edges {
              node {
                id
              }
            }
          }
        }
      }`,
      }),
    });
    const { data } = await response.json();
    const deploymentId = data.project.deployments.edges[0].node.id;

    await fetch("https://backboard.railway.app/graphql/v2", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${import.meta.env.RAILWAY_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `mutation redeploy {
            deploymentRedeploy(id: "${deploymentId}") {
              projectId
              status
            }
          }`,
      }),
    });

    return new Response(JSON.stringify({ success: true }));
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ success: false, error }), {
      status: 400,
    });
  }
};

export { post };
