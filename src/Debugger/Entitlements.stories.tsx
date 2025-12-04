import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { expect, userEvent, within } from 'storybook/test';
import { Entitlements } from './Entitlements';
import {
  mockUser,
  mockUserAllEntitled,
  mockUserManyTrials,
  mockUserNoneEntitled,
} from './mocks/chromeMock';

const meta: Meta<typeof Entitlements> = {
  title: 'Debugger/Entitlements',
  component: Entitlements,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div
        style={{ height: '500px', display: 'flex', flexDirection: 'column' }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Entitlements>;

export const Default: Story = {
  args: {
    user: mockUser,
  },
};

export const AllEntitled: Story = {
  args: {
    user: mockUserAllEntitled,
  },
};

export const NoneEntitled: Story = {
  args: {
    user: mockUserNoneEntitled,
  },
};

export const ManyTrials: Story = {
  args: {
    user: mockUserManyTrials,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trialLabels = canvas.getAllByText('trial');
    expect(trialLabels.length).toBeGreaterThan(0);
  },
};

export const SearchTest: Story = {
  args: {
    user: mockUser,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const searchInput = canvas.getByPlaceholderText('Search entitlements...');
    await userEvent.type(searchInput, 'insights');
    expect(canvas.getByText('insights')).toBeInTheDocument();
  },
};

export const FilterTest: Story = {
  args: {
    user: mockUser,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const entitledButton = canvas.getByText(/Entitled \(\d+\)/);
    await userEvent.click(entitledButton);
    // Should only show entitled items now
  },
};
