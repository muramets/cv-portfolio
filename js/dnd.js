// Generic drag-and-drop sorting. Works for any container whose children
// match itemSelector — entity tiles, timeline items, whole page blocks.
// Dragging starts only from a .drag-handle, so contenteditable text
// selection inside items keeps working.

export function makeSortable({ container, itemSelector, onReorder }) {
  let dragged = null;

  container.addEventListener('mousedown', e => {
    const handle = e.target.closest('.drag-handle');
    if (!handle) return;
    const item = handle.closest(itemSelector);
    if (item) item.draggable = true;
  });

  container.addEventListener('dragstart', e => {
    const item = e.target.closest?.(itemSelector);
    if (!item || !item.draggable) return;
    dragged = item;
    dragged.classList.add('is-dragging');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', ''); } catch { /* IE quirk */ }
  });

  container.addEventListener('dragover', e => {
    if (!dragged) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const over = e.target.closest?.(itemSelector);
    if (!over || over === dragged || over.parentNode !== dragged.parentNode) return;

    // Same visual row (grids) → decide by X, otherwise by Y.
    const rect = over.getBoundingClientRect();
    const dragRect = dragged.getBoundingClientRect();
    const sameRow = Math.abs(rect.top - dragRect.top) < rect.height / 2;
    const before = sameRow
      ? e.clientX < rect.left + rect.width / 2
      : e.clientY < rect.top + rect.height / 2;

    over.parentNode.insertBefore(dragged, before ? over : over.nextSibling);
  });

  container.addEventListener('dragend', () => {
    if (!dragged) return;
    dragged.classList.remove('is-dragging');
    dragged.draggable = false;
    dragged = null;
    onReorder();
  });
}

/** Create the hover grip button used by all sortable items. */
export function createHandle(title) {
  const handle = document.createElement('button');
  handle.className = 'drag-handle';
  handle.setAttribute('aria-label', title);
  handle.title = title;
  handle.textContent = '⠿';
  return handle;
}
