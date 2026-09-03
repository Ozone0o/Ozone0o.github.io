import fs from 'node:fs';
import path from 'node:path';

import {
  DAILY_ROOT,
  REPORT_JSON,
  ROOT,
  WRITING_ROOT,
  analyzeHtml,
  firstDifference,
  loadHtml,
  parseDailySchedule,
  parseMarkdownFile,
  renderMarkdown,
  scanLegacySite,
  textFromHtml,
  validDateOnly,
  walkFiles,
  writeReport,
} from './migration-common.mjs';

function dateOnly(value) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10);
  return String(value ?? '').match(/(\d{4}-\d{2}-\d{2})/u)?.[1] || null;
}

function markdownFiles(directory) {
  return walkFiles(directory).filter((file) => file.endsWith('.md'));
}

function readLegacyMarkdownEntries(directory) {
  const entries = [];
  const parseErrors = [];
  for (const file of markdownFiles(directory)) {
    try {
      const parsed = parseMarkdownFile(file);
      if (parsed.data?.legacy === true) entries.push({ file, ...parsed });
    } catch (error) {
      parseErrors.push(error instanceof Error ? error.message : String(error));
    }
  }
  return { entries, parseErrors };
}

function verifyWriting(scan) {
  const { entries: files, parseErrors } = readLegacyMarkdownEntries(WRITING_ROOT);
  const bySource = new Map();
  const errors = [...parseErrors];
  for (const entry of files) {
    const source = entry.data.sourceFile;
    if (!source) {
      errors.push(`Writing file has no sourceFile: ${path.relative(ROOT, entry.file)}`);
    } else if (bySource.has(source)) {
      errors.push(`Duplicate migrated Writing sourceFile: ${source}`);
    } else {
      bySource.set(source, entry);
    }
  }

  const reportEntries = [];
  for (const post of scan.posts) {
    const entry = bySource.get(post.sourceFile);
    const base = {
      sourceFile: post.sourceFile,
      title: post.title,
      date: post.date,
      destination: entry ? `/writing/${entry.data.slug}/` : null,
      legacyPath: post.legacyPath,
      warnings: [],
    };
    if (!entry) {
      reportEntries.push({ ...base, textValidationResult: 'FAIL', failureReasons: ['migrated file is missing'] });
      errors.push(`Missing migrated Writing file for ${post.sourceFile}`);
      continue;
    }

    let comparison;
    try {
      comparison = {
        ...verifyBody(post, entry.body),
        originalStats: post.originalStats,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Could not render migrated Writing ${post.sourceFile}: ${message}`);
      reportEntries.push({ ...base, textValidationResult: 'FAIL', failureReasons: [message] });
      continue;
    }

    const checks = {
      title: entry.data.title === post.title,
      publishedDate: dateOnly(entry.data.date) === post.date,
      legacyPath: entry.data.legacyPath === post.legacyPath,
      canonicalUrl: !post.canonicalUrl || entry.data.canonicalUrl === post.canonicalUrl,
      bodyNonEmpty: Boolean(comparison.originalText) && Boolean(comparison.renderedText),
      text: comparison.originalText === comparison.renderedText,
      imageCount: comparison.originalStats.imageCount === comparison.renderedStats.imageCount,
      remoteImageCount: comparison.originalStats.remoteImageCount === comparison.renderedStats.remoteImageCount,
      localImageCount: comparison.originalStats.localImageCount === comparison.renderedStats.localImageCount,
      linkCount: comparison.originalStats.linkCount === comparison.renderedStats.linkCount,
    };
    const failureReasons = Object.entries(checks)
      .filter(([, passed]) => !passed)
      .map(([name]) => name);
    const passed = failureReasons.length === 0;
    if (!passed) errors.push(`Writing validation failed for ${post.sourceFile}: ${failureReasons.join(', ')}`);
    reportEntries.push({
      ...base,
      title: entry.data.title,
      date: dateOnly(entry.data.date),
      updated: dateOnly(entry.data.updated),
      legacyPath: entry.data.legacyPath,
      textValidationResult: passed ? 'PASS' : 'FAIL',
      checks,
      imageCount: comparison.originalStats.imageCount,
      localImageCount: comparison.originalStats.localImageCount,
      remoteImageCount: comparison.originalStats.remoteImageCount,
      linkCount: comparison.originalStats.linkCount,
      migratedLinkCount: comparison.renderedStats.linkCount,
      warnings: entry.data.date ? [] : ['date metadata is missing'],
      difference: comparison.originalText === comparison.renderedText ? null : firstDifference(comparison.originalText, comparison.renderedText),
      failureReasons,
    });
  }

  const expectedSources = new Set(scan.posts.map((post) => post.sourceFile));
  for (const source of bySource.keys()) {
    if (!expectedSources.has(source)) errors.push(`Extra migrated Writing file has unknown sourceFile: ${source}`);
  }
  return {
    entries: reportEntries,
    errors,
    total: scan.posts.length,
    migrated: bySource.size,
    passed: reportEntries.filter((entry) => entry.textValidationResult === 'PASS').length,
    failed: reportEntries.filter((entry) => entry.textValidationResult !== 'PASS').length,
  };
}

function verifyBody(post, markdown) {
  const renderedHtml = renderMarkdown(markdown);
  const renderedStats = analyzeHtml(renderedHtml);
  const originalText = textFromHtml(post.bodyHtml);
  const renderedText = textFromHtml(renderedHtml);
  return {
    originalText,
    renderedText,
    renderedStats,
  };
}

function listTexts(markdown) {
  const html = renderMarkdown(markdown);
  const $ = loadHtml(`<div id="daily-render-root">${html}</div>`);
  const items = $('#daily-render-root')
    .find('li')
    .toArray()
    .map((element) => textFromHtml($.html(element)));
  return { html, items };
}

function verifyDaily(dailySource) {
  const { entries: files, parseErrors } = readLegacyMarkdownEntries(DAILY_ROOT);
  const errors = [...parseErrors];
  const expectedGroups = dailySource.groups;
  const expectedItems = expectedGroups.flatMap((group) => group.items);
  const actualGroups = [];
  const reportEntries = [];

  for (const entry of files) {
    const date = dateOnly(entry.data.date);
    const sourceStart = Number(entry.data.sourceOrderStart);
    const sourceEnd = Number(entry.data.sourceOrderEnd);
    const expected = expectedGroups.find(
      (group) => group.sourceOrderStart === sourceStart && group.sourceOrderEnd === sourceEnd,
    );
    const rendered = listTexts(entry.body);
    const failures = [];
    if (!date || !validDateOnly(date)) failures.push('invalid date');
    if (!expected) failures.push('source order range does not match legacy schedule');
    if (Number(entry.data.itemCount) !== rendered.items.length) failures.push('itemCount does not match rendered list items');
    if (expected && date !== expected.date) failures.push('base date differs from legacy date context');
    if (expected && entry.data.dateResolution !== expected.dateResolution) failures.push('date resolution differs');
    if (expected && expected.dateResolution === 'ambiguous') {
      const expectedCandidates = JSON.stringify(expected.dateCandidates);
      const actualCandidates = JSON.stringify((entry.data.dateCandidates || []).map(dateOnly));
      if (expectedCandidates !== actualCandidates) failures.push('ambiguous date candidates differ');
    }

    const sourceOrderItems = rendered.items.map((text, index) => ({
      sourceOrder: sourceStart + index,
      text,
    }));
    actualGroups.push({ entry, sourceStart, sourceEnd, items: sourceOrderItems, failures });
    const isReview = entry.data.dateResolution === 'ambiguous';
    const validationResult = failures.length > 0 ? 'FAIL' : isReview ? 'REVIEW: ambiguous date heading' : 'PASS';
    if (failures.length > 0) errors.push(`Daily group ${path.basename(entry.file)}: ${failures.join(', ')}`);
    reportEntries.push({
      date,
      legacyDateLabel: entry.data.legacyDateLabel || date,
      dateResolution: entry.data.dateResolution,
      dateCandidates: entry.data.dateCandidates || [date],
      itemCount: rendered.items.length,
      sourceOrderStart: sourceStart,
      sourceOrderEnd: sourceEnd,
      destination: path.relative(ROOT, entry.file),
      validationResult,
      mismatch: failures,
    });
  }

  actualGroups.sort((a, b) => a.sourceStart - b.sourceStart);
  const actualItems = actualGroups.flatMap((group) => group.items);
  if (actualItems.length !== expectedItems.length) {
    errors.push(`Daily item count mismatch: legacy ${expectedItems.length}, migrated ${actualItems.length}`);
  }
  const itemMismatches = [];
  const itemLimit = Math.max(expectedItems.length, actualItems.length);
  for (let index = 0; index < itemLimit; index += 1) {
    const expected = expectedItems[index];
    const actual = actualItems[index];
    if (!expected || !actual || expected.text !== actual.text || expected.sourceOrder !== actual.sourceOrder) {
      itemMismatches.push({
        sourceOrder: expected?.sourceOrder || actual?.sourceOrder || index + 1,
        expected: expected?.text || null,
        actual: actual?.text || null,
        difference: expected && actual ? firstDifference(expected.text, actual.text) : null,
      });
    }
  }
  if (itemMismatches.length > 0) errors.push(`Daily source order/text mismatches: ${itemMismatches.length}`);

  const expectedRanges = new Set(expectedGroups.map((group) => `${group.sourceOrderStart}:${group.sourceOrderEnd}`));
  const actualRanges = new Set(actualGroups.map((group) => `${group.sourceStart}:${group.sourceEnd}`));
  for (const range of expectedRanges) if (!actualRanges.has(range)) errors.push(`Missing migrated Daily group: ${range}`);
  for (const range of actualRanges) if (!expectedRanges.has(range)) errors.push(`Extra migrated Daily group: ${range}`);

  return {
    entries: reportEntries,
    errors,
    legacyItems: expectedItems.length,
    migratedItems: actualItems.length,
    dateGroups: actualGroups.length,
    textOrderPassed: errors.length === 0 || (
      actualItems.length === expectedItems.length && itemMismatches.length === 0 &&
      actualGroups.every((group) => group.failures.length === 0)
    ),
    dateResolutionPassed: dailySource.ambiguousDateCount === 0 && dailySource.unresolvedItems.length === 0,
    itemMismatches,
  };
}

function verifyMedia(report, scan) {
  const errors = [];
  const missing = [];
  for (const relativeFile of report.media?.copiedLocalFiles || []) {
    const absolute = path.join(ROOT, relativeFile);
    if (!fs.existsSync(absolute)) errors.push(`Copied media file is missing: ${relativeFile}`);
  }
  for (const item of report.media?.missingLocalFiles || []) {
    missing.push(item);
  }
  for (const post of scan.posts) {
    const file = markdownFiles(WRITING_ROOT).find((candidate) => {
      try {
        return parseMarkdownFile(candidate).data.sourceFile === post.sourceFile;
      } catch {
        return false;
      }
    });
    if (!file) continue;
    const parsed = parseMarkdownFile(file);
    const html = renderMarkdown(parsed.body);
    const $ = loadHtml(`<div id="media-check-root">${html}</div>`);
    $('#media-check-root').find('img').each((_, element) => {
      const src = $(element).attr('src');
      if (src?.startsWith('/media/legacy/')) {
        const relative = decodeURIComponent(src.replace(/^\//u, ''));
        if (!fs.existsSync(path.join(ROOT, 'public', relative.replace(/^media\//u, 'media/')))) {
          errors.push(`Rendered media file is missing for ${post.sourceFile}: ${src}`);
        }
      }
    });
  }
  return { errors, missing };
}

function main() {
  const report = JSON.parse(fs.readFileSync(REPORT_JSON, 'utf8'));
  const scan = scanLegacySite();
  const writing = verifyWriting(scan);
  const dailySource = parseDailySchedule();
  const daily = verifyDaily(dailySource);
  const media = verifyMedia(report, scan);
  const errors = [...new Set([...scan.errors, ...writing.errors, ...daily.errors, ...media.errors])];
  const warnings = new Set(report.warnings || []);
  if (dailySource.ambiguousDateCount > 0) {
    warnings.add(`${dailySource.ambiguousDateCount} Daily date group(s) require human date assignment review.`);
  }
  if (media.missing.length > 0) warnings.add(`${media.missing.length} referenced local media file(s) are missing from the legacy snapshot.`);

  const contentPassed = writing.failed === 0 && daily.textOrderPassed && media.missing.length === 0 && errors.length === 0;
  const status = contentPassed && daily.dateResolutionPassed ? 'PASS' : 'NEEDS_REVIEW';
  report.generatedAt = new Date().toISOString();
  report.status = status;
  report.writing = {
    ...(report.writing || {}),
    totalCount: writing.total,
    migratedCount: writing.migrated,
    entries: writing.entries,
  };
  report.daily = {
    ...(report.daily || {}),
    sourceFile: dailySource.sourceFile,
    legacyItems: daily.legacyItems,
    migratedItems: daily.migratedItems,
    migratedDateGroups: daily.dateGroups,
    exactDateGroups: dailySource.exactDateCount,
    ambiguousDateGroups: dailySource.ambiguousDateCount,
    unresolvedItems: dailySource.unresolvedItems,
    entries: daily.entries,
    mismatchedEntries: daily.itemMismatches,
  };
  report.media = {
    ...(report.media || {}),
    missingLocalFiles: media.missing,
  };
  report.warnings = [...warnings];
  report.errors = errors;
  report.validation = {
    status,
    writingTotal: writing.total,
    writingMigrated: writing.migrated,
    writingPassed: writing.passed,
    writingFailed: writing.failed,
    dailyTotal: daily.legacyItems,
    dailyMigrated: daily.migratedItems,
    dailyTextOrder: daily.textOrderPassed ? 'PASS' : 'FAIL',
    dailyDateResolution: daily.dateResolutionPassed ? 'PASS' : 'REVIEW',
    missingMedia: media.missing.length,
  };
  writeReport(report);

  console.log(`Writing: ${writing.passed}/${writing.total} validation passed`);
  console.log(`Daily: ${daily.migratedItems}/${daily.legacyItems} items, ${daily.dateGroups} date groups`);
  console.log(`Missing media: ${media.missing.length}`);
  console.log(`Warnings: ${report.warnings.length}`);
  console.log(`MIGRATION VALIDATION: ${status}`);
  if (errors.length > 0) console.log(`Validation errors: ${errors.length}`);
  process.exitCode = status === 'PASS' ? 0 : 1;
}

main();
