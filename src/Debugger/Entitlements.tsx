import React from 'react';
import { Table, Tbody, Th, Thead, Tr } from '@patternfly/react-table';
import { ChromeUser } from '@redhat-cloud-services/types';
import useChrome from '@redhat-cloud-services/frontend-components/useChrome';

export interface EntitlementsProps {
  user: ChromeUser;
}

export const Entitlements = (props: EntitlementsProps) => {
  const entitlements = Object.entries(props.user.entitlements).reduce(
    (acc, [key, entitlement]) => ({
      ...acc,
      [`entitlements_${key}`]: entitlement.is_entitled,
      [`entitlements_${key}_trial`]: entitlement.is_trial,
    }),
    {}
  );

  return (
    <Table variant="compact">
      <Thead>
        <Tr>
          <Th>Entitlements given to {props.user.identity.user?.username}</Th>
        </Tr>
      </Thead>
      <Tbody>
        {Object.entries(entitlements).map((val, index) => {
          //remove entitlement if false
          if (val[1] === true) {
            return (
              <tr key={index}>
                <td>{val[0].replace(/entitlements_/g, '')}</td>
              </tr>
            );
          } else {
            return null;
          }
        })}
      </Tbody>
    </Table>
  );
};

