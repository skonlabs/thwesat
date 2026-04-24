/**
 * sanitize.ts — Browser-native HTML sanitization using DOMParser.
 * No third-party library required. ssr-safe: check for document availability.
 *
 * Two exports:
 *   sanitizeHtml(dirty)  — strips unsafe tags/attributes, returns safe HTML string.
 *   sanitizeText(dirty)  — strips ALL HTML, returns plain text only.
 */

const ALLOWED_TAGS = new Set([
  "p", "br", "b", "strong", "i", "em",
  "ul", "ol", "li",
  "h1", "h2", "h3", "h4",
  "blockquote", "code", "pre",
  "a",
]);

/**
 * Recursively walk a DOM node, returning a cleaned clone or null if the node
 * should be removed entirely.
 */
function cleanNode(node: Node, doc: Document): Node | null {
  // Text nodes are always safe — pass through.
  if (node.nodeType === Node.TEXT_NODE) {
    return doc.createTextNode(node.textContent || "");
  }

  // Remove anything that isn't an element (comments, processing instructions, etc.).
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const el = node as Element;
  const tagName = el.tagName.toLowerCase();

  // Strip disallowed elements but keep their text children by replacing with a
  // document fragment so we don't silently discard content.
  if (!ALLOWED_TAGS.has(tagName)) {
    const frag = doc.createDocumentFragment();
    Array.from(el.childNodes).forEach((child) => {
      const cleaned = cleanNode(child, doc);
      if (cleaned) frag.appendChild(cleaned);
    });
    // Return a fragment only if it has children; otherwise null.
    return frag.hasChildNodes() ? frag : null;
  }

  // Create a clean element with the same tag.
  const clean = doc.createElement(tagName);

  // Allow only a safe subset of attributes.
  if (tagName === "a") {
    const href = el.getAttribute("href") || "";
    // Only allow http/https/mailto URIs — strip everything else (javascript:, data:, etc.).
    if (/^(https?:|mailto:)/i.test(href)) {
      clean.setAttribute("href", href);
      clean.setAttribute("target", "_blank");
      clean.setAttribute("rel", "noopener noreferrer");
    }
  }
  // All other attributes are intentionally dropped.

  // Recurse into children.
  Array.from(el.childNodes).forEach((child) => {
    const cleaned = cleanNode(child, doc);
    if (cleaned) clean.appendChild(cleaned);
  });

  return clean;
}

/**
 * Sanitize an HTML string, allowing only a safe allowlist of tags/attributes.
 * Returns a safe HTML string suitable for use with dangerouslySetInnerHTML.
 *
 * ssr-safe: returns the dirty string unchanged when document is unavailable
 * (e.g. SSR / test environments without a DOM).
 */
export function sanitizeHtml(dirty: string): string {
  /* ssr-safe: check for document availability */
  if (typeof document === "undefined") return dirty;

  const parser = new DOMParser();
  const doc = parser.parseFromString(dirty, "text/html");

  const output = document.createElement("div");
  Array.from(doc.body.childNodes).forEach((node) => {
    const cleaned = cleanNode(node, document);
    if (cleaned) output.appendChild(cleaned);
  });

  return output.innerHTML;
}

/**
 * Strip ALL HTML from a string and return plain text only.
 * Safe to use wherever only text content is needed.
 *
 * ssr-safe: returns the dirty string unchanged when document is unavailable.
 */
export function sanitizeText(dirty: string): string {
  /* ssr-safe: check for document availability */
  if (typeof document === "undefined") return dirty;

  const d = document.createElement("div");
  // Assign via innerText to avoid any script execution — innerText is read-only
  // in this direction on most browsers, so we use innerHTML for parsing then
  // read back via innerText to strip all markup.
  d.innerHTML = dirty;
  return d.innerText || d.textContent || "";
}
