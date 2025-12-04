import React, { useMemo, useState } from 'react';
import { ChromeUser } from '@redhat-cloud-services/types';
import {
  DataList,
  DataListCell,
  DataListItem,
  DataListItemCells,
  DataListItemRow,
  Flex,
  FlexItem,
  Icon,
  Label,
  SearchInput,
  ToggleGroup,
  ToggleGroupItem,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import CheckCircleIcon from '@patternfly/react-icons/dist/esm/icons/check-circle-icon';
import TimesCircleIcon from '@patternfly/react-icons/dist/esm/icons/times-circle-icon';

export interface EntitlementsProps {
  user: ChromeUser;
}

interface EntitlementInfo {
  name: string;
  isEntitled: boolean;
  isTrial: boolean;
}

type EntitlementFilter = 'all' | 'entitled' | 'not-entitled';

export const Entitlements = (props: EntitlementsProps) => {
  const [searchValue, setSearchValue] = useState('');
  const [filter, setFilter] = useState<EntitlementFilter>('all');

  const entitlements: EntitlementInfo[] = useMemo(() => {
    return Object.entries(props.user.entitlements).map(
      ([key, entitlement]) => ({
        name: key,
        isEntitled: entitlement.is_entitled,
        isTrial: entitlement.is_trial,
      }),
    );
  }, [props.user.entitlements]);

  const filteredEntitlements = useMemo(() => {
    let result = [...entitlements];

    // Filter by search
    if (searchValue) {
      const lowerSearch = searchValue.toLowerCase();
      result = result.filter((e) => e.name.toLowerCase().includes(lowerSearch));
    }

    // Filter by status
    if (filter === 'entitled') {
      result = result.filter((e) => e.isEntitled);
    } else if (filter === 'not-entitled') {
      result = result.filter((e) => !e.isEntitled);
    }

    // Sort alphabetically
    result.sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [entitlements, searchValue, filter]);

  const entitledCount = entitlements.filter((e) => e.isEntitled).length;
  const trialCount = entitlements.filter((e) => e.isTrial).length;

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
                placeholder="Search entitlements..."
                value={searchValue}
                onChange={(_event, value) => setSearchValue(value)}
                onClear={() => setSearchValue('')}
                aria-label="Search entitlements"
              />
            </ToolbarItem>
            <ToolbarItem variant="pagination" align={{ default: 'alignEnd' }}>
              {filteredEntitlements.length} of {entitlements.length}
            </ToolbarItem>
          </ToolbarGroup>
        </ToolbarContent>
        <ToolbarContent>
          <ToolbarGroup>
            <ToolbarItem>
              <ToggleGroup aria-label="Filter by entitlement status">
                <ToggleGroupItem
                  text="All"
                  buttonId="filter-all"
                  isSelected={filter === 'all'}
                  onChange={() => setFilter('all')}
                />
                <ToggleGroupItem
                  text={`Entitled (${entitledCount})`}
                  buttonId="filter-entitled"
                  isSelected={filter === 'entitled'}
                  onChange={() => setFilter('entitled')}
                />
                <ToggleGroupItem
                  text="Not Entitled"
                  buttonId="filter-not-entitled"
                  isSelected={filter === 'not-entitled'}
                  onChange={() => setFilter('not-entitled')}
                />
              </ToggleGroup>
            </ToolbarItem>
            {trialCount > 0 && (
              <ToolbarItem>
                <Label color="blue" isCompact>
                  {trialCount} trial{trialCount > 1 ? 's' : ''}
                </Label>
              </ToolbarItem>
            )}
          </ToolbarGroup>
        </ToolbarContent>
      </Toolbar>
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <DataList aria-label="Entitlements list" isCompact>
          {filteredEntitlements.map(({ name, isEntitled, isTrial }) => (
            <DataListItem key={name} aria-labelledby={`entitlement-${name}`}>
              <DataListItemRow>
                <DataListItemCells
                  dataListCells={[
                    <DataListCell key="primary">
                      <Flex
                        alignItems={{ default: 'alignItemsCenter' }}
                        spaceItems={{ default: 'spaceItemsSm' }}
                      >
                        <FlexItem>
                          <Icon status={isEntitled ? 'success' : 'danger'}>
                            {isEntitled ? (
                              <CheckCircleIcon />
                            ) : (
                              <TimesCircleIcon />
                            )}
                          </Icon>
                        </FlexItem>
                        <FlexItem>
                          <strong id={`entitlement-${name}`}>{name}</strong>
                        </FlexItem>
                        {isTrial && (
                          <FlexItem>
                            <Label color="blue" isCompact>
                              trial
                            </Label>
                          </FlexItem>
                        )}
                      </Flex>
                    </DataListCell>,
                  ]}
                />
              </DataListItemRow>
            </DataListItem>
          ))}
        </DataList>
      </div>
    </div>
  );
};
