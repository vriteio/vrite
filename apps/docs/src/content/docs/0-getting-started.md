---
title: Getting Started with Vrite
category: Usage Guide
slug: getting-started
---

**Vrite** (Public Beta) is a headless CMS, made with technical, programming-related content in mind. Combining great project management frameworks like Kanban with state-of-the-art WYSIWYG editor and support for real-time collaboration, Vrite is a CMS unlike any other.

## Vrite’s Features

Currently, while we’re working on fixing bugs and adding more features, Vrite is in **Public Beta**. That said, it already has a ton of features for your to try out, including:

- Modern, clean UI/UX;
- Built-in **Kanban dashboard** for easily managing your content production process at any scale;
- WYSIWYG content editor with support for **Markdown** and keyboard shortcuts, real-time collaboration, and more;
- Editing experiece tailored for technical writing with **integrated code editor**, featuring code highlighting, autocompletion and formatting (for supported languages);
- **API** and **Webhook** access for easy integration with any frontend;
- Detailed permission system for managing access in teams at any size;

## Signing into Vrite

To sign into Vrite Cloud, go to [https://app.vrite.io/auth](https://app.vrite.io/auth). Here you can do one of the following:

- Sign up by clicking I don’t have an account and providing your new username, in addition to unique email and password; You’ll be sent a link to confirm your email address and finalize the process.
- Sign in or sign up via GitHub by clicking the _GitHub_ button and going through the OAuth process;
- Sign in using the email and password form;
- Sign in using the _Magic Link_, by providing an email to which a sign-in link will be sent to. It’s also useful when you forgot your password;

![Vrite sign-in page](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/nFCR9EmtUIUG1WcReL2ec.png)

## Organization Concepts in Vrite

Vrite organizes all your content and data with 3 primary concepts. It’s worth understanding them and their roles in the system:

- **Workspaces** - essentially separate units that house many content groups, settings configuring API access or editing experience, and details about your entire team and their roles; You can create or be invited to any number of Workspaces.
- **Content groups** - equivalent to columns in the Kanban dashboard; Their meant as the most important way of organizing your content pieces and can help manage content production, and publishing;
- **Content pieces** - equivalent to cards in the Kanban column; They house the actual content, as well as the related metadata;

## Navigating Around Vrite

![Vrite UI](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/rhLxLq8fXExjujppGMioW.png)

To easily navigate around Vrite, you need to get to know the 3 main parts of the UI:

- **Side menu** - used to navigate between different sections of the UI;
- **Side panel** - where most side-activities like configuration, metadata editing and team management takes place; You can easily resize or even collapse it entirely by dragging its right-side border;
- **Main view** - the largest area of the viewport, focused primarly on content management (via Kanban dashboard) and editing (in WYSIWYG editor);

### Side Menu

The side menu is used as the primary means of navigation around Vrite UI. It’s visibly separated into two sections.

**Top section** - Contains the options that lets you navigate the main view and often the side panel too:

- _Dashboard_ - Takes you to a Kanban dashboard and opens a metadata side panel (if a content piece is opened);
- _Editor_ - Takes you to the Vrite editor and opens the metadata side panel, loading the opened content piece in both;

**Bottom section** - Contains options for navigating the side panel or going to other parts of Vrite UI.

- _Settings_ - Opens the settings side panel;
- _Switch Workspace_ - Navigates to Workspace switching menu;
- _Profile_ - Open the profile dropdown displaying details of the signed-in user and other options;

**Profile menu** contains useful information and options like:

- Profile card - Displays user’s profile image and username, alongside a _Logout_ button;
- _Help_ - Opens the _Welcome_ side panel with helpful links;
- _GitHub_ and _Discord_ - links to Vrite repository and community on respective platforms, for quickly getting help or reporting bugs;

![Vrite profile menu](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/AAiK-Le7qCLBzmlpcRvb6.png)

### Using Workspaces

Given that Workspaces are the top-most organizational unit, allowing you to switch between entire teams and Kanbans, there’s a special interface for them (_Switch Workspace_ in the side-menu).

![Workspace switching menu](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/2VuOAx5D8ZUgG3fVjGCEW.png)

From here you can see a list of all the Workspaces you’re a member of, with recognizable information like their **name**, **logo** and **your role** in them.

You can also create a new one by clicking the _New Workspace_ button in the top-right corner.

![Creating a new Workspace](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/DfTQ8et6exZUd7bVViHYE.png)

Provide a name for the new Workspace and optionally a description and a logo. Then click _Create Workspace_ in the top-right corner and select the newly-created Workspace from the list to switch to it.
