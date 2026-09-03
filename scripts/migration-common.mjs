import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { marked } from 'marked';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));

export const ROOT = path.resolve(scriptDirectory, '..');
export const LEGACY_ROOT = path.resolve(
  process.env.LEGACY_ROOT || path.join(ROOT, '..', 'Ozone0o.github.io-legacy'),
);
export const WRITING_ROOT = path.join(ROOT, 'src', 'content', 'writing');
export const DAILY_ROOT = path.join(ROOT, 'src', 'content', 'daily');
export const MEDIA_ROOT = path.join(ROOT, 'public', 'media', 'legacy');
export const REPORT_JSON = path.join(ROOT, 'migration', 'report.json');
export const REPORT_MARKDOWN = path.join(ROOT, 'migration', 'report.md');
export const ROUTES_JSON = path.join(ROOT, 'migration', 'legacy-routes.json');

const POST_ROUTE_PATTERN = /^\d{4}\/\d{2}\/\d{2}\/.+\/index\.html$/u;

export function ensureDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

export function toPosix(value) {
  return value.split(path.sep).join('/');
}

export function walkFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '.git') continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(absolute));
    } else if (entry.isFile()) {
      files.push(absolute);
    }
  }
  return files.sort();
}

export function legacyRelativePath(absolutePath) {
  return toPosix(path.relative(LEGACY_ROOT, absolutePath));
}

export function assertLegacyRoot() {
  const requiredFiles = ['index.html', 'archives/index.html', 'schedule/index.html'];
  if (!fs.existsSync(LEGACY_ROOT)) {
    throw new Error(`Legacy worktree does not exist: ${LEGACY_ROOT}`);
  }
  const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(LEGACY_ROOT, file)));
  if (missing.length > 0) {
    throw new Error(`Legacy worktree is missing expected files: ${missing.join(', ')}`);
  }
}

export function legacySnapshotInfo() {
  try {
    const sha = execFileSync('git', ['-C', LEGACY_ROOT, 'rev-parse', 'HEAD'], {
      encoding: 'utf8',
    }).trim();
    const branch = execFileSync('git', ['-C', LEGACY_ROOT, 'branch', '--show-current'], {
      encoding: 'utf8',
    }).trim();
    return { branch, sha };
  } catch {
    return { branch: null, sha: null };
  }
}

export function readLegacyFile(relativePath) {
  return fs.readFileSync(path.join(LEGACY_ROOT, relativePath), 'utf8');
}

export function loadHtml(html) {
  return cheerio.load(html, { decodeEntities: false });
}

