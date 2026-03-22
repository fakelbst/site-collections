import { Hono } from 'hono';
import { cors } from 'hono/cors';

type SiteCategory = 'Design' | 'Tools' | 'Blog' | 'News' | 'Other';

interface Site {
  id: string;
  url: string;
  title: string;
  description: string;
  category: SiteCategory;
  screenshot: string;
  ogImage?: string;
  addedAt: string;
}

interface KVStore {
  get(key: string, type: 'json'): Promise<unknown>;
  put(key: string, value: string): Promise<void>;
}

interface Bindings {
  SECRET_KEY: string;
  GEEKFLARE_API_KEY: string;
  ALLOWED_ORIGINS?: string;
  SITES_KV: KVStore;
}

type MetaTag = {
  name?: string;
  property?: string;
  content?: string;
};

type GeekflareMetaData = {
  title?: string;
  description?: string;
  ogImage?: string;
  og?: unknown;
  metaTags?: unknown;
  schemaOrg?: unknown;
};

type GeekflareMetaResponse = {
  apiCode?: number;
  apiStatus?: string;
  message?: string;
  data?: GeekflareMetaData | string;
};

type GeekflareScreenshotResponse = {
  apiCode?: number;
  apiStatus?: string;
  message?: string;
  data?: string;
};

const SITES_KEY = 'sites';
const LEGACY_CATEGORY_ALIASES = {
  design: '\u8bbe\u8ba1',
  tools: '\u5de5\u5177',
  blog: '\u535a\u5ba2',
  news: '\u8d44\u8baf',
  other: '\u5176\u4ed6',
} as const;
let writeQueue = Promise.resolve();

const app = new Hono<{ Bindings: Bindings }>();

app.use('/api/*', async (c, next) => {
  const origin = c.req.header('origin');

  if (!origin) {
    return next();
  }

  const allowedOrigin = getAllowedOrigin(origin, c.req.url, c.env.ALLOWED_ORIGINS);

  if (!allowedOrigin) {
    return c.json({ error: 'Origin not allowed.' }, 403);
  }

  const corsMiddleware = cors({
    origin: allowedOrigin,
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'x-secret-key'],
    maxAge: 86_400,
  });

  return corsMiddleware(c, next);
});

app.get('/api/sites', async (c) => {
  const sites = await readSites(c.env.SITES_KV);
  c.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  return c.json(sites);
});

app.post('/api/add', async (c) => {
  const providedKey = c.req.query('key') ?? c.req.header('x-secret-key');

  if (!providedKey || providedKey !== c.env.SECRET_KEY) {
    return c.json({ error: 'Secret key invalid.' }, 401);
  }

  const body = (await c.req.json().catch(() => null)) as { url?: string } | null;
  const url = body?.url?.trim();

  if (!url) {
    return c.json({ error: 'The request body must include a valid url field.' }, 400);
  }

  const normalizedUrl = normalizeUrl(url);

  if (!normalizedUrl) {
    return c.json({ error: 'Only http and https URLs are supported.' }, 400);
  }

  try {
    const updatedSites = await addSite(c.env, normalizedUrl);

    return c.json({
      success: true,
      site: updatedSites[0],
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Geekflare failed to fetch the site. Check the API key, site availability, and usage limits.';

    return c.json({ error: message }, 502);
  }
});

app.notFound((c) => c.json({ error: 'Not found.' }, 404));

export default app;

async function addSite(env: Bindings, normalizedUrl: string): Promise<Site[]> {
  const pageMeta = await fetchGeekflareMeta(env.GEEKFLARE_API_KEY, normalizedUrl);
  const screenshot = await fetchGeekflareScreenshot(env.GEEKFLARE_API_KEY, normalizedUrl);
  const category = categorize(pageMeta, normalizedUrl);
  const ogImage = pickOgImage(pageMeta);

  const newSite: Site = {
    id: crypto.randomUUID(),
    url: normalizedUrl,
    title: pickTitle(pageMeta, normalizedUrl),
    description: pickDescription(pageMeta),
    category,
    screenshot,
    addedAt: new Date().toISOString(),
    ...(ogImage ? { ogImage } : {}),
  };

  return updateSitesAtomically(env.SITES_KV, (sites) => [newSite, ...sites]);
}

async function fetchGeekflareMeta(apiKey: string, url: string): Promise<GeekflareMetaData> {
  const response = await fetch('https://api.geekflare.com/metascraping', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      url,
      device: 'desktop',
      renderJS: true,
    }),
  });

  const result = (await response.json().catch(() => null)) as GeekflareMetaResponse | null;

  if (!response.ok || result?.apiStatus !== 'success' || !result?.data) {
    throw new Error(result?.message ?? 'Geekflare metascraping failed.');
  }

  if (typeof result.data === 'string') {
    const fallbackResponse = await fetch(result.data);

    if (!fallbackResponse.ok) {
      throw new Error('Geekflare metascraping returned an invalid data URL.');
    }

    const fallbackData = (await fallbackResponse.json().catch(() => null)) as GeekflareMetaData | null;

    if (!fallbackData || typeof fallbackData !== 'object') {
      throw new Error('Geekflare metascraping returned data in an unreadable format.');
    }

    return fallbackData;
  }

  return result.data;
}

