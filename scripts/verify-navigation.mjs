import { existsSync, readFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { load } from 'cheerio';

const distRoot = resolve('dist');
const archivePath = join(distRoot, 'archive', 'index.html');
const failures = [];

const routeFile = (href) => {
  const pathname = decodeURIComponent(new URL(href, 'https://ozone-layer.test').pathname);
  const relative = pathname.replace(/^\/+|\/+$/gu, '');
  const file = join(distRoot, relative, 'index.html');
  const normalizedRoot = `${distRoot}${sep}`;
  if (!file.startsWith(normalizedRoot)) throw new Error(`Route escapes dist: ${href}`);
  return file;
};

if (!existsSync(archivePath)) {
  failures.push(`Missing archive build: ${archivePath}`);
} else {
  const archive = load(readFileSync(archivePath, 'utf8'));
  const archiveLinks = archive('a.archive-fragment[href]').toArray();
  let writingLinks = 0;
  let dailyLinks = 0;

  for (const element of archiveLinks) {
    const href = archive(element).attr('href');
    if (!href) continue;
    const route = new URL(href, 'https://ozone-layer.test').pathname;
    let targetPath;
    try {
      targetPath = routeFile(href);
    } catch (error) {
      failures.push(error.message);
      continue;
    }
    if (!existsSync(targetPath)) {
      failures.push(`Archive link has no built target: ${href}`);
      continue;
    }

    const target = load(readFileSync(targetPath, 'utf8'));
    if (route.startsWith('/writing/')) {
      writingLinks += 1;
      if (target('.article-page').length === 0 || target('.article-prose').text().trim().length === 0) {
        failures.push(`Writing link target has no article content: ${href}`);
      }
    }
    if (route.startsWith('/daily/')) {
      dailyLinks += 1;
      const slug = route.split('/').filter(Boolean).at(-1);
      const detail = target('.sheet-content--daily-detail').filter((_, node) => target(node).attr('data-daily-group') === slug);
      const bodyText = detail.find('.daily-detail__body').text().trim();
      if (detail.length === 0 || bodyText.length === 0) {
        failures.push(`Daily link target does not contain its date group: ${href}`);
      }
    }
  }

  if (writingLinks === 0) failures.push('Archive contains no Writing links.');
  if (dailyLinks === 0) failures.push('Archive contains no Daily links.');
  console.log(`Archive navigation: ${writingLinks} Writing links, ${dailyLinks} Daily links`);
}

const feedPath = join(distRoot, 'atom.xml');
if (!existsSync(feedPath)) {
  failures.push('Missing built RSS/Atom feed: /atom.xml');
} else {
  const feed = readFileSync(feedPath, 'utf8');
  if (!feed.includes('<feed') || !feed.includes('<entry>')) failures.push('Atom feed is missing feed or entry content.');
  else console.log('RSS navigation: /atom.xml contains Writing entries');
}

if (failures.length > 0) {
  console.error('NAVIGATION VALIDATION: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('NAVIGATION VALIDATION: PASS');
}
