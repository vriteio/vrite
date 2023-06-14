![Vrite JS SDK cover](./cover.png)

# Vrite JavaScript SDK

> Vrite JavaScript SDK, like the entire Vrite product is currently in Beta. Use with caution and report any bugs related to the SDK here in the GitHub Issues or through Vrite Discord server.

[Vrite JavaScript SDK](https://github.com/vriteio/vrite/tree/main/packages/sdk/javascript) is a one-stop-shop when building any kind of Vrite-powered website or web app.

Currently it includes the following parts:

- **API client** — for easy access to Vrite API;
- **Content transformers** — functions used to transform Vrite JSON content into different formats;
- **Astro integration** — dedicated integration for [Astro](<%5Bhttps://astro.build/%5D(https://astro.build/)>);

## Installation

```shell
npm i @vrite/sdk

```

## Usage

The Vrite SDK is modular, so you can import only the parts of it you need. On top of that, it's **isomorphic**, with both the API client and content transformers library being able to run both in the browser and Node.js.

### API client

Start by initializing the API client, by importing the library, and providing your API access token:

```javascript
import { createClient } from "@vrite/sdk/api";
const vrite = createClient({
  token: "[YOUR_API_TOKEN]"
});
```

With the client configured, you can access [all the endpoints of the Vrite API](https://generator.swagger.io/?url=https://api.vrite.io/swagger.json) via convenient JavaScript methods. Here are a few examples:

```javascript
// Get all content groups
const contentGroups = await vrite.contentGroups.list();
// Get all content pieces from a content group
const contentPieces = await vrite.contentPieces.list({
  contentGroupId: "[CONTENT_GROUP_ID]"
});
// Get the entire conten piece with JSON content
const contentPiece = await vrite.contentPieces.get({
  id: "[CONTENT_PIECE_ID]",
  content: true
});
```

To explore available endpoints, check out [Vrite API docs](https://generator.swagger.io/?url=https://api.vrite.io/swagger.json). On top of that, the API client is **fully typed** (written in TypeScript) so you can easily find your way using your modern code editor's autocomplete functionality.

### Content transformers

**Content transformers** are functions dedicated to processing Vrite JSON output and adapting it to required string-based formats.

The JSON output, based on the [ProseMirror](https://prosemirror.net/) library powering the Vrite Editor, is very versatile and easy to process, making it the ideal choice, no matter how your content has to be delivered. Content transformers help with this process by further simplifying the processing of these recursive JSON trees to output strings.

```javascript
import { createContentTransformer, gfmTransformer, htmlTransformer } from "@vrite/sdk/transformers";

const sampleVriteJSON = {
  // ...
};
// Transforms JSON to GitHub Flavored Markdown format
const gfmOutput = gfmTransformer(sampleVriteJSON);
// Transforms JSON to HTML format
const htmlOutput = htmlTransformer(sampleVriteJSON);
// Create your own content transformers
const customContentTransformer = createContentTransformer({
  applyInlineFormatting(type, attrs, content) {
    switch (type) {
      case "link":
        return `<a href="${attrs.href}">${content}</a>`;
      case "bold":
        return `<strong>${content}</strong>`;
      case "code":
        return `<code>${content}</code>`;
      case "italic":
        return `<em>${content}</em>`;
      default:
        return content;
    }
  },
  transformNode(type, attrs, content) {
    switch (type) {
      case "paragraph":
        return `<p>${content}</p>`;
      case "heading":
        return `<h${attrs?.level || 1}>${content}</h${attrs?.level || 1}>`;
      case "blockquote":
        return `<blockquote>${content}</blockquote>`;
      case "bulletList":
        return `<ul>${content}</ul>`;
      case "orderedList":
        return `<ol>${content}</ol>`;
      case "listItem":
        return `<li>${content}</li>`;
      case "horizontalRule":
        return `<hr/>`;
      default:
        return content;
    }
  }
});
```

The SDK provides built-in content transformers for both HTML and GFM formats.

### Astro integration

Vrite Astro integration makes integrating Vrite with your Astro-powered website really easy!

Start by adding the Vrite plugin into the Astro config:

```javascript
import { defineConfig } from "astro/config";
import { vritePlugin } from "@vrite/sdk/astro";
export default defineConfig({
  integrations: [
    // ...
    vritePlugin({
      accessToken: "[YOUR_ACCESS_TOKEN]",
      contentGroupId: "[CONTENT_GROUP_ID]"
    })
    // ...
  ]
});
```

In the configuration provide both your **API access token**, as well as the **ID of the content group** containing the posts for publishing on your Astro-powered website.

If you're using **TypeScript**, add the following to your _tsconfig.json_, under `compilerOptions.types`:

```json
{ "compilerOptions": { "types": ["@vrite/sdk/types"] } }
```

Now you can import from a `virtual:vrite` module that provides configured API client, along with a few utils for integrating Vrite with Astro:

```astro
---
import { Content, client, getContentPieces, getStaticPaths } from "virtual:vrite";

// Pre-configured Vrite API client
const settings = await client.userSettings.get();
// Utility to retrieve content pieces from the configured content group
const contentPieces = await getContentPieces();
// Shortcut for retriving all content pieces for use with Astro SSG
export getStaticPaths;
---

<!-- Renders the Vrite content piece, specified by ID or slug -->
<content contentPieceId="..." slug="..." />
```

- `Content` — renders Vrite content piece specified either by ID (`contentPieceId` prop) or a slug (`slug` prop); Useful when in SSR mode;
- `client` — pre-configured Vrite API client for easy access;
  - `getContentPieces` — retrieves content pieces from the content group specified in the config file. Accepts an object with the following properties:
  - `limit?: number | "all" = 50` — how many content pieces to retrieve; `"all"` retrieves all of them, in batches of 50;
  - `startPage?: number = 1` — if `limit` is a number and pagination is used, what page to start retrieving content pieces from?
  - `tagId?: string` — Tag ID, if you want to filter results by specific tag.
- `getStaticPaths` — shortcut function for easy re-export when using Vrite SSG and inside _[slug].astro_ file. It returns `params.slug` as the content piece's slug and all basic content piece properties as `props`.

For a more detailed guide on using the Vrite Astro integration, [check out this blog post](https://vrite.io/blog/start-programming-blog-in-minutes-with-astro-and-vrite/).
