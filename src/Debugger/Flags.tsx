import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  IToggle,
  useFlags,
  useUnleashClient,
} from '@unleash/proxy-client-react';
import {
  Alert,
  AlertActionCloseButton,
  AlertActionLink,
  Button,
  DataList,
  DataListCell,
  DataListItem,
  DataListItemCells,
  DataListItemRow,
  Flex,
  FlexItem,
  Label,
  SearchInput,
  Switch,
  ToggleGroup,
  ToggleGroupItem,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';

const STORAGE_KEY = 'hcc-debugger-flag-overrides';

type EnabledFilter = 'all' | 'enabled' | 'disabled' | 'overridden';

// Maps flag name -> original value (overridden = !original)
type StoredOverrides = Record<string, boolean>;

function loadStoredOverrides(): StoredOverrides {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Failed to load flag overrides from localStorage:', e);
  }
  return {};
}

function saveStoredOverrides(overrides: StoredOverrides): void {
  try {
    if (Object.keys(overrides).length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    }
  } catch (e) {
    console.warn('Failed to save flag overrides to localStorage:', e);
  }
}

function clearStoredOverrides(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export const Flags = () => {
  const flags = useFlags();
  const client = useUnleashClient();
  const [searchValue, setSearchValue] = useState('');
  const [enabledFilter, setEnabledFilter] = useState<EnabledFilter>('all');

  // Active overrides: flag name -> original value
  const [activeOverrides, setActiveOverrides] = useState<StoredOverrides>({});

  // Pending overrides from localStorage (shown after hard refresh)
  const [pendingOverrides, setPendingOverrides] =
    useState<StoredOverrides | null>(null);

  const hasCheckedPending = useRef(false);

  // On first mount, check for stored overrides that need to be restored
  useEffect(() => {
    if (hasCheckedPending.current) return;
    hasCheckedPending.current = true;

    const stored = loadStoredOverrides();
    if (Object.keys(stored).length === 0) return;

    const toggles = (client as unknown as { toggles: IToggle[] }).toggles;
    const staleOverrides: StoredOverrides = {};

    for (const [flagName, originalValue] of Object.entries(stored)) {
      const toggle = toggles.find((t) => t.name === flagName);
      if (toggle) {
        // If current value equals the stored original, the override was lost (hard refresh)
        if (toggle.enabled === originalValue) {
          staleOverrides[flagName] = originalValue;
        }
        // If current value is !original, override is still active
        else if (toggle.enabled === !originalValue) {
          setActiveOverrides((prev) => ({
            ...prev,
            [flagName]: originalValue,
          }));
        }
      }
    }

    if (Object.keys(staleOverrides).length > 0) {
      setPendingOverrides(staleOverrides);
    }
  }, [client]);

  // Persist active overrides to localStorage
  useEffect(() => {
    saveStoredOverrides(activeOverrides);
  }, [activeOverrides]);

  const applyPendingOverrides = useCallback(() => {
    if (!pendingOverrides) return;

    const toggles = (client as unknown as { toggles: IToggle[] }).toggles;

    for (const [flagName, originalValue] of Object.entries(pendingOverrides)) {
      const toggle = toggles.find((t) => t.name === flagName);
      if (toggle) {
        toggle.enabled = !originalValue; // Override = opposite of original
      }
    }

    setActiveOverrides((prev) => ({ ...prev, ...pendingOverrides }));
    setPendingOverrides(null);
    client.emit('update');
  }, [client, pendingOverrides]);

  const dismissPendingOverrides = useCallback(() => {
    setPendingOverrides(null);
    clearStoredOverrides();
  }, []);

  const toggleFlagOverride = useCallback(
    (flagName: string) => {
      const toggles = (client as unknown as { toggles: IToggle[] }).toggles;
      const toggle = toggles.find((t) => t.name === flagName);

      if (toggle) {
        const currentValue = toggle.enabled;
        const newValue = !currentValue;

        toggle.enabled = newValue;

        setActiveOverrides((prev) => {
          // If not yet overridden, store original value
          if (!(flagName in prev)) {
            return { ...prev, [flagName]: currentValue };
          }

          // If toggling back to original, remove from overrides
          if (newValue === prev[flagName]) {
            const { [flagName]: _removed, ...rest } = prev;
            void _removed;
            return rest;
          }

          return prev;
        });

        client.emit('update');
      }
    },
    [client],
  );

  const resetAllOverrides = useCallback(() => {
    const toggles = (client as unknown as { toggles: IToggle[] }).toggles;

    Object.entries(activeOverrides).forEach(([flagName, originalValue]) => {
      const toggle = toggles.find((t) => t.name === flagName);
      if (toggle) {
        toggle.enabled = originalValue;
      }
    });

    setActiveOverrides({});
    client.emit('update');
  }, [client, activeOverrides]);

  const filteredAndSortedFlags = useMemo(() => {
    let result = [...flags];

    if (searchValue) {
      const lowerSearch = searchValue.toLowerCase();
      result = result.filter((flag) =>
        flag.name.toLowerCase().includes(lowerSearch),
      );
    }

    if (enabledFilter === 'enabled') {
      result = result.filter((flag) => flag.enabled);
    } else if (enabledFilter === 'disabled') {
      result = result.filter((flag) => !flag.enabled);
    } else if (enabledFilter === 'overridden') {
      result = result.filter((flag) => flag.name in activeOverrides);
    }

    result.sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [flags, searchValue, enabledFilter, activeOverrides]);

  const overrideCount = Object.keys(activeOverrides).length;
  const pendingCount = pendingOverrides
    ? Object.keys(pendingOverrides).length
    : 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
      }}
    >
      {pendingCount > 0 && (
        <Alert
          variant="info"
          isInline
          title={`${pendingCount} flag override${pendingCount > 1 ? 's' : ''} from previous session`}
          actionClose={
            <AlertActionCloseButton onClose={dismissPendingOverrides} />
          }
          actionLinks={
            <>
              <AlertActionLink onClick={applyPendingOverrides}>
                Restore
              </AlertActionLink>
              <AlertActionLink onClick={dismissPendingOverrides}>
                Dismiss
              </AlertActionLink>
            </>
          }
        >
          <small>
            {Object.keys(pendingOverrides!).slice(0, 3).join(', ')}
            {pendingCount > 3 && ` and ${pendingCount - 3} more`}
          </small>
        </Alert>
      )}
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
                {overrideCount > 0 && (
                  <ToggleGroupItem
                    text={`Overridden (${overrideCount})`}
                    buttonId="filter-overridden"
                    isSelected={enabledFilter === 'overridden'}
                    onChange={() => setEnabledFilter('overridden')}
                  />
                )}
              </ToggleGroup>
            </ToolbarItem>
          </ToolbarGroup>
        </ToolbarContent>
        {overrideCount > 0 && (
          <ToolbarContent>
            <ToolbarGroup>
              <ToolbarItem>
                <Button variant="link" onClick={resetAllOverrides}>
                  Clear {overrideCount} override{overrideCount > 1 ? 's' : ''}
                </Button>
              </ToolbarItem>
            </ToolbarGroup>
          </ToolbarContent>
        )}
      </Toolbar>
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <DataList aria-label="Feature flags list" isCompact>
          {filteredAndSortedFlags.map(({ name, enabled, variant }) => {
            const isOverridden = name in activeOverrides;
            const hasPayload =
              variant.payload !== undefined && variant.payload !== null;

            return (
              <DataListItem key={name} aria-labelledby={`flag-${name}`}>
                <DataListItemRow>
                  <DataListItemCells
                    dataListCells={[
                      <DataListCell key="primary">
                        <Flex
                          direction={{ default: 'column' }}
                          spaceItems={{ default: 'spaceItemsXs' }}
                        >
                          <FlexItem>
                            <Flex
                              spaceItems={{ default: 'spaceItemsSm' }}
                              alignItems={{ default: 'alignItemsCenter' }}
                            >
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
                            <Flex
                              justifyContent={{
                                default: 'justifyContentSpaceBetween',
                              }}
                              alignItems={{ default: 'alignItemsCenter' }}
                            >
                              <FlexItem>
                                <small
                                  style={{
                                    color: 'var(--pf-v6-global--Color--200)',
                                  }}
                                >
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
                              <pre
                                style={{
                                  margin: 0,
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                  fontSize: '0.85em',
                                  background:
                                    'var(--pf-v6-global--BackgroundColor--200)',
                                  padding: '8px',
                                  borderRadius: '4px',
                                }}
                              >
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
