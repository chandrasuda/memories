'use server';
import 'server-only';

// Cheerio is node-only, ensure it's only loaded on the server
// and lazily imported to reduce cold start time.

export interface LinkMetadata {
  title: string;
  description: string;
  image: string | null;
  url: string;
}

export async function extractMetadata(url: string): Promise<LinkMetadata | null> {
  try {
    const { load } = await import('cheerio');

    function normalizeUrl(input: string): string {
      const trimmed = input.trim();
      if (/^https?:\/\//i.test(trimmed)) return trimmed;
      return `https://${trimmed}`;
    }

    const targetUrl = normalizeUrl(url);

    async function fetchWithTimeout(resource: string, options: RequestInit & { timeoutMs?: number } = {}) {
      const { timeoutMs = 10000, ...rest } = options;
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        return await fetch(resource, {
          cache: 'no-store',
          redirect: 'follow',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          signal: controller.signal,
          ...rest,
        });
      } finally {
        clearTimeout(id);
      }
    }

    async function fetchHtml(primaryUrl: string): Promise<string | null> {
      try {
        const res = await fetchWithTimeout(primaryUrl, { timeoutMs: 12000 });
        if (!res.ok) throw new Error(`Primary fetch failed: ${res.status}`);
        const contentType = res.headers.get('content-type');
        if (contentType && !contentType.includes('text/html')) {
          console.warn(`Skipping non-HTML content: ${contentType}`);
          return null;
        }
        return await res.text();
      } catch (e) {
        console.error("Primary fetch failed", e);
        
        // Try one more time with a generic bot user agent
        try {
          const res = await fetchWithTimeout(primaryUrl, { 
            timeoutMs: 12000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
          });
          if (!res.ok) throw new Error(`Bot fetch failed: ${res.status}`);
          return await res.text();
        } catch (e2) {
          console.error("Bot fetch failed", e2);
          return null;
        }
      }
    }

    function absolutizeUrl(maybeUrl: string | null | undefined, base: string): string | null {
      if (!maybeUrl) return null;
      try {
        // Some sites return //images.cdn.com/...
        const candidate = maybeUrl.startsWith('//') ? `https:${maybeUrl}` : maybeUrl;
        return new URL(candidate, base).toString();
      } catch {
        return null;
      }
    }

    const html = await fetchHtml(targetUrl);
    if (!html) {
      // Return minimal metadata to avoid blocking user flow
      const u = new URL(targetUrl);
      return {
        title: u.hostname,
        description: '',
        image: null,
        url: targetUrl,
      };
    }

    const $ = load(html);

    // Title
    const rawTitle =
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').first().text() ||
      $('h1').first().text() ||
      '';

    // Description
    const rawDescription =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      '';

    // Image
    const rawImage =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      $('link[rel="image_src"]').attr('href') ||
      $('meta[property="og:image:url"]').attr('content') ||
      null;

    const resolvedImage = absolutizeUrl(rawImage, targetUrl);

    const cleanedTitle = rawTitle.trim() || new URL(targetUrl).hostname;
    const cleanedDescription = rawDescription.trim();

    return { title: cleanedTitle, description: cleanedDescription, image: resolvedImage, url: targetUrl };
  } catch (error) {
    console.error('Error extracting metadata:', error);
    try {
      const u = new URL(url.startsWith('http') ? url : `https://${url}`);
      return { title: u.hostname, description: '', image: null, url: u.toString() };
    } catch {
      return null;
    }
  }
}