async function fetchGeekflareScreenshot(apiKey: string, url: string): Promise<string> {
  const response = await fetch('https://api.geekflare.com/screenshot', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      url,
      device: 'desktop',
      fullPage: false,
      type: 'png',
      quality: 90,
    }),
  });

  const result = (await response.json().catch(() => null)) as GeekflareScreenshotResponse | null;

  if (!response.ok || result?.apiStatus !== 'success' || !result?.data) {
    throw new Error(result?.message ?? 'Geekflare screenshot capture failed.');
  }

  return result.data;
}

function normalizeUrl(input: string): string | null {
  try {
    const url = new URL(input);

    if (!['http:', 'https:'].includes(url.protocol)) {
      return null;
    }

    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

async function readSites(kv: KVStore): Promise<Site[]> {
  const data = (await kv.get(SITES_KEY, 'json').catch(() => null)) as Site[] | null;

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map(normalizeSite);
}

async function updateSitesAtomically(
  kv: KVStore,
  updater: (sites: Site[]) => Site[],
): Promise<Site[]> {
  const run = writeQueue.then(async () => {
    const current = await readSites(kv);
    const next = updater(current);
    await kv.put(SITES_KEY, JSON.stringify(next));
    return next;
  });

  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );

  return run;
}

function getAllowedOrigin(
  origin: string,
  requestUrl: string,
  allowedOriginsValue?: string,
): string | null {
  const requestOrigin = new URL(requestUrl).origin;

  if (origin === requestOrigin || isLocalOrigin(origin)) {
    return origin;
  }

  const allowedOrigins = allowedOriginsValue
    ?.split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return allowedOrigins?.includes(origin) ? origin : null;
}

function isLocalOrigin(origin: string): boolean {
  try {
    const { hostname, protocol } = new URL(origin);
    return ['http:', 'https:'].includes(protocol) && ['localhost', '127.0.0.1'].includes(hostname);
  } catch {
    return false;
  }
}

function normalizeSite(site: Site): Site {
  return {
    ...site,
    category: normalizeCategory(site.category),
  };
}

function normalizeCategory(category: string): SiteCategory {
  const normalized = category.trim().toLowerCase();

  switch (normalized) {
    case LEGACY_CATEGORY_ALIASES.design:
    case 'design':
      return 'Design';
    case LEGACY_CATEGORY_ALIASES.tools:
    case 'tool':
    case 'tools':
    case 'productivity':
      return 'Tools';
    case LEGACY_CATEGORY_ALIASES.blog:
    case 'blog':
      return 'Blog';
    case LEGACY_CATEGORY_ALIASES.news:
    case 'news':
      return 'News';
    case LEGACY_CATEGORY_ALIASES.other:
    case 'archive':
    case 'other':
    default:
      return 'Other';
  }
}

function pickTitle(pageMeta: GeekflareMetaData, url: string): string {
  return (
    pageMeta.title?.trim() ||
    findMetaValue(pageMeta.metaTags, ['og:title', 'twitter:title']) ||
    new URL(url).hostname
  );
}

function pickDescription(pageMeta: GeekflareMetaData): string {
  return (
    pageMeta.description?.trim() ||
    findMetaValue(pageMeta.metaTags, ['description', 'og:description', 'twitter:description']) ||
    'Geekflare did not return a description.'
  );
}

function pickOgImage(pageMeta: GeekflareMetaData): string | undefined {
  if (typeof pageMeta.ogImage === 'string' && pageMeta.ogImage.trim()) {
    return pageMeta.ogImage;
  }

  if (Array.isArray(pageMeta.og)) {
    const firstImage = pageMeta.og.find((item) => {
      if (typeof item === 'string') {
        return item.startsWith('http');
      }

      return typeof item === 'object' && item !== null && 'url' in item;
    });

    if (typeof firstImage === 'string') {
      return firstImage;
    }

    if (
      typeof firstImage === 'object' &&
      firstImage !== null &&
      typeof firstImage.url === 'string'
    ) {
      return firstImage.url;
    }
  }

  return findMetaValue(pageMeta.metaTags, ['og:image', 'twitter:image']);
}

function findMetaValue(metaTags: unknown, keys: string[]): string | undefined {
  const normalizedMetaTags = normalizeMetaTags(metaTags);

  if (!normalizedMetaTags.length) {
    return undefined;
  }

  const normalizedKeys = keys.map((key) => key.toLowerCase());

  const tag = normalizedMetaTags.find((item) => {
    const key = item.name?.toLowerCase() ?? item.property?.toLowerCase() ?? '';
    return normalizedKeys.includes(key);
  });

  return tag?.content?.trim();
}

function normalizeMetaTags(metaTags: unknown): MetaTag[] {
  if (Array.isArray(metaTags)) {
    return metaTags.filter(isMetaTagLike);
  }

  if (!metaTags || typeof metaTags !== 'object') {
    return [];
  }

  const entries = Object.entries(metaTags);

  if (!entries.length) {
    return [];
  }

  const normalizedFromMap = entries
    .map(([key, value]) => {
      if (typeof value !== 'string') {
        return null;
      }

      const metaKey = key.trim();

      if (!metaKey) {
        return null;
      }

      if (metaKey.startsWith('og:') || metaKey.startsWith('twitter:')) {
        return { property: metaKey, content: value };
      }

      return { name: metaKey, content: value };
    })
    .filter((value): value is NonNullable<typeof value> => value !== null);

  if (normalizedFromMap.length) {
    return normalizedFromMap;
  }

  return isMetaTagLike(metaTags) ? [metaTags] : [];
}

function isMetaTagLike(value: unknown): value is MetaTag {
  return typeof value === 'object' && value !== null;
}

function categorize(pageMeta: GeekflareMetaData, url: string): Site['category'] {
  const schemaText = stringify(pageMeta.schemaOrg).toLowerCase();
  const fullText = [
    url,
    pageMeta.title,
    pageMeta.description,
    stringify(pageMeta.og),
    stringify(pageMeta.metaTags),
    stringify(pageMeta.schemaOrg),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/(figma|dribbble|behance|\bui\b|\bux\b|design|tailwind|framer|webflow)/i.test(fullText)) {
    return 'Design';
  }

  if (/(notion|obsidian|linear|\bcal\b|todo|productivity|slack|discord)/i.test(fullText)) {
    return 'Tools';
  }

  if (
    /(blog|medium|substack|dev\.to|hashnode)/i.test(fullText) ||
    /article|blogposting|blog/i.test(schemaText)
  ) {
    return 'Blog';
  }

  if (
    /(news|\bhn\b|reddit|twitter|techcrunch)/i.test(fullText) ||
    /newsarticle/i.test(schemaText)
  ) {
    return 'News';
  }

  return 'Other';
}

function stringify(value: unknown): string {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}
