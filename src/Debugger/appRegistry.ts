/**
 * App Registry - Auto-discovered from RedHatInsights repos
 * 
 * Matches apps by:
 * 1. insights.appname in package.json
 * 2. module IDs from bundleSegments in frontend.yaml
 */

import jsyaml from 'js-yaml';

export interface AppRegistryEntry {
  appId: string;
  githubRepo: string;
}

// Cache configuration
const CACHE_KEY = 'hcc-debugger-app-registry-v2';
const CACHE_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days

// In-memory cache (keyed by appname)
let registryCache: Map<string, AppRegistryEntry> | null = null;
let cacheTimestamp: number = 0;

// Progress tracking
type ProgressCallback = (status: string) => void;
let progressCallback: ProgressCallback | null = null;

export function setProgressCallback(callback: ProgressCallback | null): void {
  progressCallback = callback;
}

function reportProgress(status: string): void {
  if (progressCallback) {
    progressCallback(status);
  }
}

type StoredRegistryData = [string, AppRegistryEntry][];

/**
 * Load registry from localStorage
 */
function loadFromStorage(): { data: StoredRegistryData; timestamp: number } | null {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.data && parsed.timestamp) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load registry from localStorage:', e);
  }
  return null;
}

/**
 * Save registry to localStorage
 */
function saveToStorage(data: StoredRegistryData): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch (e) {
    console.warn('Failed to save registry to localStorage:', e);
  }
}

/**
 * Clear the cache (both memory and localStorage)
 */
export function clearCache(): void {
  registryCache = null;
  cacheTimestamp = 0;
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (e) {
    // Ignore
  }
}

/**
 * Check if registry is available
 */
export function isRegistryConfigured(): boolean {
  return true;
}

const GITHUB_ORG = 'RedHatInsights';

// Special cases: repos outside RedHatInsights that we still want to include
const EXTRA_REPOS: Array<{ org: string; name: string }> = [
  { org: 'osbuild', name: 'image-builder-frontend' },
];

interface RepoInfo {
  org: string;
  name: string;
}

/**
 * Fetch list of repos from RedHatInsights org + special cases
 */
async function fetchRepoList(): Promise<RepoInfo[]> {
  const repos: RepoInfo[] = [];
  let page = 1;
  const perPage = 100;
  
  // Fetch RedHatInsights repos
  while (true) {
    try {
      const response = await fetch(
        `https://api.github.com/orgs/${GITHUB_ORG}/repos?per_page=${perPage}&page=${page}`,
        { headers: { 'Accept': 'application/vnd.github.v3+json' } }
      );
      
      if (!response.ok) {
        if (response.status === 403) {
          console.warn('GitHub API rate limit reached');
          reportProgress('Rate limited - using partial results');
        } else {
          console.warn(`GitHub API returned ${response.status}`);
        }
        break;
      }
      
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) break;
      
      for (const repo of data) {
        if (repo.name && !repo.archived) {
          // Skip template/starter repos - they have placeholder values
          const name = repo.name.toLowerCase();
          if (name.includes('starter') || name.includes('template') || name.includes('boilerplate')) {
            continue;
          }
          repos.push({ org: GITHUB_ORG, name: repo.name });
        }
      }
      
      if (data.length < perPage) break;
      page++;
    } catch (error) {
      console.warn('Error fetching repo list:', error);
      break;
    }
  }
  
  // Add special case repos
  repos.push(...EXTRA_REPOS);
  
  return repos;
}

interface PackageJson {
  insights?: {
    appname?: string;
  };
}

interface FrontendYamlRoute {
  pathname?: string;
}

interface FrontendYamlModule {
  id?: string;
  routes?: FrontendYamlRoute[];
}

interface FrontendYamlSpec {
  deploymentRepo?: string;
  module?: {
    modules?: FrontendYamlModule[];
  };
}

interface FrontendYaml {
  objects?: Array<{
    spec?: FrontendYamlSpec;
  }>;
}

/**
 * Fetch package.json and extract insights.appname
 */
async function fetchAppName(repo: RepoInfo): Promise<string | null> {
  const branches = ['master', 'main'];
  
  for (const branch of branches) {
    try {
      const url = `https://raw.githubusercontent.com/${repo.org}/${repo.name}/${branch}/package.json`;
      const response = await fetch(url);
      
      if (response.ok) {
        const pkg: PackageJson = await response.json();
        if (pkg.insights?.appname) {
          return pkg.insights.appname;
        }
      }
    } catch {
      // Ignore errors, try next branch
    }
  }
  
  return null;
}

