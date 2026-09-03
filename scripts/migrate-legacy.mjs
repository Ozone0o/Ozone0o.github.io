import fs from 'node:fs';
import path from 'node:path';

import {
  DAILY_ROOT,
  MEDIA_ROOT,
  ROUTES_JSON,
  WRITING_ROOT,
  collectMediaReferences,
  compareText,
  encodePublicPath,
  ensureDirectory,
  fileSlugFromTitle,
  legacySnapshotInfo,
  loadHtml,
  markdownFromHtml,
  parseDailySchedule,
  resolveLocalMedia,
  safeReportUrl,
  scanLegacySite,
  transformSrcset,
  writeMarkdownFile,
  writeReport,
} from './migration-common.mjs';

function clearGeneratedMarkdown(directory) {
  for (const entry of fs.existsSync(directory) ? fs.readdirSync(directory, { withFileTypes: true }) : []) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      clearGeneratedMarkdown(absolute);
    } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== '.gitkeep') {
      fs.unlinkSync(absolute);
    }
  }
}

function resetGeneratedOutput() {
  ensureDirectory(WRITING_ROOT);
  ensureDirectory(DAILY_ROOT);
  clearGeneratedMarkdown(WRITING_ROOT);
  clearGeneratedMarkdown(DAILY_ROOT);
  fs.rmSync(MEDIA_ROOT, { recursive: true, force: true });
  ensureDirectory(MEDIA_ROOT);
}

function markdownListItem(markdown) {
  const lines = String(markdown).split('\n');
  return lines
    .map((line, index) => {
      if (index === 0) return `- ${line}`;
      return line ? `  ${line}` : '  ';
    })
    .join('\n');
}

function makeUniqueSlug(title, used) {
  const base = fileSlugFromTitle(title);
  const count = (used.get(base) || 0) + 1;
  used.set(base, count);
  return count === 1 ? base : `${base}-${count}`;
}

function rewritePostMedia(post, media) {
  const $ = loadHtml(`<div id="post-body-root">${post.bodyHtml}</div>`);
  const body = $('#post-body-root');
  const references = collectMediaReferences($, body, post.sourceFile);
  const rewritten = new Map();
  const missingForPost = [];

  const record = (value) => {
    const resolution = resolveLocalMedia(value, post.sourceFile);
    if (resolution) {
      media.localReferencedCount += 1;
      const destination = path.join(MEDIA_ROOT, resolution.relativePath);
      const publicUrl = encodePublicPath(resolution.relativePath);
      if (!fs.existsSync(resolution.absolutePath) || !fs.statSync(resolution.absolutePath).isFile()) {
        const missing = {
          article: post.title,
          sourceFile: post.sourceFile,
          originalSrc: value,
          expectedLegacyFile: resolution.relativePath,
        };
        missingForPost.push(missing);
        const missingKey = `${post.sourceFile}\u0000${value}\u0000${resolution.relativePath}`;
        if (!media.missingByKey.has(missingKey)) {
          media.missingByKey.set(missingKey, missing);
        }
        media.errors.add(
          `Missing local media in ${post.sourceFile}: ${value} (expected legacy file ${resolution.relativePath})`,
        );
        return;
      }
      ensureDirectory(path.dirname(destination));
      const copyKey = resolution.relativePath;
      if (!media.copiedByPath.has(copyKey)) {
        fs.copyFileSync(resolution.absolutePath, destination);
        media.copiedByPath.set(copyKey, `public/media/legacy/${resolution.relativePath}`);
      }
      rewritten.set(value, publicUrl);
      return;
    }
    if (/^(?:https?:)?\/\//iu.test(String(value))) {
      media.remoteReferencedCount += 1;
      media.remoteUrls.add(safeReportUrl(value));
    } else if (/^(?:data|blob):/iu.test(String(value))) {
      media.unsupportedUrls.add(value);
    }
  };

  references.forEach((reference) => reference.sources.forEach((source) => record(source.value)));

  body.find('img').each((_, element) => {
    for (const attribute of ['src', 'data-src', 'data-original', 'data-lazy-src']) {
      const value = $(element).attr(attribute);
      if (value) $(element).attr(attribute, rewritten.get(value.trim()) || value);
    }
    for (const attribute of ['srcset', 'data-srcset']) {
      const value = $(element).attr(attribute);
      if (value) $(element).attr(attribute, transformSrcset(value, (url) => rewritten.get(url) || url));
    }
  });

  return {
    bodyHtml: body.html() || '',
    originalImageCount: post.originalStats.imageCount,
    localImageCount: references.filter((reference) => reference.sources.some((source) => source.resolution)).length,
    remoteImageCount: references.filter((reference) => reference.sources.some((source) => source.remote)).length,
    missingForPost,
  };
}

