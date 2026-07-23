// Admin toolbar is deliberately presentation-only. Editing state and content
// actions stay with the editor controller, which makes this component easy to
// reuse or replace without touching persistence logic.

export function createAdminToolbar({ onToggle, onPublish, onPrint, onReset, onLogout }) {
  const bar = document.createElement('div');
  bar.className = 'admin-toolbar';
  bar.innerHTML = `
    <span class="admin-dot"></span>
    <span>Admin</span>
    <button class="admin-toggle" title="Toggle edit mode on/off"></button>
    <button class="admin-publish" title="Commit drafts to GitHub — visible to everyone in ~1 min">Publish</button>
    <button class="admin-pdf" title="Print / save the active persona as PDF (Cmd+P)">Save PDF</button>
    <button class="admin-reset" title="Discard local drafts, back to published content">Reset</button>
    <button class="admin-exit" title="Leave admin entirely (return via ?admin=on)">Log out</button>
  `;

  const toggle = bar.querySelector('.admin-toggle');
  const publish = bar.querySelector('.admin-publish');
  toggle.addEventListener('click', onToggle);
  publish.addEventListener('click', () => onPublish(publish));
  bar.querySelector('.admin-pdf').addEventListener('click', onPrint);
  bar.querySelector('.admin-reset').addEventListener('click', onReset);
  bar.querySelector('.admin-exit').addEventListener('click', onLogout);
  document.body.append(bar);

  return {
    setEditing(on) {
      toggle.textContent = on ? 'Editing: On' : 'Editing: Off';
      toggle.classList.toggle('is-on', on);
      bar.classList.toggle('is-collapsed', !on);
    },
  };
}
