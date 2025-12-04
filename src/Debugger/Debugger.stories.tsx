import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { expect, userEvent, within } from 'storybook/test';
import {
  Content,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
} from '@patternfly/react-core';
import { Debugger } from './Debugger';
import { mockUser } from './mocks/chromeMock';

const DebuggerInDrawer = () => {
  const drawerPanel = (
    <DrawerPanelContent widths={{ default: 'width_50' }}>
      <DrawerHead>
        <strong>Chrome Debugger</strong>
      </DrawerHead>
      <DrawerPanelBody>
        <Debugger user={mockUser} />
      </DrawerPanelBody>
    </DrawerPanelContent>
  );

  return (
    <Drawer isExpanded={true} isInline>
      <DrawerContent panelContent={drawerPanel}>
        <DrawerContentBody>
          <Content>
            <h1>Application Content</h1>
            <p>The debugger drawer is shown on the right.</p>
          </Content>
        </DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};

const meta: Meta<typeof DebuggerInDrawer> = {
  title: 'Debugger/Debugger',
  component: DebuggerInDrawer,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '100vh' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DebuggerInDrawer>;

/**
 * The Debugger shown in a drawer panel.
 */
export const Default: Story = {};

/**
 * Test switching between tabs
 */
export const TabSwitching: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Click on Flags tab
    await userEvent.click(canvas.getByText('Flags'));
    expect(canvas.getByPlaceholderText('Search flags...')).toBeInTheDocument();

    // Click on Entitlements tab
    await userEvent.click(canvas.getByText('Entitlements'));
    expect(
      canvas.getByPlaceholderText('Search entitlements...'),
    ).toBeInTheDocument();

    // Click on Roles tab
    await userEvent.click(canvas.getByText('Roles'));
    expect(
      canvas.getByPlaceholderText('Search permissions...'),
    ).toBeInTheDocument();
  },
};