function makeWritingEntry(post, slug, media, errors) {
  const mediaResult = rewritePostMedia(post, media);
  let markdown = markdownFromHtml(mediaResult.bodyHtml);
  let comparison = compareText(post.bodyHtml, markdown);
  const warnings = [];

  if (!comparison.passed) {
    warnings.push('Turndown text mismatch; retained cleaned legacy HTML as a raw HTML fallback.');
    markdown = `<!-- Raw HTML retained for migration fidelity. -->\n\n${mediaResult.bodyHtml.trim()}`;
    comparison = compareText(post.bodyHtml, markdown);
  }
  if (!comparison.passed) {
    errors.push(`Writing text validation failed for ${post.sourceFile}`);
  }
  if (mediaResult.missingForPost.length > 0) {
    warnings.push(`${mediaResult.missingForPost.length} local media reference(s) could not be copied.`);
  }
  if (mediaResult.remoteImageCount > 0) {
    warnings.push(`${mediaResult.remoteImageCount} remote image element(s) retained by URL.`);
  }

  const frontmatter = {
    title: post.title,
    date: post.date,
    ...(post.updated ? { updated: post.updated } : {}),
    ...(post.description ? { description: post.description } : {}),
    lang: post.lang,
    legacy: true,
    legacyPath: post.legacyPath,
    sourceFile: post.sourceFile,
    ...(post.canonicalUrl ? { canonicalUrl: post.canonicalUrl } : {}),
    slug,
  };
  const fileName = `${slug}.md`;
  writeMarkdownFile(path.join(WRITING_ROOT, fileName), frontmatter, markdown);

  return {
    sourceFile: post.sourceFile,
    title: post.title,
    date: post.date,
    updated: post.updated || null,
    destination: `/writing/${slug}/`,
    legacyPath: post.legacyPath,
    canonicalUrl: post.canonicalUrl || null,
    textValidationResult: comparison.passed ? 'PASS' : 'FAIL',
    bodyNonEmpty: Boolean(comparison.originalText),
    imageCount: mediaResult.originalImageCount,
    localImageCount: mediaResult.localImageCount,
    remoteImageCount: mediaResult.remoteImageCount,
    linkCount: post.originalStats.linkCount,
    migratedLinkCount: comparison.renderedStats.linkCount,
    warnings,
    difference: comparison.passed ? null : comparison.difference,
  };
}

function makeDailyFileName(group) {
  if (group.dateResolution === 'exact') return `${group.date}.md`;
  const candidatePart = group.dateCandidates.map((date) => date.slice(-2)).join('-');
  return `${group.date}--ambiguous-${candidatePart}-${fileSlugFromTitle(group.legacyDateLabel)}.md`;
}

function migrateDaily(daily, warnings, errors) {
  const entries = [];
  const usedFileNames = new Set();
  for (const group of daily.groups) {
    let fileName = makeDailyFileName(group);
    const stem = fileName.slice(0, -3);
    let suffix = 2;
    while (usedFileNames.has(fileName)) {
      fileName = `${stem}-${suffix}.md`;
      suffix += 1;
    }
    usedFileNames.add(fileName);
    const body = group.items.map((item) => markdownListItem(item.markdown)).join('\n');
    const frontmatter = {
      date: group.date,
      itemCount: group.items.length,
      sourceOrderStart: group.sourceOrderStart,
      sourceOrderEnd: group.sourceOrderEnd,
      dateResolution: group.dateResolution,
      ...(group.dateResolution === 'ambiguous' ? { legacyDateLabel: group.legacyDateLabel } : {}),
      ...(group.dateResolution === 'ambiguous' ? { dateCandidates: group.dateCandidates } : {}),
      lang: 'zh',
      legacy: true,
      legacyPath: '/schedule/',
      sourceFile: daily.sourceFile,
    };
    writeMarkdownFile(path.join(DAILY_ROOT, fileName), frontmatter, body);
    const validationResult = group.dateResolution === 'exact'
      ? 'PASS'
      : 'REVIEW: ambiguous date heading';
    entries.push({
      date: group.date,
      legacyDateLabel: group.legacyDateLabel,
      dateResolution: group.dateResolution,
      dateCandidates: group.dateCandidates,
      itemCount: group.items.length,
      sourceOrderStart: group.sourceOrderStart,
      sourceOrderEnd: group.sourceOrderEnd,
      destination: `src/content/daily/${fileName}`,
      validationResult,
      warnings: group.warnings,
    });
    warnings.push(...group.warnings);
    if (group.dateResolution === 'ambiguous') {
      warnings.push(
        `Daily heading "${group.legacyDateLabel}" explicitly covers multiple dates; item-to-date assignment was not guessed.`,
      );
    }
  }
  if (daily.unresolvedItems.length > 0) {
    errors.push(`${daily.unresolvedItems.length} Daily item(s) had no reliable date context.`);
  }
  warnings.push(...daily.warnings);
  return entries;
}

