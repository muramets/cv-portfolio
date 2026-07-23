// Content is intentionally allowed to carry light editorial markup (line
// breaks, emphasis and links). Keep the allowed surface explicit: admin draft
// HTML must never become executable markup when rendered for visitors.

const ALLOWED_TAGS = new Set(['A', 'B', 'BR', 'DIV', 'EM', 'I', 'SPAN', 'STRONG']);
const ALLOWED_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

function sanitizeLink(link) {
  const href = link.getAttribute('href')?.trim() ?? '';
  const opensNewTab = link.getAttribute('target') === '_blank';
  let protocol = '';
  try { protocol = new URL(href, document.baseURI).protocol; } catch { /* remove below */ }
  [...link.attributes].forEach(attribute => link.removeAttribute(attribute.name));
  if (href && ALLOWED_LINK_PROTOCOLS.has(protocol)) {
    link.setAttribute('href', href);
  }
  if (opensNewTab && href && ALLOWED_LINK_PROTOCOLS.has(protocol)) {
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
  }
}

function sanitizeElement(element) {
  [...element.children].forEach(sanitizeElement);

  if (!ALLOWED_TAGS.has(element.tagName)) {
    element.replaceWith(...element.childNodes);
    return;
  }

  if (element.tagName === 'A') sanitizeLink(element);
  else [...element.attributes].forEach(attribute => element.removeAttribute(attribute.name));
}

export function sanitizeHtml(value) {
  const template = document.createElement('template');
  template.innerHTML = String(value ?? '');
  [...template.content.children].forEach(sanitizeElement);
  return template.innerHTML;
}
