const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

document.querySelectorAll<HTMLElement>('[data-layer-root]').forEach((root) => {
  root.querySelectorAll<HTMLElement>('[data-draggable-layer="true"]').forEach((layer) => {
    let pointerId: number | null = null;
    let startX = 0;
    let startY = 0;
    let dragged = false;

    const clearDrag = () => {
      layer.classList.remove('is-dragging');
      layer.style.removeProperty('--drag-x');
      layer.style.removeProperty('--drag-y');
      if (pointerId !== null && layer.hasPointerCapture(pointerId)) {
        layer.releasePointerCapture(pointerId);
      }
      pointerId = null;
    };

    layer.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;

      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      dragged = false;
      layer.setPointerCapture(event.pointerId);
      layer.classList.add('is-dragging');
    });

    layer.addEventListener('pointermove', (event) => {
      if (pointerId !== event.pointerId) return;

      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;
      if (Math.hypot(deltaX, deltaY) >= 8) dragged = true;

      const limit = reducedMotion.matches ? 0 : 60;
      layer.style.setProperty('--drag-x', `${clamp(deltaX, -limit, limit)}px`);
      layer.style.setProperty('--drag-y', `${clamp(deltaY, -limit, limit)}px`);
      if (dragged) event.preventDefault();
    });

    const finish = (event: PointerEvent) => {
      if (pointerId !== event.pointerId) return;

      if (dragged) layer.dataset.suppressClick = 'true';
      clearDrag();
    };

    layer.addEventListener('pointerup', finish);
    layer.addEventListener('pointercancel', finish);
    layer.addEventListener('lostpointercapture', () => {
      if (pointerId !== null) clearDrag();
    });

    layer.addEventListener('click', (event) => {
      if (layer.dataset.suppressClick !== 'true') return;
      event.preventDefault();
      event.stopPropagation();
      delete layer.dataset.suppressClick;
    });
  });
});
