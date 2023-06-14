---
title: Publishing Content
category: Usage Guide
slug: publishing
---

With Vrite’s unique features like Kanban-based content management, the actual publishing flow is quite unique. All you have to do to publish a piece can be just drag and drop.

## Dedicated Content Group

The recommended approach is to create a **dedicated**, ideally **locked**, **content group** for publishing, with an easily-identifiable name e.g. _Published_. You can then move any content piece that's ready to be published, to this content group.

![](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/OwTKZrTdtlFUTAKUZrLlg.png)

You can then access all the content pieces from this group using either [the API](https://generator.swagger.io/?url=https://api.vrite.io/swagger.json) or the [JavaScript SDK](https://github.com/vriteio/sdk-js). You can also set up automatic publishing by creating dedicated Webhooks that send messages to your server whenever an event is triggered by the given content group.

## Publishing with Vrite Extensions

Vrite Extensions simplify the setup process you have to go through to publish your content pieces to popular platforms like [Dev.to](https://dev.to/), [Hashnode](https://hashnode.com/), or [Medium](https://medium.com/). All you have to do is install the Extension and a custom Webhook handling auto-publishing will be added for you. Additionally, you’ll also be able to publish manually from the Extension’s Content Piece View. You can learn more about Vrite Extensions [here](/vrite-extensions).

## More Resources

Given that Vrite is in Public Beta, it’s constantly evolving and new content delivery methods, alongside more resources on how to implement them, are on the way. Below you can check out related articles from the Vrite blog:

- **[Better blogging on Dev.to with Vrite - headless CMS for technical content](https://vrite.io/blog/better-blogging-on-dev-to-with-vrite-headless-cms-for-technical-content/)** - a guide on implementing a custom Webhook for auto-publishing your content to [the DEV platform](https://dev.to/), using Vrite API and **Content Transformers**.
- [**Start programming blog in minutes with Astro and Vrite**](https://vrite.io/blog/start-programming-blog-in-minutes-with-astro-and-vrite/) - a guide on using Vrite’s dedicated [Astro](https://astro.build/) integration to build a static blog really fast;
