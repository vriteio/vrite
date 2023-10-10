---
title: "Vrite Extensions"
slug: "/usage-guide/vrite-extensions"
---

Vrite Extensions are meant to make Vrite both more customizable and easier to use. With direct access to Vrite API and the ability to extend Vrite’s UI, they have the ability to vastly improve your experience with Vrite.

The Extensions specification and related APIs are in the early stages and we continue to stabilize and improve them. The goal is to create a platform that all users can build on. However, for now, only first-party extensions are available, which include:

- **Hashnode** — automatically publishes and updates articles on [Hashnode](https://hashnode.com/);
- **Dev.to** — automatically publishes and updates articles on [Dev.to](https://dev.to/);
- **Medium** — automatically publishes articles to Medium;
- **GPT-3.5** — integrates OpenAI's GPT-3.5 into the Vrite Editor;

## Installing Extensions

You can install Extensions from the _Extensions_ side panel, where you’ll see a list of both _Installed_ and _Available_ Extensions. You can install any of the available Extensions using the _Install_ button.

![Extensions side panel](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/dVqrDeIarqVHle9GIe7Kr.png)

Once installed, you’ll be taken to the Extension’s _Configuration View_. Not every extension has to implement it, but the ones that do provide a list of options for you to configure. To do so, you should fill out the fields (especially the required ones) and save your options with the _Configure_ button.

![Configuring the Hashnode extension](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/xMhNCJ7ono1NQHBT7B_T9.png)

In case you decide to uninstall the extension afterwards, you can do so with the _Delete_ button.

## Content Piece View

Extensions can implement _Content Piece Views_ which can be accessed from the Extension section of the content piece side panel.

![Dev.to extension's Content Piece View](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/zV6agIhYVifXY7fege9Mv.png)

Here you’ll be able to configure custom metadata supported by the Extension for the given content piece. All of it will be saved to the content piece’s custom JSON metadata and accessible from the _Custom data_ section.

Apart from that Extensions can also use the View to implement content-piece-related actions like manual publishing or updating of the content piece on an external platform.

## Block Actions

Block Actions allow Extensions to add custom actions to the editor’s top-level block nodes, like images, embeds, and paragraphs. These can either directly perform an action, processing or updating the given block, or open a _Block Action View_ for more input from the user.

![GPT-3.5 extension's block action](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/PTF40QFv6avcdh__zJl_O.png)

## API Access

Every Extension has access to its own Access token with necessary permissions, generated upon installation. It allows them to access the Vrite API directly from the UI and perform actions like installing Webhooks, managing content groups, etc.

You can see the tokens used by the Extensions in the _API_ settings section, with a special _Extension_ label:

![Access tokens created for Extensions](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/TDKoIbxhtdp2jIyK32B7d.png)

These can only be removed by uninstalling the related Extension.

The same is applicable for all Webhooks added by the Extensions through the API.

![Webhook added by Hashnode Extension](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/AZfCYlwn4Pl9FBdEq3cU-.png)
