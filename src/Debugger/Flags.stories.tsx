import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { expect, userEvent, within } from 'storybook/test';
import { Flags } from './Flags';

const defaultFlags = [
  {
    name: 'platform.chrome.notifications',
    enabled: true,
    variant: { name: 'enabled' },
  },
  {
    name: 'platform.chrome.dark-mode',
    enabled: false,
    variant: { name: 'disabled' },
  },
  {
    name: 'platform.chrome.new-nav',
    enabled: true,
    variant: { name: 'enabled' },
  },
  {
    name: 'platform.insights.advisor-new-ui',
    enabled: true,
    variant: { name: 'variant-a', payload: { showBanner: true, maxItems: 10 } },
  },
  {
    name: 'platform.insights.inventory-groups',
    enabled: false,
    variant: { name: 'disabled' },
  },
  {
    name: 'platform.rbac.new-permissions',
    enabled: true,
    variant: { name: 'enabled' },
  },
  {
    name: 'platform.cost.enhanced-reports',
    enabled: false,
    variant: { name: 'disabled' },
  },
  {
    name: 'platform.sources.webhook-support',
    enabled: true,
    variant: { name: 'beta', payload: 'v2-webhooks' },
  },
];

const meta: Meta<typeof Flags> = {
  title: 'Debugger/Flags',
  component: Flags,
  parameters: {
    layout: 'fullscreen',
    flags: defaultFlags,
  },
};

export default meta;
type Story = StoryObj<typeof Flags>;

export const Default: Story = {};

export const AllEnabled: Story = {
  parameters: {
    flags: defaultFlags.map((f) => ({ ...f, enabled: true })),
  },
};

export const AllDisabled: Story = {
  parameters: {
    flags: defaultFlags.map((f) => ({ ...f, enabled: false })),
  },
};

export const WithPayloads: Story = {
  parameters: {
    flags: [
      {
        name: 'feature.complex-config',
        enabled: true,
        variant: {
          name: 'variant-a',
          payload: {
            theme: 'dark',
            maxItems: 50,
            features: ['search', 'filter'],
          },
        },
      },
      {
        name: 'feature.simple-string',
        enabled: true,
        variant: { name: 'beta', payload: 'beta-v2.1.0' },
      },
      {
        name: 'feature.numeric',
        enabled: true,
        variant: { name: 'limit', payload: 100 },
      },
      {
        name: 'feature.no-payload',
        enabled: true,
        variant: { name: 'enabled' },
      },
    ],
  },
};

export const ManyFlags: Story = {
  parameters: {
    flags: [
      ...defaultFlags,
      {
        name: 'platform.patch.new-ui',
        enabled: true,
        variant: { name: 'enabled' },
      },
      {
        name: 'platform.vulnerability.scanning',
        enabled: false,
        variant: { name: 'disabled' },
      },
      {
        name: 'platform.compliance.reports',
        enabled: true,
        variant: { name: 'enabled' },
      },
      {
        name: 'platform.drift.comparison',
        enabled: false,
        variant: { name: 'disabled' },
      },
      {
        name: 'platform.ros.recommendations',
        enabled: true,
        variant: { name: 'enabled' },
      },
      {
        name: 'platform.edge.fleet-management',
        enabled: true,
        variant: { name: 'enabled' },
      },
    ],
  },
};

export const SearchTest: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const searchInput = canvas.getByPlaceholderText('Search flags...');
    await userEvent.type(searchInput, 'chrome');

    // Verify only chrome flags shown
    expect(canvas.getByText(/3 of 8 flags/)).toBeInTheDocument();
  },
};

export const FilterTest: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Click "Enabled" filter
    await userEvent.click(canvas.getByText('Enabled'));
    expect(canvas.getByText(/5 of 8 flags/)).toBeInTheDocument();

    // Click "Disabled" filter
    await userEvent.click(canvas.getByText('Disabled'));
    expect(canvas.getByText(/3 of 8 flags/)).toBeInTheDocument();

    // Reset
    await userEvent.click(canvas.getByText('All'));
    expect(canvas.getByText(/8 of 8 flags/)).toBeInTheDocument();
  },
};

export const ToggleOverrideTest: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Find the dark-mode flag switch and toggle it
    const darkModeSwitch = canvas.getByLabelText(
      'Toggle platform.chrome.dark-mode',
    );
    await userEvent.click(darkModeSwitch);

    // Verify "overridden" label appears
    expect(canvas.getByText('overridden')).toBeInTheDocument();

    // Verify "Overridden" filter appears in toggle group
    expect(canvas.getByText(/Overridden \(1\)/)).toBeInTheDocument();
  },
};

export const ClearOverridesTest: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Toggle two flags
    await userEvent.click(
      canvas.getByLabelText('Toggle platform.chrome.dark-mode'),
    );
    await userEvent.click(
      canvas.getByLabelText('Toggle platform.insights.inventory-groups'),
    );

    // Verify 2 overrides
    expect(canvas.getByText(/Overridden \(2\)/)).toBeInTheDocument();
    expect(canvas.getByText(/Clear 2 overrides/)).toBeInTheDocument();

    // Clear all
    await userEvent.click(canvas.getByText(/Clear 2 overrides/));

    // Verify cleared
    expect(canvas.queryByText('overridden')).not.toBeInTheDocument();
  },
};
