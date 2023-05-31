![Vrite JS SDK cover](./cover.png)

# Vrite JavaScript SDK

> Vrite JavaScript SDK, like the entire Vrite product is currently in Beta. Use with caution and report any bugs related to the SDK here in the GitHub Issues or through Vrite Discord server.

Vrite JavaScript SDK is a one-stop-shop when building any kind of Vrite-powered website or web app.

Currently it includes the following parts:

- **API client** — for easier access to Vrite API;

- **Content transformers** — functions used to transform Vrite JSON content into different formats;

- **Astro integration** — dedicated integration for [Astro](<[https://astro.build/](https://astro.build/)>);

## Installation

```Shell
npm i @vrite/sdk
```

## Usage

The Vrite SDK is modular, so you can import only the libraries you need. On top of that, it's **isomorphic**, with both the API client and content transformers library being able to run both in browser and Node.js.

### API client

Start by initializing the API client, by importing the library and providing your API access

```JavaScript
import { createClient } from '@vrite/sdk/api'

const vrite = createClient({
    token: '[YOUR_API_TOKEN]',
})
```

With the client configured, you can access [all the endpoints of the Vrite API](https://app.vrite.io/docs) via convenient JavaScript methods. Here are a few examples:

```JavaScript
// Get all content groups
const contentGroups = await vrite.contentGroups.list()

// Get all content pieces from a content group
const contentPieces = await vrite.contentPieces.list({
    contentGroupId: '[CONTENT_GROUP_ID]',
})

// Get the entire conten piece with JSON content
const contentPiece = await vrite.contentPieces.get({
    id: '[CONTENT_PIECE_ID',
    content: true,
})
```

To explore available endpoints, check out [Vrite API docs](https://app.vrite.io/docs). On top of that, the API client is fully-typed (written in TypeScript) so you can easily find your way using your modern code editor's autocomplete functionality.

### Content transformers

Content transformers are functions dedicated to processing Vrite JSON output and adapting it to required formats.

The JSON output is very versitile and easy to process, making it the ideal choice, no matter how your content has to be delivered. Content transformers help with this process by further simplifying the processing of these recursive JSON trees to output strings.

```JavaScript
import {
    createContentTransformer,
    devToTransformer,
    hashnodeTransformer,
    htmlTransformer,
} from './transformers'

const sampleVriteJSON = {
    // ...
}
// Transforms JSON to simple HTML output string
const htmlOutput = htmlTransformer(sampleVriteJSON)
// Transforms JSON to Dev.to-compatible Markdown format
const devToOutput = devToTransformer(sampleVriteJSON)
// Transforms JSON to Hashnode-compatible Markdown format
const hashnodeOutput = hashnodeTransformer(sampleVriteJSON)

// Create your own content transformers
const customContentTransformer = createContentTransformer({
    applyInlineFormatting(type, attrs, content) {
        switch (type) {
            case 'link':
                return `<a href="${attrs.href}">${content}</a>`
            case 'bold':
                return `<strong>${content}</strong>`

            case 'code':
                return `<code>${content}</code>`

            case 'italic':
                return `<em>${content}</em>`

            default:
                return content
        }
    },
    transformNode(type, attrs, content) {
        switch (type) {
            case 'paragraph':
                return `<p>${content}</p>`
            case 'heading':
                return `<h${attrs?.level || 1}>${content}</h${
                    attrs?.level || 1
                }>`
            case 'blockquote':
                return `<blockquote>${content}</blockquote>`
            case 'bulletList':
                return `<ul>${content}</ul>`
            case 'orderedList':
                return `<ol>${content}</ol>`
            case 'listItem':
                return `<li>${content}</li>`
            case 'horizontalRule':
                return `<hr/>`
            default:
                return content
        }
    },
})
```

The SDK provides built-in content transformers for the following outputs:

- Basic HTML

- [Dev.to](http://Dev.to) platform-compatible Markdown

- [Hashnode](https://hashnode.com/) platform-compatible Markdown

### Astro integration

Vrite Astro integration makes integrating Vrite with your Astro-powered website really easy!

Start by adding Vrite plugin in the Astro config:

```JavaScript
import { defineConfig } from 'astro/config'
import { vritePlugin } from '@vrite/sdk/astro'

export default defineConfig({
    integrations: [
        // ...
        vritePlugin({
            accessToken: '[YOUR_ACCESS_TOKEN]',
            contentGroupId: '[CONTENT_GROUP_ID]',
        }),
        // ...
    ],
})
```

In the configuration provide both your **API access token**, as well as the **ID of the content group** containing the posts for publishing on the Astro website.

If you're using **TypeScript**, add the following to your _tsconfig.json_, under `compilerOptions.types`:

```JSON
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

  - `limit?: number | "all" = 50` — how many content pieces to retrive; `"all"` retrieves all of them, in batches of 50;

  - `startPage?: number = 1` — if `limit` is a number and pagination is used, what page to start retriving content pieces from?

  - `tagId?: string` — Tag ID, if you want to filter results by specific tag.

- `getStaticPaths` — shortcut function for easy re-export when using Vrite SSG and inside _[slug].astro_ file. It returns `params.slug` as content piece's slug and all basic content piece properies as `props`.