export function pageConfigIsPost(html) {
  const configuration = html.match(/<script[^>]+id=["']page-configurations["'][^>]*>([\s\S]*?)<\/script>/iu)?.[1] || html;
  return /\bisPost\s*:\s*true\b/iu.test(configuration);
}

function articleFromDocument($) {
  return $('article')
    .filter((_, element) => {
      const itemType = $(element).attr('itemtype') || '';
      return /schema\.org\/Article/iu.test(itemType);
    })
    .first();
}

export function cleanGeneratedBody($, body) {
  const cleaned = body.clone();
  cleaned
    .find(
      '.headerlink, script, style, nav, .sidebar, .comments, .post-footer, .post-nav, .post-meta, .site-info, .pagination',
    )
    .remove();
  cleaned.find('span#more').each((_, element) => {
    $(element).replaceWith('<!-- more -->');
  });
  return cleaned;
}

export function canonicalPath(value, fallbackPath) {
  try {
    const pathname = new URL(value, 'https://ozoneo0.cn/').pathname;
    return pathname.endsWith('/') ? pathname : `${pathname}/`;
  } catch {
    const withoutIndex = fallbackPath.replace(/\/index\.html$/u, '');
    return `/${withoutIndex.replace(/^\/+/u, '')}/`;
  }
}

function firstAttribute($, selector, attribute) {
  const value = $(selector).first().attr(attribute);
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function dateOnly(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.toISOString().slice(0, 10);
  }
  const match = String(value).match(/(\d{4}-\d{2}-\d{2})/u);
  return match?.[1] || null;
}

export function extractPost(relativePath, html) {
  const $ = loadHtml(html);
  const article = articleFromDocument($);
  const body = article.find('.post-body').first();
  if (!article.length || !body.length) {
    throw new Error(`Post page has no Article/post-body structure: ${relativePath}`);
  }

  const cleanedBody = cleanGeneratedBody($, body);
  const bodyHtml = cleanedBody.html() || '';
  const title =
    firstAttribute($, 'meta[property="og:title"]', 'content') ||
    normalizeText(article.find('[itemprop="headline"], .post-title').first().text());
  const description =
    firstAttribute($, 'meta[name="description"]', 'content') ||
    firstAttribute($, 'meta[property="og:description"]', 'content') ||
    undefined;
  const publishedValue =
    article.find('time').filter((_, element) => /datePublished/u.test($(element).attr('itemprop') || '')).first().attr('datetime') ||
    firstAttribute($, 'meta[property="article:published_time"]', 'content');
  const updatedValue =
    article.find('time').filter((_, element) => /dateModified/u.test($(element).attr('itemprop') || '')).first().attr('datetime') ||
    firstAttribute($, 'meta[property="article:modified_time"]', 'content');
  const canonical = firstAttribute($, 'link[rel="canonical"]', 'href');
  const lang = article.attr('lang') || 'zh';

  if (!title) throw new Error(`Post page has no title: ${relativePath}`);
  if (!dateOnly(publishedValue)) throw new Error(`Post page has no published date: ${relativePath}`);

  return {
    sourceFile: relativePath,
    title,
    description,
    date: dateOnly(publishedValue),
    updated: dateOnly(updatedValue),
    lang,
    canonicalUrl: canonical || undefined,
    legacyPath: canonicalPath(canonical, relativePath),
    bodyHtml,
    originalStats: analyzeHtml(bodyHtml, relativePath),
  };
}

export function scanLegacySite() {
  assertLegacyRoot();
  const htmlFiles = walkFiles(LEGACY_ROOT)
    .filter((file) => file.toLowerCase().endsWith('.html'))
    .map(legacyRelativePath)
    .sort();
  const posts = [];
  const skippedNonPostPages = [];
  const errors = [];

  for (const relativePath of htmlFiles) {
    const html = readLegacyFile(relativePath);
    const isPost = pageConfigIsPost(html);
    if (!isPost) {
      skippedNonPostPages.push({
        sourceFile: relativePath,
        reason: 'not a post page (page configuration isPost is false or absent)',
      });
      continue;
    }
    if (!POST_ROUTE_PATTERN.test(relativePath)) {
      errors.push(`isPost=true page is outside the dated post route pattern: ${relativePath}`);
      continue;
    }
    try {
      posts.push(extractPost(relativePath, html));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return { htmlFiles, posts, skippedNonPostPages, errors };
}

export function normalizeText(value) {
  return String(value ?? '')
    .replace(/\u00a0/gu, ' ')
    .replace(/\r\n?/gu, '\n')
    .replace(/\s+/gu, ' ')
    .trim();
}

export function textFromHtml(html) {
  const $ = loadHtml(`<div id="migration-text-root">${html}</div>`);
  const root = $('#migration-text-root');
  root.find('br').replaceWith('\n');
  root
    .find('address, article, aside, blockquote, center, dd, div, figcaption, figure, h1, h2, h3, h4, h5, h6, li, ol, p, pre, table, tbody, td, tfoot, th, thead, tr, ul')
    .each((_, element) => {
      $(element).prepend(' ').append(' ');
    });
  return normalizeText(root.text());
}

function imageAttributeValues($, element) {
  const values = [];
  for (const attribute of ['src', 'data-src', 'data-original', 'data-lazy-src']) {
    const value = $(element).attr(attribute);
    if (typeof value === 'string' && value.trim()) {
      values.push({ attribute, value: value.trim() });
    }
  }
  const srcset = $(element).attr('srcset') || $(element).attr('data-srcset');
  if (srcset) {
    for (const part of parseSrcset(srcset)) {
      values.push({ attribute: 'srcset', value: part.url });
    }
  }
  return values.filter((item, index, all) => all.findIndex((other) => other.value === item.value) === index);
}

export function parseSrcset(value) {
  return String(value)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [url, ...descriptor] = part.split(/\s+/u);
      return { url, descriptor: descriptor.join(' ') };
    });
}

export function isRemoteUrl(value) {
  return /^(?:https?:)?\/\//iu.test(String(value).trim());
}

export function isDataUrl(value) {
  return /^(?:data|blob):/iu.test(String(value).trim());
}

export function resolveLocalMedia(value, sourceFile) {
  const original = String(value).trim();
  if (!original || isRemoteUrl(original) || isDataUrl(original)) return null;
  if (/^[a-z][a-z\d+.-]*:/iu.test(original)) return null;

  let parsed;
  try {
    parsed = new URL(original, `https://legacy.local/${sourceFile}`);
  } catch {
    return null;
  }
  if (parsed.hostname !== 'legacy.local') return null;

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(parsed.pathname);
  } catch {
    decodedPath = parsed.pathname;
  }
  const relativePath = toPosix(decodedPath).replace(/^\/+/u, '');
  if (!relativePath || relativePath === '.' || relativePath.includes('\0')) return null;
  const root = path.resolve(LEGACY_ROOT);
  const absolutePath = path.resolve(root, relativePath);
  if (absolutePath !== root && !absolutePath.startsWith(`${root}${path.sep}`)) return null;
  return { original, relativePath, absolutePath };
}

export function collectMediaReferences($, body, sourceFile) {
  const references = [];
  body.find('img').each((index, element) => {
    const sources = imageAttributeValues($, element).map((item) => ({
      ...item,
      resolution: resolveLocalMedia(item.value, sourceFile),
      remote: isRemoteUrl(item.value),
      data: isDataUrl(item.value),
    }));
    references.push({ index, sources });
  });
  return references;
}

export function analyzeHtml(html, sourceFile = null) {
  const $ = loadHtml(`<div id="migration-analysis-root">${html}</div>`);
  const root = $('#migration-analysis-root');
  const images = root.find('img').toArray();
  const imageReferences = images.map((element) => imageAttributeValues($, element));
  const remoteImageCount = imageReferences.filter((sources) => sources.some((source) => isRemoteUrl(source.value))).length;
  const localImageCount = sourceFile
    ? imageReferences.filter((sources) => sources.some((source) => resolveLocalMedia(source.value, sourceFile))).length
    : imageReferences.filter((sources) => sources.some((source) => /^\/(?:media\/legacy|images|imgs)\//u.test(source.value))).length;
  return {
    text: textFromHtml(html),
    imageCount: images.length,
    localImageCount,
    remoteImageCount,
    linkCount: root.find('a[href]').not('.headerlink').length,
  };
}

export function makeTurndown() {
  const service = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    strongDelimiter: '**',
  });
  service.use(gfm);
  service.addRule('more-marker', {
    filter: (node) => node.nodeName === 'SPAN' && node.getAttribute('id') === 'more',
    replacement: () => '\n\n<!-- more -->\n\n',
  });
  service.keep(['iframe', 'video', 'audio', 'canvas', 'svg', 'details', 'summary', 'object', 'embed']);
  return service;
}

export function markdownFromHtml(html) {
  return makeTurndown().turndown(html).trim();
}

export function renderMarkdown(markdown) {
  return marked.parse(markdown, { gfm: true, breaks: false });
}

export function compareText(originalHtml, markdown) {
  const originalText = textFromHtml(originalHtml);
  const renderedHtml = renderMarkdown(markdown);
  const renderedText = textFromHtml(renderedHtml);
  return {
    passed: originalText === renderedText,
    originalText,
    renderedText,
    renderedHtml,
    originalStats: analyzeHtml(originalHtml),
    renderedStats: analyzeHtml(renderedHtml),
    difference: firstDifference(originalText, renderedText),
  };
}

export function firstDifference(expected, actual) {
  const limit = Math.min(expected.length, actual.length);
  let index = 0;
  while (index < limit && expected[index] === actual[index]) index += 1;
  if (index === expected.length && index === actual.length) return null;
  return {
    index,
    expected: expected.slice(Math.max(0, index - 80), index + 120),
    actual: actual.slice(Math.max(0, index - 80), index + 120),
  };
}

function cleanScheduleBody(body) {
  const cleaned = body.clone();
  cleaned.find('.headerlink, script, style, nav, .sidebar, .comments').remove();
  return cleaned;
}

function headingText($, element) {
  const clone = $(element).clone();
  clone.find('.headerlink').remove();
  return normalizeText(clone.text());
}

const MONTHS = new Map([
  ['january', 1], ['february', 2], ['march', 3], ['april', 4],
  ['may', 5], ['june', 6], ['july', 7], ['august', 8],
  ['september', 9], ['october', 10], ['november', 11], ['december', 12],
  ['jan', 1], ['feb', 2], ['mar', 3], ['apr', 4], ['jun', 6],
  ['jul', 7], ['aug', 8], ['sep', 9], ['sept', 9], ['oct', 10],
  ['nov', 11], ['dec', 12],
  ['一月', 1], ['二月', 2], ['三月', 3], ['四月', 4], ['五月', 5], ['六月', 6],
  ['七月', 7], ['八月', 8], ['九月', 9], ['十月', 10], ['十一月', 11], ['十二月', 12],
]);

function parseMonthHeading(value) {
  const normalized = normalizeText(value).toLowerCase().replace(/[.。月份月\s]+$/u, '');
  if (MONTHS.has(normalized)) return MONTHS.get(normalized);
  const numeric = normalized.match(/^(\d{1,2})$/u)?.[1];
  if (numeric && Number(numeric) >= 1 && Number(numeric) <= 12) return Number(numeric);
  return null;
}

function parseDayHeading(value) {
  const normalized = normalizeText(value);
  const exact = normalized.match(/^(\d{1,2})(?:\s*(?:日|号))?$/u);
  if (exact) return { kind: 'exact', days: [Number(exact[1])], label: normalized };
  const multiple = normalized.match(
    /^(\d{1,2}(?:\s*(?:&&|&|and|[-–—~～至])\s*\d{1,2})+)\s*(.*)$/iu,
  );
  if (multiple) {
    const days = multiple[1].match(/\d{1,2}/gu).map(Number);
    return { kind: 'ambiguous', days, label: normalized };
  }
  return { kind: 'invalid', days: [], label: normalized };
}

export function validDateOnly(value) {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function dateFromParts(year, month, day) {
  const value = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return validDateOnly(value) ? value : null;
}

function safeGroupSlug(value) {
  return normalizeText(value)
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .toLowerCase() || 'date-group';
}

function dailyItemMarkdown($, element, turndown) {
  const clone = $(element).clone();
  clone.find('ul, ol').remove();
  clone.find('.headerlink').remove();
  const html = clone.html() || '';
  const sourceText = textFromHtml(html);
  let markdown = turndown.turndown(html).trim();
  let fallback = false;
  if (normalizeText(textFromHtml(renderMarkdown(markdown))) !== sourceText) {
    markdown = html.trim();
    fallback = true;
  }
  return { markdown, text: sourceText, fallback };
}

export function parseDailySchedule() {
  const relativePath = 'schedule/index.html';
  const html = readLegacyFile(relativePath);
  const $ = loadHtml(html);
  const sourceBody = $('.post-body').first();
  if (!sourceBody.length) throw new Error('schedule/index.html has no .post-body');
  const body = cleanScheduleBody(sourceBody);
  const turndown = makeTurndown();
  const groups = new Map();
  const warnings = [];
  const unresolvedItems = [];
  let currentYear = null;
  let currentMonth = null;
  let currentDay = null;
  let currentDateResolution = 'exact';
  let currentDateCandidates = [];
  let currentDateLabel = null;
  let sourceOrder = 0;

  for (const element of body.find('h1, h2, h3, li').toArray()) {
    const tagName = element.tagName?.toLowerCase();
    if (tagName === 'h1') {
      const year = headingText($, element).match(/^(\d{4})$/u)?.[1];
      currentYear = year ? Number(year) : null;
      currentMonth = null;
      currentDay = null;
      currentDateCandidates = [];
      currentDateLabel = null;
      if (!year) warnings.push(`Unrecognized Daily year heading: ${headingText($, element)}`);
      continue;
    }
    if (tagName === 'h2') {
      const label = headingText($, element);
      const month = parseMonthHeading(label);
      if (month) {
        currentMonth = month;
        currentDay = null;
        currentDateCandidates = [];
        currentDateLabel = null;
      }
      continue;
    }
    if (tagName === 'h3') {
      const label = headingText($, element);
      const parsed = parseDayHeading(label);
      currentDay = parsed.kind === 'exact' ? parsed.days[0] : null;
      currentDateResolution = parsed.kind;
      currentDateCandidates = parsed.days;
      currentDateLabel = label;
      if (parsed.kind === 'invalid') {
        warnings.push(`Unrecognized Daily day heading: ${label}`);
      }
      continue;
    }

    sourceOrder += 1;
    const item = dailyItemMarkdown($, element, turndown);
    const candidateDates = currentDateCandidates
      .map((day) => currentYear && currentMonth ? dateFromParts(currentYear, currentMonth, day) : null)
      .filter(Boolean);
    const hasAllCandidateDates = candidateDates.length === currentDateCandidates.length && candidateDates.length > 0;
    const exactDate = currentDateResolution === 'exact' && currentYear && currentMonth && currentDay
      ? dateFromParts(currentYear, currentMonth, currentDay)
      : null;
    const date = exactDate || (currentDateResolution === 'ambiguous' && hasAllCandidateDates ? candidateDates[0] : null);
    let groupKey = null;
    let dateResolution = currentDateResolution;
    let dateCandidates = candidateDates;

    if (date && dateResolution === 'exact') {
      groupKey = `exact:${date}`;
      dateCandidates = [date];
    } else if (date && dateResolution === 'ambiguous') {
      groupKey = `ambiguous:${date}:${candidateDates.join('-')}:${safeGroupSlug(currentDateLabel)}`;
    } else {
      dateResolution = 'invalid';
      unresolvedItems.push({ sourceOrder, text: item.text, heading: currentDateLabel });
      warnings.push(`Daily item ${sourceOrder} could not be assigned a reliable date.`);
    }

    if (groupKey) {
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          key: groupKey,
          date,
          dateResolution,
          dateCandidates,
          legacyDateLabel: dateResolution === 'exact' ? date : currentDateLabel,
          sourceOrderStart: sourceOrder,
          sourceOrderEnd: sourceOrder,
          items: [],
          warnings: [],
        });
      }
      const group = groups.get(groupKey);
      group.items.push({ sourceOrder, text: item.text, markdown: item.markdown });
      group.sourceOrderEnd = sourceOrder;
      if (item.fallback) {
        group.warnings.push(`Daily item ${sourceOrder} used raw HTML fallback after Turndown text mismatch.`);
      }
    }
  }

  const groupList = [...groups.values()];
  const ambiguousGroups = groupList.filter((group) => group.dateResolution === 'ambiguous');
  const exactGroups = groupList.filter((group) => group.dateResolution === 'exact');
  return {
    sourceFile: relativePath,
    legacyItems: sourceOrder,
    groups: groupList,
    exactDateCount: exactGroups.length,
    ambiguousDateCount: ambiguousGroups.length,
    warnings,
    unresolvedItems,
  };
}

