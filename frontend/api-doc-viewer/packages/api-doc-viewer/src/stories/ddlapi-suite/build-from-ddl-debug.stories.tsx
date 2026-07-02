import type { Meta, StoryObj } from "@storybook/react";
import { BuildFromDdlDebug, DEFAULT_DDL } from "./BuildFromDdlDebug";

const meta = {
  title: "Debug/DDL API from DDL SQL",
  component: BuildFromDdlDebug,
  argTypes: {
    ddlText: {
      control: "text",
    },
  },
  args: {
    ddlText: DEFAULT_DDL,
  },
} satisfies Meta<typeof BuildFromDdlDebug>;

export default meta;

type Story = StoryObj<typeof BuildFromDdlDebug>;

export const Debug: Story = {};
