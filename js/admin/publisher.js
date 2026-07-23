// Publishing is isolated from the editor UI so storage/auth changes do not
// leak into inline-editing behaviour.

const REPO_API = 'https://api.github.com/repos/muramets/muramets.github.io/contents/data/content.json';
const TOKEN_KEY = 'cv.v1.gh-token';

export async function publishContent({ button, snapshot }) {
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = prompt(
      'GitHub token to publish (fine-grained, this repo only, ' +
      'permission "Contents: read & write"). Stored in this browser.');
    if (!token) return;
    localStorage.setItem(TOKEN_KEY, token.trim());
    token = token.trim();
  }

  button.textContent = 'Publishing…';
  button.disabled = true;

  try {
    const headers = {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
    };
    const current = await fetch(REPO_API, { headers }).then(response => response.ok ? response.json() : null);
    const body = JSON.stringify(snapshot(), null, 2) + '\n';
    const response = await fetch(REPO_API, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: 'Publish content from admin',
        content: btoa(unescape(encodeURIComponent(body))),
        ...(current?.sha ? { sha: current.sha } : {}),
      }),
    });

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem(TOKEN_KEY);
      throw new Error('token rejected (' + response.status + ')');
    }
    if (!response.ok) throw new Error('HTTP ' + response.status);
    button.textContent = 'Published ✓';
  } catch (error) {
    console.error('[publish]', error);
    button.textContent = 'Failed — retry';
  } finally {
    button.disabled = false;
    setTimeout(() => { button.textContent = 'Publish'; }, 4000);
  }
}