export function writeMarkdownFile(filePath, frontmatter, body) {
  ensureDirectory(path.dirname(filePath));
  const yaml = stringifyYaml(frontmatter, { lineWidth: 0 });
  fs.writeFileSync(filePath, `---\n${yaml}---\n\n${body.trim()}\n`, 'utf8');
}

export function parseMarkdownFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)([\s\S]*)$/u);
  if (!match) throw new Error(`Markdown file has no parseable frontmatter: ${filePath}`);
  return { data: parseYaml(match[1]) || {}, body: match[2], raw };
}

export function safeReportUrl(value) {
  const original = String(value);
  try {
    const url = new URL(original, 'https://legacy.local/');
    if (!/^https?:$/iu.test(url.protocol)) return original;
    url.username = '';
    url.password = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/(?:secret|token|password|passwd|api[_-]?key|access[_-]?key|auth)/iu.test(key)) {
        url.searchParams.set(key, '[redacted]');
      }
    }
    return url.toString();
  } catch {
    return original;
  }
}

export function writeReport(report) {
  ensureDirectory(path.dirname(REPORT_JSON));
  fs.writeFileSync(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(REPORT_MARKDOWN, reportToMarkdown(report), 'utf8');
}

function markdownCell(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

export function reportToMarkdown(report) {
  const legacy = report.legacy || {};
  const writing = report.writing || {};
  const daily = report.daily || {};
  const media = report.media || {};
  const validation = report.validation || {};
  const lines = [
    '# Legacy → Astro migration report',
    '',
    `Generated: ${report.generatedAt || 'not run'}`,
    `Status: **${validation.status || report.status || 'NOT_RUN'}**`,
    '',
    '## Legacy site',
    '',
    `- Site: ${legacy.site || 'https://ozoneo0.cn'}`,
    `- Snapshot branch: ${legacy.snapshotBranch || 'unknown'}`,
    `- Snapshot SHA: ${legacy.snapshotSha || 'unknown'}`,
    `- Legacy post count: ${legacy.totalPostCount ?? 0}`,
    `- Legacy Daily item count: ${legacy.totalDailyItemCount ?? 0}`,
    `- Legacy Daily date groups: ${legacy.totalDailyDateCount ?? 0}`,
    '',
    '## Writing migration',
    '',
    `- Migrated: ${writing.migratedCount ?? 0} / ${writing.totalCount ?? legacy.totalPostCount ?? 0}`,
    `- Text validation passed: ${validation.writingPassed ?? 0}`,
    `- Text validation failed: ${validation.writingFailed ?? 0}`,
    '',
    '| Source file | Title | Date | Destination | Legacy URL | Text | Images | Warnings |',
    '| --- | --- | --- | --- | --- | --- | ---: | --- |',
  ];
  for (const entry of writing.entries || []) {
    lines.push(
      `| ${markdownCell(entry.sourceFile)} | ${markdownCell(entry.title)} | ${markdownCell(entry.date)} | ${markdownCell(entry.destination)} | ${markdownCell(entry.legacyPath)} | ${markdownCell(entry.textValidationResult)} | ${entry.imageCount ?? 0} | ${markdownCell((entry.warnings || []).join('; '))} |`,
    );
  }
  lines.push(
    '',
    '## Daily migration',
    '',
    `- Legacy items: ${daily.legacyItems ?? 0}`,
    `- Migrated items: ${daily.migratedItems ?? 0}`,
    `- Migrated date groups: ${daily.migratedDateGroups ?? 0}`,
    `- Exact date groups: ${daily.exactDateGroups ?? 0}`,
    `- Ambiguous date groups: ${daily.ambiguousDateGroups ?? 0}`,
    '',
    '| Date / legacy label | Items | Resolution | Validation |',
    '| --- | ---: | --- | --- |',
  );
  for (const entry of daily.entries || []) {
    lines.push(
      `| ${markdownCell(entry.legacyDateLabel || entry.date)} | ${entry.itemCount ?? 0} | ${markdownCell(entry.dateResolution)} | ${markdownCell(entry.validationResult)} |`,
    );
  }
  lines.push(
    '',
    '## Media',
    '',
    `- Local references: ${legacy.referencedLocalImageCount ?? 0}`,
    `- Copied local files: ${media.copiedLocalFiles?.length ?? 0}`,
    `- Missing local files: ${media.missingLocalFiles?.length ?? 0}`,
    `- Remote image references: ${legacy.referencedRemoteImageCount ?? 0}`,
    '',
    '### Copied local files',
    '',
  );
  for (const file of media.copiedLocalFiles || []) lines.push(`- \`${file}\``);
  lines.push('', '### Missing local files', '');
  for (const item of media.missingLocalFiles || []) {
    lines.push(`- ${markdownCell(item.article)} — \`${markdownCell(item.originalSrc)}\` → \`${markdownCell(item.expectedLegacyFile)}\``);
  }
  lines.push('', '### Remote media URLs', '');
  for (const url of media.remoteMediaUrls || []) lines.push(`- ${safeReportUrl(url)}`);
  lines.push('', '## Warnings / unresolved issues', '');
  if (!(report.warnings || []).length) lines.push('- None');
  for (const warning of report.warnings || []) lines.push(`- ${markdownCell(warning)}`);
  lines.push('', '## Errors', '');
  if (!(report.errors || []).length) lines.push('- None');
  for (const error of report.errors || []) lines.push(`- ${markdownCell(error)}`);
  lines.push('', '## Skipped non-post pages', '');
  if (!(report.skippedNonPostPages || []).length) lines.push('- None');
  for (const page of report.skippedNonPostPages || []) lines.push(`- \`${page.sourceFile}\` — ${page.reason}`);
  lines.push('');
  return lines.join('\n');
}

export function fileSlugFromTitle(title) {
  const slug = String(title)
    .normalize('NFKC')
    .trim()
    .replace(/&/gu, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .toLowerCase();
  return slug || 'untitled';
}

export function encodePublicPath(relativePath) {
  return `/${['media', 'legacy', ...toPosix(relativePath).split('/')].map((segment) => encodeURIComponent(segment)).join('/')}`;
}

export function transformSrcset(value, transform) {
  return parseSrcset(value)
    .map(({ url, descriptor }) => {
      const next = transform(url);
      return [next, descriptor].filter(Boolean).join(' ');
    })
    .join(', ');
}
