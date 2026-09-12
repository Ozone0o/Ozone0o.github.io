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
    await evaluate(`(()=>{
      const panel = document.querySelector('[data-radio-panel]');
      if (panel && !panel.hidden) document.querySelector('.radio-player__close')?.click();
      return true;
    })()`);
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
        radioTab: rect(document.querySelector('.radio-player__tab')),
        shortcutPaper: rect(document.querySelector('.shortcut-help__paper')),
        hiddenTabs: [...document.querySelectorAll('.hidden-paper__tab')].map((element) => rect(element)),
      };
    })())`));
    const label = `${path} @ ${width}x${height}`;
    if (metrics.scrollWidth > width || metrics.bodyScrollWidth > width) failures.push(`${label}: horizontal overflow (${metrics.scrollWidth}/${metrics.bodyScrollWidth})`);
    if (!metrics.radioTab || metrics.radioTab.left < -1 || metrics.radioTab.right > width + 1 || metrics.radioTab.bottom > height + 1) {
      failures.push(`${label}: Radio tab exceeds viewport`);
    }
    if (metrics.hiddenTabs.some((tab) => tab.bottom > height + 1 || tab.top < -1)) {
      failures.push(`${label}: Hidden Paper tab exceeds viewport (${JSON.stringify(metrics.hiddenTabs)})`);
    }
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
  for (const [width, height] of [[1024, 768], [1280, 900], [1366, 768], [1440, 900], [1920, 900]]) {
    for (const path of desktopPaths) await inspectPage(path, width, height, false);
  }
  for (const [width, height] of [[375, 812], [390, 844]]) {
    for (const path of ['/', '/about/', '/projects/', '/projects/axiom/', '/archive/', '/daily/', '/daily/2024-01-16--2024-01-17/', '/writing/', '/writing/test/']) {
      await inspectPage(path, width, height, true);
    }
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

  await navigate('/', 1440, 900, false);
  await evaluate(`(()=>{ localStorage.clear(); location.reload(); return true; })()`);
  await sleep(650);
  const radioDefault = JSON.parse(await evaluate(`JSON.stringify((()=>{
    const root = document.querySelector('[data-radio-root]');
    const audio = document.querySelector('[data-radio-audio]');
    return {
      paused: audio?.paused === true,
      autoplay: audio?.autoplay === true || audio?.hasAttribute('autoplay'),
      panelHidden: document.querySelector('[data-radio-panel]')?.hasAttribute('hidden') === true,
      expanded: root?.dataset.radioExpanded ?? null,
      state: root?.dataset.radioState ?? null,
      hasSource: Boolean(audio?.getAttribute('src')),
    };
  })())`));
  if (!radioDefault.paused || radioDefault.autoplay || !radioDefault.panelHidden || radioDefault.expanded !== 'false' || radioDefault.hasSource) {
    failures.push(`Radio default state is invalid (${JSON.stringify(radioDefault)}).`);
  }

  const radioInteraction = JSON.parse(await evaluate(`JSON.stringify((()=>{
    const tab = document.querySelector('.radio-player__tab');
    tab?.click();
    const panel = document.querySelector('[data-radio-panel]');
    const panelOpen = panel?.hasAttribute('hidden') === false;
    const panelBox = panel?.getBoundingClientRect();
    const panelHit = panelBox ? document.elementFromPoint(panelBox.left + panelBox.width / 2, panelBox.top + panelBox.height / 2) : null;
    const panelReceivesPointer = Boolean(panel && panelHit && (panelHit === panel || panel.contains(panelHit)));
    const audio = document.querySelector('[data-radio-audio]');
    document.querySelector('[data-radio-control="toggle"]')?.click();
    const statusAfterPlay = document.querySelector('[data-radio-status]')?.textContent?.trim();
    const activated = localStorage.getItem('ozone-radio-activated');
    const volume = document.querySelector('[data-radio-volume]');
    if (volume) {
      volume.value = '0.7';
      volume.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const firstTitle = document.querySelector('[data-radio-title]')?.textContent;
    document.querySelector('[data-radio-control="next"]')?.click();
    const nextTitle = document.querySelector('[data-radio-title]')?.textContent;
    document.querySelector('[data-radio-control="previous"]')?.click();
    const previousTitle = document.querySelector('[data-radio-title]')?.textContent;
    return {
      panelOpen,
      panelReceivesPointer,
      statusAfterPlay,
      paused: audio?.paused === true,
      activated,
      storedVolume: localStorage.getItem('ozone-radio-volume'),
      firstTitle,
      nextTitle,
      previousTitle,
      storedTrack: localStorage.getItem('ozone-radio-track'),
      expanded: localStorage.getItem('ozone-radio-expanded'),
    };
  })())`));
  if (!radioInteraction.panelOpen || !radioInteraction.panelReceivesPointer || radioInteraction.statusAfterPlay !== '暂不可播放' || !radioInteraction.paused || radioInteraction.activated !== 'true' || radioInteraction.storedVolume !== '0.7' || radioInteraction.firstTitle === radioInteraction.nextTitle || radioInteraction.firstTitle !== radioInteraction.previousTitle || radioInteraction.storedTrack !== '0' || radioInteraction.expanded !== 'true') {
    failures.push(`Radio interaction validation failed (${JSON.stringify(radioInteraction)}).`);
  }

  const poolState = await evaluate(`(()=>{
    const pool = JSON.parse(document.querySelector('#ozone-random-pool')?.textContent ?? '[]');
    return {
      total: pool.length,
      writing: pool.filter((item) => item.type === 'writing').length,
      daily: pool.filter((item) => item.type === 'daily').length,
      fragment: pool.filter((item) => item.type === 'fragment').length,
      valid: pool.every((item) => item.href.startsWith('/writing/') || item.href.startsWith('/daily/')),
    };
  })()`);
  if (poolState.total !== 41 || poolState.writing !== 14 || poolState.daily !== 27 || poolState.fragment !== 0 || !poolState.valid) {
    failures.push(`Random pool validation failed (${JSON.stringify(poolState)}).`);
  }

  await navigate('/archive/', 1440, 900, false);
  await evaluate(`document.querySelector('[data-random-pick]')?.click()`);
  await sleep(650);
  const buttonRandomPath = await evaluate('window.location.pathname');
  if (!/^\/(writing|daily)\//u.test(buttonRandomPath)) failures.push(`Archive random button navigated to an invalid path: ${buttonRandomPath}`);

  await navigate('/', 1440, 900, false);
  await evaluate(`document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', bubbles: true }))`);
  await sleep(650);
  const shortcutRandomPath = await evaluate('window.location.pathname');
  if (!/^\/(writing|daily)\//u.test(shortcutRandomPath)) failures.push(`R shortcut navigated to an invalid path: ${shortcutRandomPath}`);

  const helpState = JSON.parse(await evaluate(`JSON.stringify((()=>{
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
    const help = document.querySelector('[data-shortcut-help]');
    const open = help?.hasAttribute('hidden') === false;
    const rows = help?.querySelectorAll('.shortcut-help__rows > div').length ?? 0;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return { open, rows, closed: help?.hasAttribute('hidden') === true };
  })())`));
  if (!helpState.open || helpState.rows !== 7 || !helpState.closed) failures.push(`Shortcut help validation failed (${JSON.stringify(helpState)}).`);

  await navigate('/', 1440, 900, false);
  const hiddenHomeState = JSON.parse(await evaluate(`JSON.stringify((()=>{
    const button = document.querySelector('.hidden-paper--home .hidden-paper__tab');
    button?.focus();
    const focused = document.activeElement === button;
    button?.click();
    const open = document.querySelector('.hidden-paper--home')?.dataset.hiddenPaperState === 'open';
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    const closed = document.querySelector('.hidden-paper--home')?.dataset.hiddenPaperState === 'closed';
    return { focused, open, closed, label: button?.getAttribute('aria-label') };
  })())`));
  if (!hiddenHomeState.focused || !hiddenHomeState.open || !hiddenHomeState.closed || hiddenHomeState.label !== '打开隐藏笔记') {
    failures.push(`Hidden Paper validation failed (${JSON.stringify(hiddenHomeState)}).`);
  }

  await navigate('/about/', 1440, 900, false);
  const inputShortcutState = JSON.parse(await evaluate(`JSON.stringify((()=>{
    const input = document.createElement('input');
    document.body.append(input);
    input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true }));
    const path = window.location.pathname;
    input.remove();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', ctrlKey: true, bubbles: true }));
    return { path, modifierKeptPath: window.location.pathname };
  })())`));
  if (inputShortcutState.path !== '/about/' || inputShortcutState.modifierKeptPath !== '/about/') {
    failures.push(`Editable/modifier keyboard guard failed (${JSON.stringify(inputShortcutState)}).`);
  }

  const shortcutRoutes = [['h', '/'], ['p', '/projects/'], ['d', '/daily/'], ['a', '/archive/']];
  for (const [key, expected] of shortcutRoutes) {
    await navigate('/about/', 1440, 900, false);
    await evaluate(`document.body.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(key)}, bubbles: true }))`);
    await sleep(650);
    const route = await evaluate('window.location.pathname');
    if (route !== expected) failures.push(`Keyboard ${key.toUpperCase()} navigated to ${route}, expected ${expected}.`);
  }

  await navigate('/not-a-real-route/', 1440, 900, false);
  const notFoundDesktop = JSON.parse(await evaluate(`JSON.stringify({
    paper: Boolean(document.querySelector('.not-found__paper')),
    heading: document.querySelector('.not-found h1')?.textContent?.trim(),
    link: document.querySelector('.not-found__link')?.getAttribute('href'),
  })`));
  if (!notFoundDesktop.paper || notFoundDesktop.heading !== '你掉出了这一层。' || notFoundDesktop.link !== '/') {
    failures.push(`Custom 404 desktop validation failed (${JSON.stringify(notFoundDesktop)}).`);
  }
  await navigate('/not-a-real-route/', 375, 812, true);
  const notFoundMobile = await evaluate(`(()=>{
    const root = document.documentElement;
    const paper = document.querySelector('.not-found__paper')?.getBoundingClientRect();
    return { paper: Boolean(paper), overflow: root.scrollWidth > innerWidth, right: paper?.right ?? 0 };
  })()`);
  if (!notFoundMobile.paper || notFoundMobile.overflow || notFoundMobile.right > 376) {
    failures.push(`Custom 404 mobile validation failed (${JSON.stringify(notFoundMobile)}).`);
  }
  console.log('Phase 2.3 interaction validation: PASS');
} catch (error) {
  failures.push(error.stack ?? error.message);
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
