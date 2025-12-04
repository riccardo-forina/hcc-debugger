import React, { useState, useEffect, useCallback } from 'react';
import useChrome from '@redhat-cloud-services/frontend-components/useChrome';
import { getScalprum } from '@scalprum/core';
import {
  Card,
  CardBody,
  CardTitle,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Label,
  Flex,
  FlexItem,
  Button,
  Spinner,
  EmptyState,
  EmptyStateBody,
  EmptyStateActions,
  EmptyStateFooter,
  Icon,
} from '@patternfly/react-core';
import {
  GithubIcon,
  ExternalLinkAltIcon,
  SyncIcon,
  BugIcon,
} from '@patternfly/react-icons';
import {
  AppRegistryEntry,
  getAppRegistryEntry,
  isRegistryConfigured,
  refreshRegistry,
  setProgressCallback,
} from './appRegistry';

interface ModuleInfo {
  pathname: string;
  app: string;
  bundle: string;
  bundleTitle: string;
  scope?: string;
  module?: string;
  manifestLocation?: string;
}

const getModuleInfo = (app: string, bundle: string, bundleData: any): ModuleInfo => {
  const pathname = window.location.pathname;
  let scope: string | undefined;
  let module: string | undefined;
  let manifestLocation: string | undefined;

  try {
    const scalprum = getScalprum();
    const appsConfig = scalprum?.appsConfig || {};
    const appConfig = appsConfig[app];
    if (appConfig) {
      scope = appConfig.name;
      manifestLocation = appConfig.manifestLocation;
    }
  } catch (e) {
    console.debug('Could not get scalprum config:', e);
  }

  return {
    pathname,
    app,
    bundle,
    bundleTitle: bundleData?.bundleTitle || bundle,
    scope,
    module,
    manifestLocation,
  };
};

