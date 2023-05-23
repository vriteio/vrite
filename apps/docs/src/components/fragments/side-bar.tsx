import type { Component } from "solid-js";
import { Card, Button, IconButton } from "#components/primitives";
import { logoIcon } from "#icons/logo";

const SideBar: Component = () => {
  return (
    <Card class="sticky top-0 h-screen flex-col justify-start items-start z-50 min-w-80 max-w-80 m-0 border-y-0 border-l-0 rounded-none hidden md:flex">
      <div class="flex items-center justify-start pb-4">
        <IconButton
          path={logoIcon}
          color="primary"
          link="/"
          class="bg-gradient-to-tr from-red-500 to-orange-500"
        />
        <span class="flex-1 text-2xl font-extrabold text-gray-600 dark:text-gray-200">rite</span>
      </div>
      <div class="flex flex-col w-full">
        <Button variant="text" class="text-start w-full font-bold">
          Usage guide
        </Button>

        <div class="flex flex-1 w-full pl-4">
          <div class="w-0.5 bg-gray-200 dark:bg-gray-700 mr-2 rounded-full"></div>
          <div class="flex-1">
            <Button variant="text" class="text-start w-full" text="base" color="primary">
              Getting started
            </Button>
            <Button variant="text" class="text-start w-full" text="soft">
              Managing content in Kanban dashboard
            </Button>
          </div>
        </div>
      </div>
      <Button variant="text" class="text-start w-full" text="soft">
        API Documentation
      </Button>
      <Button variant="text" class="text-start w-full" text="soft">
        Self-hosting
      </Button>
      <Button variant="text" class="text-start w-full" text="soft">
        JS SDK
      </Button>
    </Card>
  );
};

export { SideBar };
