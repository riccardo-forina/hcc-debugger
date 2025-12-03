import React, { useMemo, useState, useCallback } from 'react';
import { ChromeUser } from '@redhat-cloud-services/types';
import { useFlags, useUnleashClient, IToggle } from '@unleash/proxy-client-react';
import {
  Switch,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  ToolbarGroup,
  SearchInput,
  ToggleGroup,
  ToggleGroupItem,
  Label,
  Button,
  DataList,
  DataListItem,
  DataListItemRow,
  DataListItemCells,
  DataListCell,
  Flex,
  FlexItem,
} from '@patternfly/react-core';

export interface RolesProps {
  user: ChromeUser;
}

type EnabledFilter = 'all' | 'enabled' | 'disabled';

export const Flags = (props: RolesProps) => {
  const flags = useFlags();
  const client = useUnleashClient();
  const [searchValue, setSearchValue] = useState('');
  const [enabledFilter, setEnabledFilter] = useState<EnabledFilter>('all');
  // Store the original value of each overridden flag
  const [originalFlagValues, setOriginalFlagValues] = useState<Record<string, boolean>>({});

  const toggleFlagOverride = useCallback((flagName: string) => {
    // Access the internal toggles array
    const toggles = (client as unknown as { toggles: IToggle[] }).toggles;
    const toggle = toggles.find((t) => t.name === flagName);

    if (toggle) {
      const currentValue = toggle.enabled;
      const newValue = !currentValue;
      
      // Toggle the enabled state
      toggle.enabled = newValue;

      setOriginalFlagValues((prev) => {
        // If this is the first time overriding, store the original value
        if (!(flagName in prev)) {
          return { ...prev, [flagName]: currentValue };
        }
        
        // If toggling back to original value, remove from overridden list
        if (newValue === prev[flagName]) {
          const { [flagName]: _, ...rest } = prev;
          return rest;
        }
        
        return prev;
      });

      // Emit update event to trigger React re-render
      client.emit('update');
    }
  }, [client]);

  const resetAllOverrides = useCallback(() => {
    // Access the internal toggles array
    const toggles = (client as unknown as { toggles: IToggle[] }).toggles;
    
    // Restore all overridden flags to their original values
    Object.entries(originalFlagValues).forEach(([flagName, originalValue]) => {
      const toggle = toggles.find((t) => t.name === flagName);
      if (toggle) {
        toggle.enabled = originalValue;
      }
    });
    
    // Clear the tracking state
    setOriginalFlagValues({});
    
    // Emit update event to trigger React re-render
    client.emit('update');
  }, [client, originalFlagValues]);

  const filteredAndSortedFlags = useMemo(() => {
    let result = [...flags];

    // Filter by search
    if (searchValue) {
      const lowerSearch = searchValue.toLowerCase();
      result = result.filter((flag) => flag.name.toLowerCase().includes(lowerSearch));
    }

    // Filter by enabled status
    if (enabledFilter === 'enabled') {
      result = result.filter((flag) => flag.enabled);
    } else if (enabledFilter === 'disabled') {
      result = result.filter((flag) => !flag.enabled);
    }

    // Sort alphabetically by flag name
    result.sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [flags, searchValue, enabledFilter]);

  const overrideCount = Object.keys(originalFlagValues).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <Toolbar style={{ flexShrink: 0 }} className="pf-v6-u-px-md">
        <ToolbarContent>
          <ToolbarGroup>
            <ToolbarItem>
              <SearchInput
                placeholder="Search flags..."
                value={searchValue}
                onChange={(_event, value) => setSearchValue(value)}
                onClear={() => setSearchValue('')}
                aria-label="Search flags"
              />
            </ToolbarItem>
            <ToolbarItem variant="pagination" align={{ default: 'alignEnd' }}>
              {filteredAndSortedFlags.length} of {flags.length} flags
            </ToolbarItem>
          </ToolbarGroup>
        </ToolbarContent>
        <ToolbarContent>
          <ToolbarGroup>
            <ToolbarItem>
              <ToggleGroup aria-label="Filter by enabled status">
                <ToggleGroupItem
                  text="All"
                  buttonId="filter-all"
                  isSelected={enabledFilter === 'all'}
                  onChange={() => setEnabledFilter('all')}
                />
                <ToggleGroupItem
                  text="Enabled"
                  buttonId="filter-enabled"
                  isSelected={enabledFilter === 'enabled'}
                  onChange={() => setEnabledFilter('enabled')}
                />
                <ToggleGroupItem
                  text="Disabled"
                  buttonId="filter-disabled"
                  isSelected={enabledFilter === 'disabled'}
                  onChange={() => setEnabledFilter('disabled')}
                />
              </ToggleGroup>
            </ToolbarItem>
            {overrideCount > 0 && (
              <ToolbarItem>
                <Button variant="link" onClick={resetAllOverrides}>
                  Clear {overrideCount} override{overrideCount > 1 ? 's' : ''}
                </Button>
              </ToolbarItem>
            )}
          </ToolbarGroup>
        </ToolbarContent>
      </Toolbar>
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <DataList aria-label="Feature flags list" isCompact>
        {filteredAndSortedFlags.map(({ name, enabled, variant }) => {
          const isOverridden = name in originalFlagValues;
          const hasPayload = variant.payload !== undefined && variant.payload !== null;

          return (
            <DataListItem key={name} aria-labelledby={`flag-${name}`}>
              <DataListItemRow>
                <DataListItemCells
                  dataListCells={[
                    <DataListCell key="primary">
                      <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsXs' }}>
                        <FlexItem>
                          <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                            <FlexItem>
                              <strong id={`flag-${name}`}>{name}</strong>
                            </FlexItem>
                            {isOverridden && (
                              <FlexItem>
                                <Label color="orange" isCompact>
                                  overridden
                                </Label>
                              </FlexItem>
                            )}
                          </Flex>
                        </FlexItem>
                        <FlexItem>
                          <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
                            <FlexItem>
                              <small style={{ color: 'var(--pf-v5-global--Color--200)' }}>
                                Variant: {variant.name}
                              </small>
                            </FlexItem>
                            <FlexItem>
                              <Switch
                                isChecked={enabled}
                                onChange={() => toggleFlagOverride(name)}
                                aria-label={`Toggle ${name}`}
                              />
                            </FlexItem>
                          </Flex>
                        </FlexItem>
                        {hasPayload && (
                          <FlexItem>
                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.85em', background: 'var(--pf-v5-global--BackgroundColor--200)', padding: '8px', borderRadius: '4px' }}>
                              {JSON.stringify(variant.payload, null, 2)}
                            </pre>
                          </FlexItem>
                        )}
                      </Flex>
                    </DataListCell>,
                  ]}
                />
              </DataListItemRow>
            </DataListItem>
          );
        })}
        </DataList>
      </div>
    </div>
  );
};
