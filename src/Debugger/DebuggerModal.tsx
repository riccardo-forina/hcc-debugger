import React, { useState } from 'react';
import { Button } from '@patternfly/react-core/dist/dynamic/components/Button';
import { Modal, ModalVariant } from '@patternfly/react-core/dist/dynamic/deprecated/components/Modal';
import { BugIcon } from '@patternfly/react-icons/dist/dynamic/icons/bug-icon';
import { ChromeUser } from '@redhat-cloud-services/types';

import { Entitlements } from './Entitlements';
import { Roles } from './Roles';
import { Flags } from './Flags';
import { DebuggerProvider } from './DebuggerContext';

import './Debugger.scss';
import { ModalHeader, ModalBody, Tabs, Tab, TabTitleText, GridItem, TabContent, Grid, DrawerHead, DrawerPanelBody } from '@patternfly/react-core';

export type DebuggerModalProps = {
  user: ChromeUser;
};

const Debugger = ({ user }: DebuggerModalProps) => {
  const [isOpen, setIsModalOpen] = useState(true);
  const [activeTabKey, setActiveTabKey] = useState<string | number>(0);
  // Toggle currently active tab
  const handleTabClick = (
    event: React.MouseEvent<any> | React.KeyboardEvent | MouseEvent,
    tabIndex: string | number
  ) => {
    setActiveTabKey(tabIndex);
  };

  return (
    <DebuggerProvider>
      <div className="hcc-debugger">
        <Button
          icon={<BugIcon />}
          ouiaId="debugger-button"
          className="chr-c-button-debugger"
          onClick={() => {
            setIsModalOpen(true);
          }}
        ></Button>
        <DrawerHead>
          Chrome Debugger
        </DrawerHead>
        <DrawerPanelBody>
          <Grid hasGutter>
            <GridItem>
              <Tabs
                activeKey={activeTabKey}
                onSelect={handleTabClick}
                aria-label="Chrome debugger tabs"
                role="region"
              >
                <Tab eventKey={0} title={<TabTitleText>Entitlements</TabTitleText>} tabContentId="entitlements-tab" />
                <Tab eventKey={1} title={<TabTitleText>Roles</TabTitleText>} tabContentId="roles-tab" />
                <Tab eventKey={2} title={<TabTitleText>Flags</TabTitleText>} tabContentId="flags-tab" />
              </Tabs>
            </GridItem>
            <GridItem>
              <TabContent eventKey={0} id="entitlements-tab" hidden={activeTabKey !== 0}>
                <Entitlements user={user} />
              </TabContent>
              <TabContent eventKey={1} id="roles-tab" hidden={activeTabKey !== 1}>
                <Roles user={user} />
              </TabContent>
              <TabContent eventKey={1} id="flags-tab" hidden={activeTabKey !== 2}>
                <Flags user={user} />
              </TabContent>
            </GridItem>
          </Grid>
        </DrawerPanelBody>
    </DebuggerProvider>
  );
};

