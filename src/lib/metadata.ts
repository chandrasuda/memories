import * as cheerio from 'cheerio';

export interface LinkMetadata {
  title: string;
  description: string;
  image: string | null;
  url: string;
  content?: string;
}

export async function extractMetadata(url: string): Promise<LinkMetadata | null> {
  try {
    function normalizeUrl(input: string): string {
      const trimmed = input.trim();
      if (/^https?:\/\//i.test(trimmed)) return trimmed;
      return `https://${trimmed}`;
    }

    const targetUrl = normalizeUrl(url);

    // Special handling for Twitter/X URLs to get better metadata
    let fetchUrl = targetUrl;
    const urlObj = new URL(targetUrl);
    if (urlObj.hostname === 'twitter.com' || urlObj.hostname === 'x.com' || urlObj.hostname === 'www.twitter.com' || urlObj.hostname === 'www.x.com') {
      // Use fxtwitter for better metadata extraction
      fetchUrl = targetUrl.replace(urlObj.hostname, 'fxtwitter.com');
    }

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
        // Reduced timeout to 6s to fail faster and improve UX
        const res = await fetchWithTimeout(primaryUrl, { timeoutMs: 6000 });
        if (!res.ok) throw new Error(`Primary fetch failed: ${res.status}`);
        const contentType = res.headers.get('content-type');
        if (contentType && !contentType.includes('text/html')) {
          console.warn(`Skipping non-HTML content: ${contentType}`);
          return null;
        }
        return await res.text();
      } catch (e) {
        // Log as warning instead of error for the first attempt
        console.warn(`Primary metadata fetch failed for ${primaryUrl} (will retry with bot UA):`, e instanceof Error ? e.message : e);
        
        // Try one more time with a generic bot user agent
        try {
          const res = await fetchWithTimeout(primaryUrl, { 
            timeoutMs: 6000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
          });
          if (!res.ok) throw new Error(`Bot fetch failed: ${res.status}`);
          return await res.text();
        } catch (e2) {
          console.warn(`Bot metadata fetch failed for ${primaryUrl}:`, e2 instanceof Error ? e2.message : e2);
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

    const html = await fetchHtml(fetchUrl);
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

    const $ = cheerio.load(html);

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

    // Extract main content text
    // Remove scripts, styles, and other non-content elements
    $('script, style, noscript, iframe, svg, header, footer, nav').remove();
    
    // Get text from body, collapsing whitespace
    let mainContent = $('body').text().replace(/\s+/g, ' ').trim();
    
    // Truncate if too long (e.g. 10000 chars) to avoid huge payloads
    if (mainContent.length > 10000) {
        mainContent = mainContent.substring(0, 10000);
    }

    return { 
        title: cleanedTitle, 
        description: cleanedDescription, 
        image: resolvedImage, 
        url: targetUrl,
        content: mainContent
    };
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

