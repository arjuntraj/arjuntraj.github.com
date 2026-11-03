// AI headlines for the ticker, fetched once at build time. The daily scheduled deploy keeps them fresh.
// Feed content is untrusted: only titles and https links are kept, and Astro escapes them on render.
import { XMLParser } from 'fast-xml-parser';

export type Headline = { title: string; url: string; source: string; published: Date };

const feeds = [
  { name: 'OpenAI', url: 'https://openai.com/news/rss.xml' },
  { name: 'Google AI', url: 'https://blog.google/technology/ai/rss/' },
  { name: 'Hugging Face', url: 'https://huggingface.co/blog/feed.xml' },
  { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed' },
  // General outlets cross-post non-AI stories into their AI feeds, so their titles must look AI-related.
  { name: 'The Verge', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', strict: true },
  { name: 'TechCrunch', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', strict: true },
];

const AI_TERMS = /\b(AI|A\.I\.|artificial intelligence|LLMs?|GPT[-\w.]*|ChatGPT|Claude|Gemini|Llama|OpenAI|Anthropic|DeepMind|Mistral|Copilot|agents?|agentic|chatbots?|models?|machine learning|neural|robots?)\b/i;

// Keep politics off a professional page, whatever the source.
const OFF_TOPIC = /\b(Trump|Biden|Harris|Musk feud|election|midterms?|Congress|Senate|senator|Republicans?|Democrats?|MAGA|White House|war|Gaza|Israel|Ukraine|Russia)\b/i;

const MAX = 16;
const PER_SOURCE = 4;
const MAX_AGE_DAYS = 10;

const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@', textNodeName: '#text' });

const text = (v: unknown): string => {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (Array.isArray(v)) return text(v[0]);
  return text((v as Record<string, unknown>)['#text'] ?? '');
};
const clean = (s: unknown) => {
  const out = text(s)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(nbsp|amp|quot|#39|#x27|lt|gt);/g, (_, e) => ({ nbsp: ' ', amp: '&', quot: '"', '#39': "'", '#x27': "'", lt: '<', gt: '>' })[e as string]!)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/\s+/g, ' ')
    .trim();
  return out.length > 140 ? `${out.slice(0, 139).trimEnd()}…` : out;
};
const linkOf = (entry: Record<string, any>) => {
  const l = entry.link;
  if (typeof l === 'string') return l;
  const list = Array.isArray(l) ? l : [l];
  const alt = list.find((x) => x?.['@rel'] === 'alternate') ?? list.find((x) => x?.['@href']) ?? list[0];
  return alt?.['@href'] ?? text(alt);
};
const safeUrl = (u: string) => {
  try {
    const url = new URL(u.trim());
    if (url.protocol !== 'https:') return null;
    for (const p of [...url.searchParams.keys()]) if (p.startsWith('utm_')) url.searchParams.delete(p);
    return url.toString();
  } catch {
    return null;
  }
};

async function fetchFeed(feed: { name: string; url: string; strict?: boolean }): Promise<Headline[]> {
  try {
    const res = await fetch(feed.url, {
      headers: { 'user-agent': 'arjuntraj.in/1.0 (+https://arjuntraj.in)', accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const doc = xml.parse(await res.text());
    const raw = doc?.rss?.channel?.item ?? doc?.feed?.entry ?? doc?.['rdf:RDF']?.item ?? [];
    const entries: Record<string, any>[] = Array.isArray(raw) ? raw : [raw];
    return entries
      .map((e) => ({
        title: clean(e.title),
        url: safeUrl(linkOf(e) || text(e.guid)) ?? '',
        source: feed.name,
        published: new Date(text(e.pubDate ?? e.published ?? e.updated ?? e['dc:date'])),
      }))
      .filter((h) => h.title && h.url && !Number.isNaN(h.published.getTime()) && !OFF_TOPIC.test(h.title) && (!feed.strict || AI_TERMS.test(h.title)))
      .sort((a, b) => b.published.getTime() - a.published.getTime())
      .slice(0, PER_SOURCE);
  } catch (err) {
    console.warn(`[news] ${feed.name}: ${(err as Error).message}`);
    return [];
  }
}

let cached: Promise<Headline[]> | undefined;

/** Most recent AI headlines across all feeds; empty if every feed fails. */
export function getHeadlines() {
  cached ??= (async () => {
    const cutoff = Date.now() - MAX_AGE_DAYS * 86_400_000;
    const seen = new Set<string>();
    return (await Promise.all(feeds.map(fetchFeed)))
      .flat()
      .filter((h) => h.published.getTime() >= cutoff && !seen.has(h.url) && seen.add(h.url))
      .sort((a, b) => b.published.getTime() - a.published.getTime())
      .slice(0, MAX);
  })();
  return cached;
}
