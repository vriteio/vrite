import type { APIRoute } from "astro";
import sendgrid from "@sendgrid/client";
import { validateEmail } from "#lib/utils";

const post: APIRoute = async ({ request }) => {
  const body = await request.json();
  const data = {
    list_ids: [import.meta.env.SENDGRID_LIST_ID],
    contacts: [
      {
        email: body.email,
      },
    ],
  };

  if (validateEmail(body.email) === false) {
    return new Response(JSON.stringify({ success: false }), {
      status: 400,
    });
  }

  sendgrid.setApiKey(import.meta.env.SENDGRID_API_KEY);

  try {
    const [response] = await sendgrid.request({
      url: `/v3/marketing/contacts`,
      method: "PUT",
      body: data,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: response.statusCode,
    });
  } catch (error) {
    console.error(data);

    return new Response(JSON.stringify({ success: false, error }), {
      status: 400,
    });
  }
};

export { post };
