/**
 * Tests for appRegistry module
 */

import {
  getAppRegistryEntry,
  clearCache,
  setProgressCallback,
  fetchAppRegistry,
  isRegistryConfigured,
} from './appRegistry';

// Mock localStorage
let localStorageStore: Record<string, string> = {};

const localStorageMock = {
  getItem: jest.fn((key: string) => localStorageStore[key] || null),
  setItem: jest.fn((key: string, value: string) => {
    localStorageStore[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    delete localStorageStore[key];
  }),
  clear: jest.fn(() => {
    localStorageStore = {};
  }),
};

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Sample test data
const mockRepoListResponse = [
  { name: 'insights-advisor-frontend', archived: false },
  { name: 'insights-rbac-ui', archived: false },
  { name: 'learning-resources', archived: false },
  { name: 'frontend-starter-app', archived: false }, // Should be filtered out
  { name: 'template-repo', archived: false }, // Should be filtered out
  { name: 'archived-app', archived: true }, // Should be filtered out
];

const mockPackageJsonAdvisor = {
  insights: {
    appname: 'advisor',
  },
};

const mockPackageJsonRbac = {
  insights: {
    appname: 'rbac',
  },
};

const mockPackageJsonLearningResources = {
  insights: {
    appname: 'learning-resources',
  },
};

const mockFrontendYamlAdvisor = `
objects:
  - spec:
      module:
        modules:
          - id: advisor
            routes:
              - pathname: /insights/advisor
              - pathname: /insights/advisor/recommendations
          - id: advisor-systems
            routes:
              - pathname: /insights/advisor/systems
`;

const mockFrontendYamlRbac = `
objects:
  - spec:
      module:
        modules:
          - id: my-user-access
            routes:
              - pathname: /iam/my-user-access
          - id: iam-user-access
            routes:
              - pathname: /iam/user-access
              - pathname: /iam/user-access/users
              - pathname: /iam/user-access/groups
`;

describe('appRegistry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageStore = {};
    clearCache();
  });

  describe('isRegistryConfigured', () => {
    it('should return true', () => {
      expect(isRegistryConfigured()).toBe(true);
    });
  });

  describe('getAppRegistryEntry - path matching', () => {
    beforeEach(async () => {
      // Set up mock responses
      mockFetch.mockImplementation((url: string) => {
        // Repo list API
        if (url.includes('api.github.com/orgs/RedHatInsights/repos')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockRepoListResponse),
          });
        }

        // Package.json files
        if (url.includes('insights-advisor-frontend') && url.includes('package.json')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPackageJsonAdvisor),
          });
        }
        if (url.includes('insights-rbac-ui') && url.includes('package.json')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPackageJsonRbac),
          });
        }
        if (url.includes('learning-resources') && url.includes('package.json')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPackageJsonLearningResources),
          });
        }

        // Frontend.yaml files
        if (url.includes('insights-advisor-frontend') && url.includes('frontend.yaml')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockFrontendYamlAdvisor),
          });
        }
        if (url.includes('insights-rbac-ui') && url.includes('frontend.yaml')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockFrontendYamlRbac),
          });
        }

        // Default: 404
        return Promise.resolve({ ok: false, status: 404 });
      });

      // Build the registry
      await fetchAppRegistry();
    });

    it('should match exact pathname', async () => {
      const entry = await getAppRegistryEntry('advisor', '/insights/advisor');
      expect(entry).toBeDefined();
      expect(entry?.appId).toBe('advisor');
      expect(entry?.githubRepo).toBe('RedHatInsights/insights-advisor-frontend');
    });

    it('should match pathname with prefix (subpath)', async () => {
      const entry = await getAppRegistryEntry('advisor', '/insights/advisor/recommendations/123');
      expect(entry).toBeDefined();
      expect(entry?.appId).toBe('advisor');
    });

    it('should match most specific path (longest prefix)', async () => {
      // /insights/advisor/systems should match advisor-systems, not advisor
      const entry = await getAppRegistryEntry('advisor', '/insights/advisor/systems');
      expect(entry).toBeDefined();
      expect(entry?.appId).toBe('advisor-systems');
    });

    it('should not match partial path segments', async () => {
      // /insights/advisorXYZ should NOT match /insights/advisor
      const entry = await getAppRegistryEntry('advisorXYZ', '/insights/advisorXYZ');
      // Should fall back to appname (which won't match either)
      expect(entry).toBeUndefined();
    });

    it('should match rbac paths correctly', async () => {
      const entry = await getAppRegistryEntry('user-access', '/iam/user-access/groups');
      expect(entry).toBeDefined();
      expect(entry?.appId).toBe('iam-user-access');
      expect(entry?.githubRepo).toBe('RedHatInsights/insights-rbac-ui');
    });

    it('should match my-user-access path', async () => {
      const entry = await getAppRegistryEntry('my-user-access', '/iam/my-user-access');
      expect(entry).toBeDefined();
      expect(entry?.appId).toBe('my-user-access');
      expect(entry?.githubRepo).toBe('RedHatInsights/insights-rbac-ui');
    });
  });

  describe('getAppRegistryEntry - appname fallback', () => {
    beforeEach(async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('api.github.com/orgs/RedHatInsights/repos')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockRepoListResponse),
          });
        }
        if (url.includes('learning-resources') && url.includes('package.json')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPackageJsonLearningResources),
          });
        }
        // No frontend.yaml for learning-resources
        return Promise.resolve({ ok: false, status: 404 });
      });

      await fetchAppRegistry();
    });

    it('should fall back to appname when no path match', async () => {
      const entry = await getAppRegistryEntry('learning-resources', '/insights/learning-resources');
      expect(entry).toBeDefined();
      expect(entry?.appId).toBe('learning-resources');
      expect(entry?.githubRepo).toBe('RedHatInsights/learning-resources');
    });

    it('should match by appname when pathname is not provided', async () => {
      const entry = await getAppRegistryEntry('learning-resources');
      expect(entry).toBeDefined();
      expect(entry?.appId).toBe('learning-resources');
    });
  });

  describe('template repo filtering', () => {
    beforeEach(async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('api.github.com/orgs/RedHatInsights/repos')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockRepoListResponse),
          });
        }
        // Starter app has placeholder values
        if (url.includes('frontend-starter-app') && url.includes('package.json')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ insights: { appname: 'frontend-starter-app' } }),
          });
        }
        if (url.includes('frontend-starter-app') && url.includes('frontend.yaml')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(`
objects:
  - spec:
      module:
        modules:
          - id: overview
            routes:
              - pathname: /staging/starter
`),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      await fetchAppRegistry();
    });

    it('should not include starter repos', async () => {
      // The starter app's "overview" module should not be registered
      const entry = await getAppRegistryEntry('overview', '/staging/starter');
      expect(entry).toBeUndefined();
    });

    it('should not include template repos', async () => {
      const entry = await getAppRegistryEntry('template-repo');
      expect(entry).toBeUndefined();
    });
  });

  describe('cache behavior', () => {
    it('should use localStorage cache on subsequent loads', async () => {
      // First load - builds from GitHub
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('api.github.com/orgs/RedHatInsights/repos')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ name: 'test-app', archived: false }]),
          });
        }
        if (url.includes('test-app') && url.includes('package.json')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ insights: { appname: 'test' } }),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      await fetchAppRegistry();
      expect(mockFetch).toHaveBeenCalled();
      expect(localStorageMock.setItem).toHaveBeenCalled();

      // Clear in-memory cache but keep localStorage
      const fetchCallCount = mockFetch.mock.calls.length;
      
      // Manually clear the in-memory cache by calling clearCache and restoring localStorage
      const storedData = localStorageMock.getItem('hcc-debugger-app-registry-v2');
      clearCache();
      if (storedData) {
        localStorageMock.setItem('hcc-debugger-app-registry-v2', storedData);
      }

      // Second load - should use localStorage
      await fetchAppRegistry();
      
      // Should not have made additional fetch calls (loaded from localStorage)
      expect(mockFetch.mock.calls.length).toBe(fetchCallCount);
    });

    it('should clear cache properly', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('api.github.com/orgs/RedHatInsights/repos')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      await fetchAppRegistry();
      clearCache();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('hcc-debugger-app-registry-v2');
    });
  });

  describe('progress callback', () => {
    it('should call progress callback during registry build', async () => {
      const progressFn = jest.fn();
      setProgressCallback(progressFn);

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('api.github.com/orgs/RedHatInsights/repos')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ name: 'test-app', archived: false }]),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      await fetchAppRegistry();

      expect(progressFn).toHaveBeenCalled();
      expect(progressFn).toHaveBeenCalledWith(expect.stringContaining('Fetching'));

      setProgressCallback(null);
    });
  });

  describe('error handling', () => {
    it('should handle GitHub API rate limiting gracefully', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('api.github.com/orgs/RedHatInsights/repos')) {
          return Promise.resolve({
            ok: false,
            status: 403,
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      // Should not throw, just return empty results
      const entries = await fetchAppRegistry();
      expect(entries).toEqual([]);
    });

    it('should use stale cache when API returns no results', async () => {
      // Manually set up stale cache in localStorage (simulating previous session)
      const staleCache: [string, { appId: string; githubRepo: string }][] = [
        ['appname:cached-app', { appId: 'cached-app', githubRepo: 'RedHatInsights/cached-app' }],
      ];
      const staleData = JSON.stringify({
        data: staleCache,
        timestamp: Date.now() - (8 * 24 * 60 * 60 * 1000), // 8 days ago (expired)
      });
      localStorageStore['hcc-debugger-app-registry-v2'] = staleData;

      // Make API return empty results (rate limited or error)
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('api.github.com/orgs/RedHatInsights/repos')) {
          return Promise.resolve({
            ok: false,
            status: 403, // Rate limited
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      // Should use stale cache since API returns no results
      const entries = await fetchAppRegistry();
      expect(entries.length).toBeGreaterThan(0);
      expect(entries.some(e => e.appId === 'cached-app')).toBe(true);
    });
  });

  describe('path boundary matching', () => {
    beforeEach(async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('api.github.com/orgs/RedHatInsights/repos')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ name: 'foo-app', archived: false }]),
          });
        }
        if (url.includes('foo-app') && url.includes('frontend.yaml')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(`
objects:
  - spec:
      module:
        modules:
          - id: foo
            routes:
              - pathname: /app/foo
`),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      await fetchAppRegistry();
    });

    it('should match /app/foo/bar (subpath)', async () => {
      const entry = await getAppRegistryEntry('foo', '/app/foo/bar');
      expect(entry).toBeDefined();
      expect(entry?.appId).toBe('foo');
    });

    it('should match /app/foo?query=1 (query string)', async () => {
      const entry = await getAppRegistryEntry('foo', '/app/foo?query=1');
      expect(entry).toBeDefined();
      expect(entry?.appId).toBe('foo');
    });

    it('should NOT match /app/foobar (no boundary)', async () => {
      const entry = await getAppRegistryEntry('foobar', '/app/foobar');
      expect(entry).toBeUndefined();
    });

    it('should match exact path /app/foo', async () => {
      const entry = await getAppRegistryEntry('foo', '/app/foo');
      expect(entry).toBeDefined();
      expect(entry?.appId).toBe('foo');
    });
  });
});