function buildReport(scan, daily, writingEntries, dailyEntries, media, errors) {
  const writingPassed = writingEntries.filter((entry) => entry.textValidationResult === 'PASS').length;
  const writingFailed = writingEntries.length - writingPassed;
  const migratedDailyItems = dailyEntries.reduce((total, entry) => total + entry.itemCount, 0);
  const dailyItemsMatch = migratedDailyItems === daily.legacyItems && daily.unresolvedItems.length === 0;
  const reviewRequired =
    writingFailed > 0 ||
    scan.errors.length > 0 ||
    errors.length > 0 ||
    media.missingByKey.size > 0 ||
    daily.unresolvedItems.length > 0 ||
    daily.ambiguousDateCount > 0;
  const warnings = [...new Set([
    ...daily.warnings,
    ...dailyEntries.flatMap((entry) => entry.warnings || []),
    ...media.unsupportedUrls.size > 0
      ? [`${media.unsupportedUrls.size} inline/blob media URL(s) were retained without copying.`]
      : [],
    ...(daily.ambiguousDateCount > 0 ? [`${daily.ambiguousDateCount} Daily date group(s) require human date assignment review.`] : []),
  ])];
  const allErrors = [...new Set([...scan.errors, ...errors, ...media.errors])];
  const report = {
    generatedAt: new Date().toISOString(),
    status: reviewRequired ? 'NEEDS_REVIEW' : 'PASS',
    legacy: {
      site: 'https://ozoneo0.cn',
      snapshotBranch: legacySnapshotInfo().branch || 'legacy-hexo',
      snapshotSha: legacySnapshotInfo().sha,
      totalPostCount: scan.posts.length,
      totalDailyItemCount: daily.legacyItems,
      totalDailyDateCount: daily.groups.length,
      exactDailyDateCount: daily.exactDateCount,
      ambiguousDailyDateCount: daily.ambiguousDateCount,
      referencedLocalImageCount: media.localReferencedCount,
      referencedRemoteImageCount: media.remoteReferencedCount,
    },
    writing: {
      totalCount: scan.posts.length,
      migratedCount: writingEntries.length,
      entries: writingEntries,
    },
    daily: {
      sourceFile: daily.sourceFile,
      legacyItems: daily.legacyItems,
      migratedItems: migratedDailyItems,
      migratedDateGroups: dailyEntries.length,
      exactDateGroups: daily.exactDateCount,
      ambiguousDateGroups: daily.ambiguousDateCount,
      unresolvedItems: daily.unresolvedItems,
      entries: dailyEntries,
    },
    media: {
      copiedLocalFiles: [...media.copiedByPath.values()].sort(),
      missingLocalFiles: [...media.missingByKey.values()],
      remoteMediaUrls: [...media.remoteUrls].sort(),
      unsupportedUrls: [...media.unsupportedUrls].sort(),
    },
    skippedNonPostPages: scan.skippedNonPostPages,
    warnings,
    errors: allErrors,
    validation: {
      status: reviewRequired ? 'NEEDS_REVIEW' : 'PASS',
      writingTotal: scan.posts.length,
      writingMigrated: writingEntries.length,
      writingPassed,
      writingFailed,
      dailyTotal: daily.legacyItems,
      dailyMigrated: migratedDailyItems,
      dailyTextOrder: dailyItemsMatch ? 'PASS' : 'FAIL',
      dailyDateResolution: daily.ambiguousDateCount > 0 || daily.unresolvedItems.length > 0 ? 'REVIEW' : 'PASS',
      missingMedia: media.missingByKey.size,
    },
  };
  return report;
}

function main() {
  resetGeneratedOutput();
  const scan = scanLegacySite();
  const daily = parseDailySchedule();
  const media = {
    localReferencedCount: 0,
    remoteReferencedCount: 0,
    copiedByPath: new Map(),
    missingByKey: new Map(),
    remoteUrls: new Set(),
    unsupportedUrls: new Set(),
    errors: new Set(),
  };
  const errors = [];
  const usedSlugs = new Map();
  const routes = {};
  const writingEntries = scan.posts
    .sort((a, b) => a.date.localeCompare(b.date) || a.sourceFile.localeCompare(b.sourceFile))
    .map((post) => {
      const slug = makeUniqueSlug(post.title, usedSlugs);
      routes[post.legacyPath] = `/writing/${slug}/`;
      return makeWritingEntry(post, slug, media, errors);
    });
  const dailyEntries = migrateDaily(daily, [], errors);

  ensureDirectory(path.dirname(ROUTES_JSON));
  fs.writeFileSync(ROUTES_JSON, `${JSON.stringify(routes, null, 2)}\n`, 'utf8');

  const report = buildReport(scan, daily, writingEntries, dailyEntries, media, errors);
  writeReport(report);

  console.log(`Legacy post count: ${report.legacy.totalPostCount}`);
  console.log(`Legacy Daily note count: ${report.legacy.totalDailyItemCount}`);
  console.log(`Legacy Daily date groups: ${report.legacy.totalDailyDateCount}`);
  console.log(`Referenced local image count: ${report.legacy.referencedLocalImageCount}`);
  console.log(`Referenced remote image count: ${report.legacy.referencedRemoteImageCount}`);
  console.log(`Migration status: ${report.validation.status}`);
  if (report.errors.length > 0) console.log(`Migration errors: ${report.errors.length}`);
  if (report.warnings.length > 0) console.log(`Migration warnings: ${report.warnings.length}`);
}

main();
