import { getCollection, type CollectionEntry } from 'astro:content';

const escapeXml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

export async function GET({ site }: { site?: URL }) {
  const origin = site ?? new URL('https://ozoneo0.cn');
  const entries = (await getCollection('writing')).sort(
    (a: CollectionEntry<'writing'>, b: CollectionEntry<'writing'>) => b.data.date.valueOf() - a.data.date.valueOf(),
  );
  const updated = entries[0]?.data.updated ?? entries[0]?.data.date ?? new Date();
  const feedUrl = new URL('/atom.xml', origin).href;
  const feed = entries.map((entry) => {
    const link = new URL(`/writing/${entry.data.slug}/`, origin).href;
    const summary = entry.data.description ?? entry.data.title;
    return `
    <entry>
      <title>${escapeXml(entry.data.title)}</title>
      <id>${escapeXml(link)}</id>
      <link href="${escapeXml(link)}" />
      <updated>${entry.data.updated?.toISOString() ?? entry.data.date.toISOString()}</updated>
      <published>${entry.data.date.toISOString()}</published>
      <summary>${escapeXml(summary)}</summary>
    </entry>`;
  }).join('');
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Ozone Layer</title>
  <id>${escapeXml(new URL('/', origin).href)}</id>
  <link href="${escapeXml(new URL('/', origin).href)}" />
  <link href="${escapeXml(feedUrl)}" rel="self" />
  <updated>${updated.toISOString()}</updated>${feed}
</feed>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' },
  });
}
