type RandomItem = {
  type: 'writing' | 'daily' | 'fragment';
  title: string;
  href: string;
  key?: string;
};

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
};

const hasModifier = (event: KeyboardEvent) => event.ctrlKey || event.metaKey || event.altKey;

const readRandomPool = (): RandomItem[] => {
  const element = document.querySelector<HTMLScriptElement>('#ozone-random-pool');
  if (!element?.textContent) return [];
  try {
    const value = JSON.parse(element.textContent) as unknown;
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is RandomItem => (
      Boolean(item)
      && typeof item === 'object'
      && ['writing', 'daily', 'fragment'].includes((item as RandomItem).type)
      && typeof (item as RandomItem).title === 'string'
      && typeof (item as RandomItem).href === 'string'
    ));
  } catch {
    return [];
  }
};

const randomIndex = (length: number) => {
  if (length <= 1) return 0;
  const values = new Uint32Array(1);
  if (window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(values);
    return values[0] % length;
  }
  return Math.floor(Math.random() * length);
};

const normalizedPath = (href: string) => {
  try {
    const pathname = new URL(href, window.location.href).pathname;
    return pathname.endsWith('/') ? pathname : `${pathname}/`;
  } catch {
    return href;
  }
};

const pickRandomArchive = () => {
  const pool = readRandomPool();
  if (pool.length === 0) return;
  const currentPath = normalizedPath(window.location.pathname);
  const candidates = pool.length > 1
    ? pool.filter((item) => normalizedPath(item.href) !== currentPath)
    : pool;
  const item = candidates[randomIndex(candidates.length)];
  if (item?.href) window.location.assign(item.href);
};

document.querySelectorAll<HTMLButtonElement>('[data-random-pick]').forEach((button) => {
  button.addEventListener('click', pickRandomArchive);
});

const help = document.querySelector<HTMLElement>('[data-shortcut-help]');
const helpPaper = help?.querySelector<HTMLElement>('[data-shortcut-paper]');
const helpClose = help?.querySelector<HTMLButtonElement>('[data-shortcut-close]');
let restoreFocus: HTMLElement | null = null;

const closeHelp = () => {
  if (!help) return;
  help.classList.remove('is-open');
  help.hidden = true;
  help.setAttribute('aria-hidden', 'true');
  window.dispatchEvent(new CustomEvent('ozone:close-transients'));
  restoreFocus?.focus({ preventScroll: true });
  restoreFocus = null;
};

const openHelp = () => {
  if (!help) return;
  restoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  help.hidden = false;
  help.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => help.classList.add('is-open'));
  helpClose?.focus({ preventScroll: true });
};

help?.addEventListener('click', (event) => {
  if (event.target === help) closeHelp();
});
helpPaper?.addEventListener('click', (event) => event.stopPropagation());
helpClose?.addEventListener('click', closeHelp);

document.addEventListener('keydown', (event) => {
  if (hasModifier(event) || isEditableTarget(event.target)) return;

  if (event.key === 'Escape') {
    if (help && !help.hidden) {
      event.preventDefault();
      closeHelp();
    } else {
      window.dispatchEvent(new CustomEvent('ozone:close-transients'));
    }
    return;
  }

  if (event.key === '?') {
    event.preventDefault();
    if (help && !help.hidden) closeHelp();
    else openHelp();
    return;
  }

  const key = event.key.toLowerCase();
  if (key === 'm') {
    event.preventDefault();
    window.dispatchEvent(new CustomEvent('ozone:radio-toggle'));
    return;
  }
  if (key === 'r') {
    event.preventDefault();
    pickRandomArchive();
    return;
  }

  const routes: Record<string, string> = {
    h: '/',
    p: '/projects/',
    d: '/daily/',
    a: '/archive/',
  };
  const route = routes[key];
  if (route && window.location.pathname !== route) {
    event.preventDefault();
    window.location.assign(route);
  }
});