interface ModuleWithRoutes {
  moduleId: string;
  pathnames: string[];
}

/**
 * Extract frontendCRDPath from fec.config.js content
 * Returns the relative path to the frontend YAML file
 */
function extractFrontendCRDPath(fecConfigContent: string): string | null {
  // Match patterns like:
  // frontendCRDPath: path.resolve(__dirname, './deploy/frontend.yaml')
  // frontendCRDPath: path.resolve(__dirname, './frontend.yml')
  const match = fecConfigContent.match(/frontendCRDPath[^'"]*['"]([^'"]+)['"]/);
  if (match && match[1]) {
    // Remove leading ./ if present
    return match[1].replace(/^\.\//, '');
  }
  return null;
}

/**
 * Fetch fec.config.js and extract the frontend YAML path
 */
async function fetchFrontendYamlPath(repo: RepoInfo): Promise<string | null> {
  const branches = ['master', 'main'];
  
  for (const branch of branches) {
    try {
      const url = `https://raw.githubusercontent.com/${repo.org}/${repo.name}/${branch}/fec.config.js`;
      const response = await fetch(url);
      
      if (response.ok) {
        const content = await response.text();
        const path = extractFrontendCRDPath(content);
        if (path) {
          return path;
        }
      }
    } catch {
      // Ignore errors, try next branch
    }
  }
  
  return null;
}

/**
 * Fetch frontend YAML and extract modules with their routes
 */
async function fetchModulesWithRoutes(repo: RepoInfo): Promise<ModuleWithRoutes[]> {
  const branches = ['master', 'main'];
  const modules: ModuleWithRoutes[] = [];
  
  // First, try to get the actual YAML path from fec.config.js
  const customPath = await fetchFrontendYamlPath(repo);
  
  // Build list of paths to try
  const yamlPaths = customPath 
    ? [customPath]
    : ['deploy/frontend.yaml', 'deploy/frontend.yml'];
  
  for (const branch of branches) {
    for (const yamlPath of yamlPaths) {
      try {
        const url = `https://raw.githubusercontent.com/${repo.org}/${repo.name}/${branch}/${yamlPath}`;
        const response = await fetch(url);
        
        if (response.ok) {
          const text = await response.text();
          const yaml = jsyaml.load(text) as FrontendYaml;
          
          for (const obj of yaml?.objects || []) {
            const yamlModules = obj.spec?.module?.modules;
            if (yamlModules) {
              for (const mod of yamlModules) {
                if (mod.id && mod.routes) {
                  const pathnames = mod.routes
                    .filter(r => r.pathname)
                    .map(r => r.pathname as string);
                  if (pathnames.length > 0) {
                    modules.push({
                      moduleId: mod.id,
                      pathnames,
                    });
                  }
                }
              }
            }
          }
          
          if (modules.length > 0) {
            return modules;
          }
        }
      } catch {
        // Ignore errors, try next path/branch
      }
    }
  }
  
  return modules;
}

/**
 * Build the registry by scanning all repos for:
 * 1. package.json with insights.appname
 * 2. frontend YAML with module routes (path from fec.config.js)
 */
async function buildRegistry(): Promise<Map<string, AppRegistryEntry>> {
  const registry = new Map<string, AppRegistryEntry>();
  
  reportProgress('Fetching repo list...');
  const repos = await fetchRepoList();
  console.log(`[AppRegistry] Found ${repos.length} repos, scanning...`);
  
  const concurrency = 20;
  let scanned = 0;
  let foundCount = 0;
  
  for (let i = 0; i < repos.length; i += concurrency) {
    const batch = repos.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (repo) => ({
        repo,
        appname: await fetchAppName(repo),
        modules: await fetchModulesWithRoutes(repo),
      }))
    );
    
    for (const { repo, appname, modules } of batchResults) {
      const githubRepo = `${repo.org}/${repo.name}`;
      
      // Register by package.json appname (prefixed to distinguish from paths)
      if (appname && !registry.has(`appname:${appname}`)) {
        foundCount++;
        registry.set(`appname:${appname}`, {
          appId: appname,
          githubRepo,
        });
      }
      
      // Register by frontend.yaml module routes (by pathname)
      for (const mod of modules) {
        for (const pathname of mod.pathnames) {
          if (!registry.has(`path:${pathname}`)) {
            foundCount++;
            registry.set(`path:${pathname}`, {
              appId: mod.moduleId,
              githubRepo,
            });
          }
        }
      }
    }
    
    scanned += batch.length;
    reportProgress(`Scanning: ${scanned}/${repos.length} (found ${foundCount} apps)`);
  }
  
  reportProgress(`Done! Found ${foundCount} apps`);
  console.log(`[AppRegistry] Found ${foundCount} apps`);
  return registry;
}

