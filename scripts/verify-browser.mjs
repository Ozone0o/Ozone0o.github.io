import { spawn } from 'node:child_process';

const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const port = 9235;
const baseUrl = 'http://localhost:4321';
const profile = 'C:/BBlog/.edge-browser-review';
const browser = spawn(edgePath, [
  '--headless',
  '--disable-gpu',
  '--disable-gpu-compositing',
  '--disable-extensions',
  '--disable-breakpad',
  '--no-sandbox',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  'about:blank',
], { stdio: 'ignore' });

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const failures = [];
let socket;
let sequence = 0;
const pending = new Map();

try {
  let page;
  for (let attempt = 0; attempt < 40 && !page; attempt += 1) {
    await sleep(100);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      page = (await response.json()).find((target) => target.type === 'page');
    } catch {
      // The browser needs a moment to expose its debugging endpoint.
    }
  }
  if (!page) throw new Error('Edge CDP page unavailable.');

  socket = new WebSocket(page.webSocketDebuggerUrl);
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  });
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  const command = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, resolve);
    socket.send(JSON.stringify({ id, method, params }));
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`${method} timed out`));
      }
    }, 10000);
  });

  await command('Page.enable');
  await command('Runtime.enable');

  const navigate = async (path, width, height, mobile = false) => {
    await command('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile,
    });
    await command('Page.navigate', { url: `${baseUrl}${path}` });
    await sleep(650);
  };

  const evaluate = async (expression) => {
    const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text ?? 'Browser evaluation failed.');
    return result.result?.result?.value;
  };

  const inspectPage = async (path, width, height, mobile) => {
    await navigate(path, width, height, mobile);
    const metrics = JSON.parse(await evaluate(`JSON.stringify((()=>{
      const root = document.documentElement;
      const rect = (element) => {
        if (!element) return null;
        const box = element.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
      };
      return {
        width: innerWidth,
        scrollWidth: root.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
        edgeCount: document.querySelectorAll('[data-edge-layer]').length,
        edgeHrefs: [...document.querySelectorAll('[data-edge-layer] a')].map((element) => element.getAttribute('href')),
        active: rect(document.querySelector('.layer-field--active')),
        archive: [...document.querySelectorAll('.archive-fragment')].map((element) => rect(element)),
        years: rect(document.querySelector('.archive-years')),
        notes: [...document.querySelectorAll('.project-note')].map((element) => rect(element)),
        timeline: [...document.querySelectorAll('.timeline-item')].map((element) => rect(element)),
        projectHeader: rect(document.querySelector('.project-detail__header')),
        projectFacts: rect(document.querySelector('.project-detail__facts')),
        projectLinks: rect(document.querySelector('.project-detail__links')),
      };
    })())`));
    const label = `${path} @ ${width}x${height}`;
    if (metrics.scrollWidth > width || metrics.bodyScrollWidth > width) failures.push(`${label}: horizontal overflow (${metrics.scrollWidth}/${metrics.bodyScrollWidth})`);
    if (['/about/', '/projects/', '/daily/', '/archive/'].includes(path) && metrics.edgeCount !== 3) {
      failures.push(`${label}: expected 3 top-level edge layers, found ${metrics.edgeCount}`);
    }
    const expectedEdges = {
      '/about/': ['/projects/', '/daily/', '/archive/'],
      '/projects/': ['/about/', '/daily/', '/archive/'],
      '/daily/': ['/about/', '/projects/', '/archive/'],
      '/archive/': ['/about/', '/projects/', '/daily/'],
    }[path];
    if (expectedEdges && expectedEdges.some((href) => !metrics.edgeHrefs.includes(href))) {
      failures.push(`${label}: top-level edge navigation is incomplete (${metrics.edgeHrefs.join(', ')})`);
    }
    if (path === '/archive/') {
      const fragments = metrics.archive;
      if (fragments.some((fragment) => fragment.left < -1 || fragment.right > width + 1)) failures.push(`${label}: Archive card exceeds viewport`);
      const testCard = fragments.at(-1);
      if (!metrics.years || !testCard || testCard.bottom > metrics.years.top) failures.push(`${label}: test card overlaps year markers`);
      await evaluate(`(()=>{
        const card = [...document.querySelectorAll('.archive-fragment')].find((element) => element.getAttribute('href') === '/writing/test/');
        if (!card) return false;
        const box = card.getBoundingClientRect();
        document.documentElement.style.scrollBehavior = 'auto';
        window.scrollTo(0, Math.max(0, box.top + scrollY - innerHeight / 2));
        return true;
      })()`);
      await sleep(30);
      const clickability = JSON.parse(await evaluate(`JSON.stringify((()=>{
        const card = [...document.querySelectorAll('.archive-fragment')].find((element) => element.getAttribute('href') === '/writing/test/');
        if (!card) return { ok: false, reason: 'test card missing' };
        const point = card.getBoundingClientRect();
        const hit = document.elementFromPoint(point.left + point.width / 2, point.top + point.height / 2);
        return { ok: hit === card || card.contains(hit), hit: hit?.className ?? null, top: point.top, bottom: point.bottom };
      })())`));
      if (!clickability.ok) failures.push(`${label}: test card center is not clickable (${clickability.hit ?? clickability.reason}, ${clickability.top}-${clickability.bottom})`);
    }
    if (path === '/projects/axiom/') {
      const rectangles = [...metrics.notes, ...metrics.timeline, metrics.projectHeader, metrics.projectFacts, metrics.projectLinks].filter(Boolean);
      const intersects = (first, second) => first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top;
      for (let noteIndex = 0; noteIndex < metrics.notes.length; noteIndex += 1) {
        if (metrics.timeline.some((item) => intersects(metrics.notes[noteIndex], item))) failures.push(`${label}: result sheet overlaps timeline item ${noteIndex + 1}`);
      }
      if (rectangles.length === 0) failures.push(`${label}: project detail geometry missing`);
    }
    console.log(`Browser geometry: ${label} PASS`);
  };

  const desktopPaths = ['/', '/about/', '/projects/', '/projects/axiom/', '/archive/', '/daily/', '/daily/2024-01-16--2024-01-17/', '/writing/', '/writing/test/'];
  for (const width of [1280, 1366, 1440, 1920]) {
    for (const path of desktopPaths) await inspectPage(path, width, 900, false);
  }
  for (const path of ['/', '/about/', '/projects/', '/projects/axiom/', '/archive/', '/daily/', '/daily/2024-01-16--2024-01-17/', '/writing/', '/writing/test/']) {
    await inspectPage(path, 390, 844, true);
  }

  await navigate('/', 1440, 900, false);
  const languageState = await evaluate(`(async()=>{
    const button = document.querySelector('[data-language-option="en"]');
    button?.click();
    await new Promise((resolve) => setTimeout(resolve, 25));
    return { language: document.documentElement.dataset.lang, stored: localStorage.getItem('ozone-language'), intro: document.querySelector('.home-intro p')?.textContent, breadcrumb: document.querySelector('.layer-breadcrumb__desktop')?.textContent };
  })()`);
  if (languageState.language !== 'en' || languageState.stored !== 'en' || !languageState.intro?.includes('public layer') || languageState.breadcrumb !== 'HOME') {
    failures.push('Language toggle did not immediately switch Home UI or persist ozone-language.');
  }
  await navigate('/about/', 1440, 900, false);
  const crossPageLanguage = JSON.parse(await evaluate(`JSON.stringify({ language: document.documentElement.dataset.lang, heading: document.querySelector('h1')?.textContent, github: document.querySelector('a[href="https://github.com/Ozone0o"]')?.getAttribute('target') })`));
  if (crossPageLanguage.language !== 'en' || crossPageLanguage.heading !== 'About ozone layer' || crossPageLanguage.github !== '_blank') {
    failures.push('English language state did not persist across navigation.');
  }
  const languagePages = [
    ['/', '.layer-breadcrumb__desktop', 'HOME'],
    ['/projects/', 'h1', 'PROJECTS'],
    ['/projects/axiom/', '.project-note figcaption', 'CURRENT STATE'],
    ['/daily/', 'h1', 'DAILY'],
    ['/daily/2024-01-16--2024-01-17/', '.daily-detail__kicker', 'DAILY NOTE'],
    ['/archive/', 'h1', 'ARCHIVE'],
    ['/about/', 'h1', 'About ozone layer'],
    ['/writing/', 'h1', 'WRITING'],
    ['/writing/test/', '.article-header__meta span', 'WRITING'],
  ];
  for (const [path, selector, expected] of languagePages) {
    await navigate(path, 1440, 900, false);
    const pageLanguage = JSON.parse(await evaluate(`JSON.stringify({ language: document.documentElement.dataset.lang, text: document.querySelector(${JSON.stringify(selector)})?.textContent?.trim() })`));
    if (pageLanguage.language !== 'en' || pageLanguage.text !== expected) {
      failures.push(`English UI check failed on ${path}: ${pageLanguage.language}/${pageLanguage.text}`);
    }
  }
  await navigate('/daily/2024-01-16--2024-01-17/', 1440, 900, false);
  const dailyTextBefore = await evaluate(`document.querySelector('.daily-detail__body')?.textContent?.trim()`);
  await evaluate(`document.querySelector('[data-language-option="zh"]')?.click()`);
  await sleep(25);
  const dailyTextAfter = await evaluate(`document.querySelector('.daily-detail__body')?.textContent?.trim()`);
  if (dailyTextBefore !== dailyTextAfter) failures.push('Historical Daily body changed during language toggle.');
  await evaluate(`document.querySelector('[data-language-option="zh"]')?.click()`);
  await sleep(25);
  const backToChinese = await evaluate('document.documentElement.dataset.lang');
  if (backToChinese !== 'zh') failures.push('Language toggle did not return to Chinese.');
  console.log('Browser i18n persistence: PASS');
} catch (error) {
  failures.push(error.message);
} finally {
  socket?.close();
  browser.kill();
}

if (failures.length > 0) {
  console.error('BROWSER VALIDATION: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('BROWSER VALIDATION: PASS');
}
