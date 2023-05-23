---
title: "Better blogging on Dev.to with Vrite - headless CMS for technical content"
---

With technical writing becoming increasingly popular - thanks in part to platforms like [DEV](https://dev.to/) or [Hashnode](https://hashnode.com/), I found it interesting that the tooling in this niche is still lacking. You often have to write raw Markdown, jump between different editors and use many tools to support the content production process.

That’s why I decided to create [Vrite](https://vrite.io/) - a new kind of headless CMS meant specifically for technical writing, with good developer experience in mind. From the built-in **Kanban management** dashboard to the advanced WYSIWYG editor with support for **Markdown**, real-time collaboration, embedded **code editor**, and [Prettier](https://prettier.io/) integration - Vrite is meant to be a one-stop-shop for all your technical content.

With the release of the Public Beta earlier this week, [Vrite is now open-source](https://github.com/vriteio/vrite) and accessible to everyone - to help guide the future roadmap and make the best tool for all technical writers!

## DEV API

A CMS - especially a headless one - can only do so much without a connected publishing endpoint. In the case of Vrite, thanks to its API and flexible content format, it can be easily connected to anything from a personal blog to a GitHub repo or a platform like Dev.to.

Dev.to is an especially interesting option, since the API of the underlying platform - Forem - is [well-documented](https://developers.forem.com/api) and easily available. So, let’s see how to connect it with Vrite!

## Getting Started With Vrite

Given that Vrite is open-source, you’ll soon be able to self-host it. That said, I’m still working on proper documentation and support for this process. For now, the best way to try out Vrite is through a free “cloud” version at [app.vrite.io](http://app.vrite.io).

Start by [signing up for an account](https://app.vrite.io/auth) - either directly or through GitHub:

![Vrite login screen](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/bacwnXsRwCQj1bGJj_4eT.png)

When you’re in, you’ll be greeted by a Kanban dashboard. This is where you’ll be able to manage all your content:

![Vrite dashboard](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/L30UxjhVDpOTSyar76PEy.png)

At this point, it’s worth explaining how things are structured in Vrite:

- **Workspace** - this is the top-most organizational unit in Vrite; it’s where all your content groups, team members, editing settings, and API access are controlled; A default one is created for you, though you can create and be invited to as many as you want;
- **Content Groups** - the equivalents to columns in the Kanban dashboard; They basically group all the content pieces under one label, e.g. _Ideas_, _Drafts_, _Published_.
- **Content Pieces** - where your actual content and its metadata - like description, tags, etc live;

Let’s say you want a completely new workspace for your Dev.to blog as you plan to publish unique content there. To create one, click the _Switch Workspace_ button in the bottom-left corner (hexagon) and then _New Workspace_.

![Creating a new Vrite workspace](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/6h5fAlJxUjw0trYnXTvU2.png)

You need to provide a name and optionally - a description and logo. Then click _Create Workspace_ and select the new workspace you’ve created from the list:

![Vrite workspaces list](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/9EDxj55kQrvceGAkGjwDy.png)

Back in the dashboard, you can now create a few content groups to organize your content by clicking _New group_. When that’s done, you can finally create a new content piece by clicking _New content piece_ at the bottom of the column of your choice.

![Creating a new content piece in Vrite](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/VPGBFWXAUGPlfdckbc-bs.png)

With a new content piece, you can view and configure all its metadata in the **side panel**. In Vrite, almost everything, aside from creating and managing content happens in this resizable view. This way you can always keep an eye on the content while editing metadata or configuring settings.

Now, click _Open in editor_ either in the side panel or on the content piece card in the Kanban (you can also use the side-menu button) to open the selected content piece in the editor.

![Vrite editor](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/-rSHnt6bh74jSHx9uNaCn.png)

This is where the magic happens! Feel free to explore the editor while writing your next great piece. Vrite synchronizes all the changes in real time and supports many of the formatting options available in modern WYSIWYG editors. On top of that, you also get an advanced code editor for all your snippets with features like autocompletion and formatting for supported languages:

![Snippet editor in Vrite](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/dOXCQGclUgWJHm3Y8tzYr.png)

## Connecting with DEV

When you’ve finished writing your next piece, it’s time to publish it! For convenience, the Vrite editor provides an _Export_ menu where you can get the contents of your editor in JSON, HTML, or GitHub Flavored Markdown (GFM) for easy copy-pasting. However, to get a more proper auto-publishing experience, you’ll likely want to use Vrite API and Webhooks.

The intended workflow looks like this:

1. Drag and drop content pieces to the publishing column;
2. Send a message to the server via Webhooks;
3. Retrieve and process the content via the Vrite API and JS SDK;
4. Publish/update a blog post on Dev.to;

For this tutorial, I’ll use [Cloudflare Workers](https://workers.cloudflare.com/) as they’re really fast and easy to set up, but you can use pretty much any other serverless provider with support for JS.

Start by creating a new CF Worker project:

```shell
npm create cloudflare
```

Then, `cd` into the scaffolded project to `wrangler login` and install [Vrite JS SDK](https://github.com/vriteio/sdk-js):

```shell
wrangler login
npm i @vrite/sdk
```

To interact with the SDK, you’ll need to have an API token. To get it from Vrite, go to _Settings → API → New API token_:

![Creating new API token in Vrite](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/K4hXEwb2q97bUPYZDeXjl.png)

It’s recommended to keep the permissions of the API token to the necessary minimum, which in this case means only _Write_ access to _Content pieces_ (as we’ll actually be updating the content piece metadata later on). After clicking _Create new token_ you’ll be presented with the newly-created token. Keep it safe and secure - **you’ll only see it once**!

Additionally, to publish the content on Dev.to via its API, you’ll need to get an API key from it as well. To do so, go to the [bottom of the settings in your DEV account](https://dev.to/settings/extensions) and click _Generate API Key_:

![Generate API key in Dev.to](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/5SD7-x8GEhTbLD5VOny4G.png)

Now, add both tokens to the Worker as environment variables via `wrangler.toml`:

```toml
name = "autopublishing"
main = "src/worker.ts"
compatibility_date = "2023-05-18"

[vars]
VRITE_API_TOKEN = "[YOUR_VRITE_API_TOKEN]"
DEV_API_KEY="[YOUR_DEV_API_KEY]"
```

Upon the event, Vrite sends a `POST` request to the configured target URL of the webhook with additional JSON payload. For our use case, the most important part of this payload will be the ID of a content piece that was just added to the given content group (either by drag and dropped or by being created directly)

Let’s finally create our Worker (inside `src/worker.ts`):

```typescript
import { JSONContent, createClient } from "@vrite/sdk/api";
import { createContentTransformer, gfmTransformer } from "@vrite/sdk/transformers";

const processContent = (content: JSONContent): string => {
  // ...
};

export interface Env {
  VRITE_API_TOKEN: string;
  DEV_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const payload: { id: string } = await request.json();
    const client = createClient({ token: env.VRITE_API_TOKEN });
    const contentPiece = await client.contentPieces.get({
      id: payload.id,
      content: true,
      description: "text"
    });
    const article = {
      title: contentPiece.title,
      body_markdown: processContent(contentPiece.content),
      description: contentPiece.description || undefined,
      tags: contentPiece.tags
        .map((tag) => tag.label?.toLowerCase().replace(/\s/g, ""))
        .filter(Boolean),
      canonical_url: contentPiece.canonicalLink || undefined,
      published: true,
      series: contentPiece.customData?.devSeries || undefined,
      main_image: contentPiece.coverUrl || undefined
    };

    if (contentPiece.customData?.devId) {
      try {
        const response = await fetch(
          `https://dev.to/api/articles/${contentPiece.customData.devId}`,
          {
            method: "PUT",
            headers: {
              "api-key": env.DEV_API_KEY,
              "Accept": "application/json",
              "content-type": "application/json",
              "User-Agent": "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; .NET CLR 1.1.4322)"
            },
            body: JSON.stringify({
              article
            })
          }
        );
        const data: { error?: string } = await response.json();

        if (data.error) {
          console.error("Error from DEV: ", data.error);
        }
      } catch (error) {
        console.error(error);
      }
    } else {
      try {
        const response = await fetch(`https://dev.to/api/articles`, {
          method: "POST",
          body: JSON.stringify({ article }),
          headers: {
            "api-key": env.DEV_API_KEY,
            "Accept": "application/json",
            "content-type": "application/json",
            "User-Agent": "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; .NET CLR 1.1.4322)"
          }
        });
        const data: { error?: string; id?: string } = await response.json();

        if (data.error) {
          console.error(data.error);
        } else if (data.id) {
          await client.contentPieces.update({
            id: contentPiece.id,
            customData: {
              ...contentPiece.customData,
              devId: data.id
            }
          });
        }
      } catch (error) {
        console.error(error);
      }
    }

    return new Response();
  }
};
```

What’s going on here? We start by initiating the Vrite API client and fetching metadata and the content related to the content piece that triggered the event. Then, we use this data to create an `article` object that’s expected by [the DEV API](https://developers.forem.com/api) and use it to make a request.

In Vrite, in addition to strictly-defined metadata like tags or canonical links, you can also provide JSON-based _custom data_. It’s configurable both from the dashboard and through the API, making it a great storage for data like, in this case, DEV article ID, which allows us to determine whether to publish a new article or update an existing one (using a custom `devId` property). The same mechanism is applied for retrieving the name of the series the article should be assigned to on DEV, which can be configured from the Vrite dashboard using a custom `devSeries` property.

Worth noting is that, for requests to DEV API, we’re passing a generic `User-Agent` header - it’s necessary to make a successful request without `403` bot-detection error.

### Content Transformers

You might have noticed that the `body_markdown` property is set to the result of `processContent()` call. That’s because the Vrite API serves its content in a JSON format. Derived from the [ProseMirror](https://prosemirror.net/) library powering Vrite editor, the format allows for versatile content delivery as it can be easily adapted to various needs.

The Vrite JS SDK has built-in tools for transforming this format called _Content Transformers_. They allow you to easily process the JSON to a string-based format, like HTML or GFM (both of which have dedicated transformers built into the SDK).

For DEV, using the GFM transformer would be fine in most cases. However, this transformer ignores embeds that are supported by both the Vrite editor and DEV (i.e. CodePen, CodeSandbox, and YouTube) as they aren’t supported in the GFM specification. Thus, let’s build a custom Transformer that extends the `gfmTransformer` to add support for these embeds:

```typescript
import { JSONContent, createClient } from "@vrite/sdk/api";
import { createContentTransformer, gfmTransformer } from "@vrite/sdk/transformers";

const processContent = (content: JSONContent): string => {
  const devTransformer = createContentTransformer({
    applyInlineFormatting(type, attrs, content) {
      return gfmTransformer({
        type,
        attrs,
        content: [
          {
            type: "text",
            marks: [{ type, attrs }],
            text: content
          }
        ]
      });
    },
    transformNode(type, attrs, content) {
      switch (type) {
        case "embed":
          return `\n{% embed ${attrs?.src || ""} %}\n`;
        case "taskList":
          return "";
        default:
          return gfmTransformer({
            type,
            attrs,
            content: [
              {
                type: "text",
                attrs: {},
                text: content
              }
            ]
          });
      }
    }
  });

  return devTransformer(content);
};

// ...
```

A Content Transform goes through the JSON tree - from the lowest to the highest-level nodes - and processes every node, always passing in the resulting `content` string generated from the child nodes.

In the `processContent()` function above, we’re redirecting the processing of inline formatting options (like bold, italic, etc.) - to the `gfmTransformer`, as both GFM and DEV Markdown support the same formatting options. In the case of nodes (like paragraphs, images, lists, etc.) we’re “filtering out” `taskList`s (as DEV doesn’t support them) and handling processing for `embeds`, using DEV’s liquid tags and embed URL available as a node attribute — `src`.

Now the Worker is ready to be deployed via the Wrangler CLI:

```shell
wrangler deploy
```

When deployed, you should get the URL for calling the Worker in your terminal. You can now use it to create a new Webhook in Vrite:

Go to _Settings → Webhooks → New Webhook_ (all in the side panel)

![Creating a new Webhook in Vrite](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/dnQHZhWfIQ_C9xp3E2YON.png)

For an event select `New content piece added` — this will trigger every time a new content piece is created directly within the given content group (in this case _Published_) or dragged and dropped into it.

Now you should be able to just drag and drop your ready content piece and see it be automatically published on DEV! 🎉

## Next Steps

Now, there’s a lot you can do with Vrite even right now, that I haven’t covered in this article. Here are a few examples:

- Only content pieces that are newly added to the content group and getting published/updated. You might want to consider **“locking” this content group** so that editing these content pieces requires you to first move the article back to the _Drafts_ or _Editing_ column. If necessary, you can set up dedicated Webhooks for those groups, so that content pieces are automatically unpublished on DEV.
- Since the introduction of Workspaces, Vrite supports Teams and **real-time collaboration** like in e.g. Google Docs. This elevates it from a standard CMS to an actually good editor and allows you to speed up your content delivery with no need for manual copy-pasting. So feel free to invite other collaborators to join your workspace and control their access level through **roles** and **permissions**.
- With Vrite’s support for various formatting options and content blocks - you might want to limit the available features to better fit your writing style - especially when you’re working in a team. Try adjusting your _Editing Experience_ in the settings, including mentioned options and a **Prettier config** for code formatting.
- Finally, as Vrite is an external CMS, you can freely connect it with any other content delivery frontend (like your personal blog or other platforms) and easily cross-post your content.

## Bottom Line

Now, it’s worth remembering that Vrite is still in **Beta**. This means that not all features are implemented yet and you are likely to encounter bugs and other issues. But that’s just part of the process and I hope you’ll bear with me as we’re evolving the technical writing landscape!

- 🌟 **Star Vrite on GitHub** — [https://github.com/vriteio/vrite](https://github.com/vriteio/vrite)
- 🐞 **Report bugs** — [https://github.com/vriteio/vrite/issues](https://github.com/vriteio/vrite/issues)
- 🐦 **Follow on Twitter for latest updates** — [https://twitter.com/vriteio](https://twitter.com/vriteio)
- 💬 **Join Vrite Discord** — [https://discord.gg/yYqDWyKnqE](https://discord.gg/yYqDWyKnqE)
- ℹ️ **Learn more about Vrite** — [https://vrite.io](https://vrite.io)