/**
 * Fetches all app registry entries
 */
export async function fetchAppRegistry(): Promise<AppRegistryEntry[]> {
  // Check in-memory cache first
  if (registryCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    reportProgress('Using cached data');
    return Array.from(registryCache.values());
  }
  
  // Check localStorage cache
  const stored = loadFromStorage();
  if (stored && Date.now() - stored.timestamp < CACHE_TTL) {
    console.log('[AppRegistry] Loading from localStorage cache');
    reportProgress('Loaded from cache');
    registryCache = new Map(stored.data);
    cacheTimestamp = stored.timestamp;
    // Dedupe values (same entry may be stored under multiple keys)
    const uniqueEntries = new Map<string, AppRegistryEntry>();
    for (const [, entry] of stored.data) {
      uniqueEntries.set(entry.appId, entry);
    }
    return Array.from(uniqueEntries.values());
  }
  
  // Build fresh registry
  try {
    registryCache = await buildRegistry();
    
    // If we got no results but have stale cache, use stale cache
    if (registryCache.size === 0 && stored) {
      console.log('[AppRegistry] No results from API, using stale cache');
      reportProgress('Using stale cache (no API results)');
      registryCache = new Map(stored.data);
      cacheTimestamp = stored.timestamp;
      const uniqueEntries = new Map<string, AppRegistryEntry>();
      for (const [, entry] of stored.data) {
        uniqueEntries.set(entry.appId, entry);
      }
      return Array.from(uniqueEntries.values());
    }
    
    cacheTimestamp = Date.now();
    
    // Save map entries (key-value pairs) to localStorage
    const mapEntries = Array.from(registryCache.entries());
    saveToStorage(mapEntries);
    
    return Array.from(registryCache.values());
  } catch (error) {
    console.error('Error building app registry:', error);
    
    // Fallback: use stale cache if available
    if (stored) {
      console.log('[AppRegistry] Using stale cache due to error');
      reportProgress('Using stale cache (API error)');
      registryCache = new Map(stored.data);
      cacheTimestamp = stored.timestamp;
      const uniqueEntries = new Map<string, AppRegistryEntry>();
      for (const [, entry] of stored.data) {
        uniqueEntries.set(entry.appId, entry);
      }
      return Array.from(uniqueEntries.values());
    }
    
    throw error;
  }
}

/**
 * Gets the entry for an app by pathname and/or appname
 */
export async function getAppRegistryEntry(appname: string, pathname?: string): Promise<AppRegistryEntry | undefined> {
  // Ensure registry is loaded
  if (!registryCache || Date.now() - cacheTimestamp >= CACHE_TTL) {
    await fetchAppRegistry();
  }
  
  if (!registryCache) return undefined;
  
  // First, try to match by pathname (more specific)
  if (pathname) {
    // Try exact match
    const exactMatch = registryCache.get(`path:${pathname}`);
    if (exactMatch) return exactMatch;
    
    // Try longest prefix match
    let bestMatch: AppRegistryEntry | undefined;
    let bestMatchLength = 0;
    
    for (const [key, entry] of registryCache.entries()) {
      if (!key.startsWith('path:')) continue;
      const path = key.slice(5); // Remove 'path:' prefix
      
      // Check if pathname starts with this path at a boundary
      if (pathname === path || 
          (pathname.startsWith(path) && (pathname[path.length] === '/' || pathname[path.length] === '?' || pathname[path.length] === undefined))) {
        if (path.length > bestMatchLength) {
          bestMatch = entry;
          bestMatchLength = path.length;
        }
      }
    }
    
    if (bestMatch) return bestMatch;
  }
  
  // Fall back to appname match
  return registryCache.get(`appname:${appname}`);
}

/**
 * Force refresh the registry cache
 */
export async function refreshRegistry(): Promise<void> {
  clearCache();
  await fetchAppRegistry();
}
