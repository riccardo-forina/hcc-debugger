import React, { useEffect, useMemo, useState } from 'react';
import { ChromeUser } from '@redhat-cloud-services/types';
import useChrome from '@redhat-cloud-services/frontend-components/useChrome';
import {
  DataList,
  DataListCell,
  DataListItem,
  DataListItemCells,
  DataListItemRow,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Label,
  MenuToggle,
  SearchInput,
  Select,
  SelectList,
  SelectOption,
  Spinner,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';

export interface RolesProps {
  user: ChromeUser;
}

interface ParsedPermission {
  raw: string;
  app: string;
  resource: string;
  operation: string;
}

export const Roles = (props: RolesProps) => {
  const { getUserPermissions } = useChrome();
  const [permissions, setPermissions] = useState<ParsedPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [isAppSelectOpen, setIsAppSelectOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function getPermissions() {
      try {
        const userPermissions = await getUserPermissions();
        if (cancelled) return;

        // Deduplicate permissions
        const seen = new Set<string>();
        const parsed: ParsedPermission[] = [];

        for (const p of userPermissions as { permission: string }[]) {
          if (seen.has(p.permission)) continue;
          seen.add(p.permission);

          const parts = p.permission.split(':');
          parsed.push({
            raw: p.permission,
            app: parts[0] || 'unknown',
            resource: parts[1] || '*',
            operation: parts[2] || '*',
          });
        }

        setPermissions(parsed);
      } catch (error) {
        console.error('Failed to fetch permissions:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    getPermissions();
    return () => {
      cancelled = true;
    };
  }, [getUserPermissions]);

  // Get unique apps for filtering
  const apps = useMemo(() => {
    const appSet = new Set(permissions.map((p) => p.app));
    return Array.from(appSet).sort();
  }, [permissions]);

  const filteredPermissions = useMemo(() => {
    let result = [...permissions];

    // Filter by search
    if (searchValue) {
      const lowerSearch = searchValue.toLowerCase();
      result = result.filter((p) => p.raw.toLowerCase().includes(lowerSearch));
    }

    // Filter by app
    if (selectedApp) {
      result = result.filter((p) => p.app === selectedApp);
    }

    // Sort by app, then resource, then operation
    result.sort((a, b) => {
      if (a.app !== b.app) return a.app.localeCompare(b.app);
      if (a.resource !== b.resource)
        return a.resource.localeCompare(b.resource);
      return a.operation.localeCompare(b.operation);
    });

    return result;
  }, [permissions, searchValue, selectedApp]);

  // Group permissions by app for display
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, ParsedPermission[]> = {};
    filteredPermissions.forEach((p) => {
      if (!groups[p.app]) {
        groups[p.app] = [];
      }
      groups[p.app].push(p);
    });
    return groups;
  }, [filteredPermissions]);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
        }}
      >
        <Spinner size="lg" />
      </div>
    );
  }

  if (permissions.length === 0) {
    return (
      <EmptyState>
        <EmptyStateBody>
          No permissions found for {props.user.identity.user?.username}
        </EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
      }}
    >
      <Toolbar style={{ flexShrink: 0 }} className="pf-v6-u-px-md">
        <ToolbarContent>
          <ToolbarGroup>
            <ToolbarItem>
              <SearchInput
                placeholder="Search permissions..."
                value={searchValue}
                onChange={(_event, value) => setSearchValue(value)}
                onClear={() => setSearchValue('')}
                aria-label="Search permissions"
              />
            </ToolbarItem>
            <ToolbarItem variant="pagination" align={{ default: 'alignEnd' }}>
              {filteredPermissions.length} of {permissions.length}
            </ToolbarItem>
          </ToolbarGroup>
        </ToolbarContent>
        <ToolbarContent>
          <ToolbarGroup>
            <ToolbarItem>
              <Select
                isOpen={isAppSelectOpen}
                selected={selectedApp}
                onSelect={(_event, value) => {
                  setSelectedApp(value === 'all' ? null : (value as string));
                  setIsAppSelectOpen(false);
                }}
                onOpenChange={setIsAppSelectOpen}
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setIsAppSelectOpen(!isAppSelectOpen)}
                    isExpanded={isAppSelectOpen}
                    style={{ minWidth: '180px' }}
                  >
                    {selectedApp || `All apps (${apps.length})`}
                  </MenuToggle>
                )}
              >
                <SelectList>
                  <SelectOption value="all" isSelected={selectedApp === null}>
                    All apps ({apps.length})
                  </SelectOption>
                  {apps.map((app) => (
                    <SelectOption
                      key={app}
                      value={app}
                      isSelected={selectedApp === app}
                    >
                      {app}
                    </SelectOption>
                  ))}
                </SelectList>
              </Select>
            </ToolbarItem>
          </ToolbarGroup>
        </ToolbarContent>
      </Toolbar>
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <DataList aria-label="Permissions list" isCompact>
          {Object.entries(groupedPermissions).map(([app, perms]) => (
            <React.Fragment key={app}>
              <DataListItem aria-labelledby={`app-${app}`}>
                <DataListItemRow>
                  <DataListItemCells
                    dataListCells={[
                      <DataListCell key="header">
                        <Flex
                          alignItems={{ default: 'alignItemsCenter' }}
                          spaceItems={{ default: 'spaceItemsSm' }}
                        >
                          <FlexItem>
                            <strong
                              id={`app-${app}`}
                              style={{
                                color:
                                  'var(--pf-v6-global--primary-color--100)',
                              }}
                            >
                              {app}
                            </strong>
                          </FlexItem>
                          <FlexItem>
                            <Label isCompact color="grey">
                              {perms.length} permission
                              {perms.length > 1 ? 's' : ''}
                            </Label>
                          </FlexItem>
                        </Flex>
                      </DataListCell>,
                    ]}
                  />
                </DataListItemRow>
              </DataListItem>
              {perms.map((perm, idx) => (
                <DataListItem
                  key={`${perm.raw}-${idx}`}
                  aria-labelledby={`perm-${perm.raw}`}
                >
                  <DataListItemRow>
                    <DataListItemCells
                      dataListCells={[
                        <DataListCell key="primary">
                          <Flex
                            alignItems={{ default: 'alignItemsCenter' }}
                            spaceItems={{ default: 'spaceItemsSm' }}
                            style={{ paddingLeft: '16px' }}
                          >
                            <FlexItem>
                              <span id={`perm-${perm.raw}`}>
                                <span
                                  style={{
                                    color: 'var(--pf-v6-global--Color--200)',
                                  }}
                                >
                                  {perm.resource}
                                </span>
                                <span
                                  style={{
                                    color: 'var(--pf-v6-global--Color--400)',
                                  }}
                                >
                                  :
                                </span>
                                <span style={{ fontWeight: 500 }}>
                                  {perm.operation}
                                </span>
                              </span>
                            </FlexItem>
                          </Flex>
                        </DataListCell>,
                      ]}
                    />
                  </DataListItemRow>
                </DataListItem>
              ))}
            </React.Fragment>
          ))}
        </DataList>
      </div>
    </div>
  );
};
