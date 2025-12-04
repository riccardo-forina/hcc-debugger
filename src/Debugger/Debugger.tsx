import { ChromeUser } from '@redhat-cloud-services/types';
import React, { useState } from 'react';

import { Entitlements } from './Entitlements';
import { Flags } from './Flags';
import { Roles } from './Roles';
import { ActiveModule } from './ActiveModule';

import {
  Grid,
  GridItem,
  Tab,
  TabContent,
  TabTitleText,
  Tabs,
} from '@patternfly/react-core';
import './Debugger.scss';

export type DebuggerModalProps = {
  user: ChromeUser;
};

export const Debugger = ({ user }: DebuggerModalProps) => {
  const [activeTabKey, setActiveTabKey] = useState<string | number>(0);

  const handleTabClick = (
    _event: React.MouseEvent<unknown> | React.KeyboardEvent | MouseEvent,
    tabIndex: string | number,
  ) => {
    setActiveTabKey(tabIndex);
  };

  return (
    <Grid hasGutter style={{ overflowY: 'hidden' }}>
      <GridItem>
        <Tabs
          activeKey={activeTabKey}
          onSelect={handleTabClick}
          aria-label="Chrome debugger tabs"
          role="region"
        >
          <Tab
            eventKey={0}
            title={<TabTitleText>Module</TabTitleText>}
            tabContentId="module-tab"
          />
          <Tab
            eventKey={1}
            title={<TabTitleText>Flags</TabTitleText>}
            tabContentId="flags-tab"
          />
          <Tab
            eventKey={2}
            title={<TabTitleText>Entitlements</TabTitleText>}
            tabContentId="entitlements-tab"
          />
          <Tab
            eventKey={3}
            title={<TabTitleText>Roles</TabTitleText>}
            tabContentId="roles-tab"
          />
        </Tabs>
      </GridItem>
      <GridItem style={{ overflowY: 'auto' }}>
        <TabContent eventKey={0} id="module-tab" hidden={activeTabKey !== 0}>
          <ActiveModule />
        </TabContent>
        <TabContent
          eventKey={1}
          id="flags-tab"
          hidden={activeTabKey !== 1}
          style={{
            display: activeTabKey === 1 ? 'flex' : 'none',
            height: '100%',
          }}
        >
          <Flags />
        </TabContent>
        <TabContent
          eventKey={2}
          id="entitlements-tab"
          hidden={activeTabKey !== 2}
          style={{
            display: activeTabKey === 2 ? 'flex' : 'none',
            height: '100%',
          }}
        >
          <Entitlements user={user} />
        </TabContent>
        <TabContent
          eventKey={3}
          id="roles-tab"
          hidden={activeTabKey !== 3}
          style={{
            display: activeTabKey === 3 ? 'flex' : 'none',
            height: '100%',
          }}
        >
          <Roles user={user} />
        </TabContent>
      </GridItem>
    </Grid>
  );
};
