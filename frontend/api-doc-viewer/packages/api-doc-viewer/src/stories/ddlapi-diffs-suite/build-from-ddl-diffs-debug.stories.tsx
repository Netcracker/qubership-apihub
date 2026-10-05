import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import {
  BuildFromDdlDiffsDebug,
  DEFAULT_AFTER_DDL,
  DEFAULT_BEFORE_DDL,
} from "./BuildFromDdlDiffsDebug";

type StoryArgs = ComponentProps<typeof BuildFromDdlDiffsDebug>;

const meta = {
  title: "Debug/DDL API Diffs from DDL SQL",
  component: BuildFromDdlDiffsDebug,
  argTypes: {
    beforeSql: {
      control: "text",
    },
    afterSql: {
      control: "text",
    },
    displayMode: {
      control: "select",
      options: ["simple", "detailed"],
      defaultValue: "detailed",
    },
  },
  args: {
    beforeSql: DEFAULT_BEFORE_DDL,
    afterSql: DEFAULT_AFTER_DDL,
    displayMode: "detailed",
  },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<StoryArgs>;

export const Debug: Story = {};
