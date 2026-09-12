document.querySelectorAll<HTMLElement>('[data-hidden-paper]').forEach((paper) => {
  const toggle = paper.querySelector<HTMLButtonElement>('[data-hidden-paper-toggle]');
  const note = paper.querySelector<HTMLElement>('[data-hidden-paper-note]');
  if (!toggle || !note) return;

  const setOpen = (open: boolean) => {
    paper.dataset.hiddenPaperState = open ? 'open' : 'closed';
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    note.setAttribute('aria-hidden', open ? 'false' : 'true');
  };

  toggle.addEventListener('click', () => setOpen(paper.dataset.hiddenPaperState !== 'open'));
  window.addEventListener('ozone:close-transients', () => setOpen(false));
});
