import React from 'react';
import { Table, Tbody, Th, Thead, Tr } from '@patternfly/react-table';
import { ChromeUser } from '@redhat-cloud-services/types';
import useChrome from '@redhat-cloud-services/frontend-components/useChrome';

export interface RolesProps {
  user: ChromeUser;
}

export const Roles = (props: RolesProps) => {
  const [permissions, setPermissions] = React.useState<{ [key: string]: React.ReactNode }>({});
  const chrome = useChrome();
  React.useEffect(() => {
    async function getPermissions() {
      const userPermissions = await chrome.getUserPermissions();
      const userPermissionsList = Object.entries(userPermissions).reduce(
        (acc, [key, userPermission]) => ({
          ...acc,
          [`userPermissionsList_${key}`]: userPermission.permission,
        }),
        {}
      );
      setPermissions(userPermissionsList);
    }
    getPermissions();
  }, []);

  return (
    <Table variant="compact">
      <Thead>
        <Tr>
          <Th>Roles given to {props.user.identity.user?.username}</Th>
        </Tr>
      </Thead>
      <Tbody>
        {Object.entries(permissions).map((val, index) => {
          //remove entitlement if false
          if (val[1] === true) {
            return (
              <tr key={index}>
                <td>{val[0].replace(/Roles_/g, '')}</td>
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