export const ActiveModule = () => {
  const chrome = useChrome();
  const [moduleInfo, setModuleInfo] = useState<ModuleInfo>(() =>
    getModuleInfo(chrome.getApp(), chrome.getBundle(), chrome.getBundleData())
  );
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Registry state
  const [registryEntry, setRegistryEntry] = useState<AppRegistryEntry | undefined>();
  const [registryLoading, setRegistryLoading] = useState(false);
  const [registryError, setRegistryError] = useState<string | undefined>();
  const [scanProgress, setScanProgress] = useState<string>('');

  // Track app ID for registry fetching
  const [currentAppId, setCurrentAppId] = useState<string>(chrome.getApp());

  // Set up progress callback
  useEffect(() => {
    setProgressCallback(setScanProgress);
    return () => setProgressCallback(null);
  }, []);

  const updateModuleInfo = useCallback(() => {
    const app = chrome.getApp();
    const bundle = chrome.getBundle();
    const bundleData = chrome.getBundleData();
    setModuleInfo(getModuleInfo(app, bundle, bundleData));
    setLastUpdated(new Date());
    setCurrentAppId(app);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRegistryEntry = useCallback(async (appname: string, pathname: string) => {
    if (!isRegistryConfigured()) {
      setRegistryEntry(undefined);
      return;
    }

    setRegistryLoading(true);
    setRegistryError(undefined);
    try {
      const entry = await getAppRegistryEntry(appname, pathname);
      setRegistryEntry(entry);
    } catch (e) {
      setRegistryError('Failed to load repo info from GitHub');
      console.error('Error fetching registry entry:', e);
    } finally {
      setRegistryLoading(false);
    }
  }, []);

  // Set up navigation listeners
  useEffect(() => {
    updateModuleInfo();

    // Poll for URL changes (catches all navigation types)
    let lastUrl = window.location.href;
    const urlCheckInterval = setInterval(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        updateModuleInfo();
      }
    }, 200);

    return () => {
      clearInterval(urlCheckInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch registry entry when app or pathname changes
  useEffect(() => {
    if (moduleInfo.app) {
      fetchRegistryEntry(moduleInfo.app, moduleInfo.pathname);
    }
  }, [moduleInfo.app, moduleInfo.pathname, fetchRegistryEntry]);

  const handleRefresh = async () => {
    setRegistryLoading(true);
    try {
      await refreshRegistry();
      await fetchRegistryEntry(moduleInfo.app, moduleInfo.pathname);
    } catch (e) {
      setRegistryError('Failed to refresh');
    }
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Module Info Card */}
      <Card isCompact>
        <CardTitle>
          <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>Active Module</FlexItem>
            <FlexItem>
              <Label color="blue" isCompact>
                {lastUpdated.toLocaleTimeString()}
              </Label>
            </FlexItem>
          </Flex>
        </CardTitle>
        <CardBody>
          <DescriptionList isCompact isHorizontal>
            <DescriptionListGroup>
              <DescriptionListTerm>Pathname</DescriptionListTerm>
              <DescriptionListDescription>
                <code>{moduleInfo.pathname}</code>
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>App</DescriptionListTerm>
              <DescriptionListDescription>
                <strong>{moduleInfo.app}</strong>
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Bundle</DescriptionListTerm>
              <DescriptionListDescription>
                {moduleInfo.bundleTitle}
                {moduleInfo.bundleTitle !== moduleInfo.bundle && (
                  <> (<code>{moduleInfo.bundle}</code>)</>
                )}
              </DescriptionListDescription>
            </DescriptionListGroup>
            {moduleInfo.scope && (
              <DescriptionListGroup>
                <DescriptionListTerm>Scope</DescriptionListTerm>
                <DescriptionListDescription>
                  <code>{moduleInfo.scope}</code>
                </DescriptionListDescription>
              </DescriptionListGroup>
            )}
            {moduleInfo.manifestLocation && (
              <DescriptionListGroup>
                <DescriptionListTerm>Manifest</DescriptionListTerm>
                <DescriptionListDescription>
                  <code style={{ wordBreak: 'break-all', fontSize: '0.85em' }}>
                    {moduleInfo.manifestLocation}
                  </code>
                </DescriptionListDescription>
              </DescriptionListGroup>
            )}
          </DescriptionList>
        </CardBody>
      </Card>

      {/* Source Repository Card */}
      {isRegistryConfigured() && (
        <Card isCompact>
          <CardTitle>
            <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
              <FlexItem>Source Repository</FlexItem>
              <FlexItem>
                <Button
                  variant="plain"
                  aria-label="Refresh"
                  onClick={handleRefresh}
                  isDisabled={registryLoading}
                  icon={<SyncIcon />}
                />
              </FlexItem>
            </Flex>
          </CardTitle>
          <CardBody>
            {registryLoading ? (
              <Flex justifyContent={{ default: 'justifyContentCenter' }} direction={{ default: 'column' }} alignItems={{ default: 'alignItemsCenter' }}>
                <Spinner size="md" />
                <small style={{ marginTop: '8px', color: 'var(--pf-v5-global--Color--200)' }}>
                  {scanProgress || 'Loading...'}
                </small>
              </Flex>
            ) : registryError ? (
              <EmptyState variant="sm">
                <EmptyStateBody>{registryError}</EmptyStateBody>
                <EmptyStateFooter>
                  <EmptyStateActions>
                    <Button variant="link" onClick={handleRefresh}>
                      Try again
                    </Button>
                  </EmptyStateActions>
                </EmptyStateFooter>
              </EmptyState>
            ) : registryEntry?.githubRepo ? (
              <>
                <DescriptionList isCompact>
                  <DescriptionListGroup>
                    <DescriptionListTerm>
                      <Icon isInline>
                        <GithubIcon />
                      </Icon>{' '}
                      GitHub
                    </DescriptionListTerm>
                    <DescriptionListDescription>
                      <Button
                        variant="link"
                        isInline
                        component="a"
                        href={`https://github.com/${registryEntry.githubRepo}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        icon={<ExternalLinkAltIcon />}
                        iconPosition="end"
                      >
                        {registryEntry.githubRepo}
                      </Button>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--pf-v5-global--BorderColor--100)' }}>
                  <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                    <FlexItem>Found a bug?</FlexItem>
                    <FlexItem>
                      <Button
                        variant="secondary"
                        size="sm"
                        component="a"
                        href={`https://github.com/${registryEntry.githubRepo}/issues/new`}
                        target="_blank"
                        rel="noopener noreferrer"
                        icon={<BugIcon />}
                      >
                        Open a ticket
                      </Button>
                    </FlexItem>
                  </Flex>
                  <small style={{ color: 'var(--pf-v5-global--Color--200)', display: 'block', marginTop: '8px' }}>
                    Note: The team might prefer using Jira for bug tracking.
                  </small>
                </div>
              </>
            ) : (
              <EmptyState variant="sm">
                <EmptyStateBody>
                  Could not find source repo for <strong>{moduleInfo.app}</strong>.
                  <br />
                  <small style={{ color: 'var(--pf-v5-global--Color--200)' }}>
                    Auto-discovered from deploy/frontend.yaml files in RedHatInsights org.
                  </small>
                </EmptyStateBody>
              </EmptyState>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
};
