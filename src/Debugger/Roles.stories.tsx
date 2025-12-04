import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { expect, userEvent, within } from 'storybook/test';
import { Roles } from './Roles';
import {
  mockPermissions,
  mockPermissionsMany,
  mockUser,
} from './mocks/chromeMock';

const meta: Meta<typeof Roles> = {
  title: 'Debugger/Roles',
  component: Roles,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof Roles>;

export const Default: Story = {
  args: {
    user: mockUser,
  },
  parameters: {
    chrome: {
      permissions: mockPermissions,
    },
  },
};

export const ManyPermissions: Story = {
  args: {
    user: mockUser,
  },
  parameters: {
    chrome: {
      permissions: mockPermissionsMany,
    },
  },
};

export const NoPermissions: Story = {
  args: {
    user: mockUser,
  },
  parameters: {
    chrome: {
      permissions: [],
    },
  },
};

export const SearchTest: Story = {
  args: {
    user: mockUser,
  },
  parameters: {
    chrome: {
      permissions: mockPermissions,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for loading to finish
    await new Promise((resolve) => setTimeout(resolve, 100));

    const searchInput = canvas.getByPlaceholderText('Search permissions...');
    await userEvent.type(searchInput, 'inventory');

    // Verify filtering happened
    const countText = canvas.getByText(/\d+ of \d+/);
    expect(countText).toBeInTheDocument();
  },
};

export const AppFilterTest: Story = {
  args: {
    user: mockUser,
  },
  parameters: {
    chrome: {
      permissions: mockPermissions,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for loading to finish
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Find and click the app dropdown
    const dropdown = canvas.getByText(/All apps/);
    await userEvent.click(dropdown);
  },
};
