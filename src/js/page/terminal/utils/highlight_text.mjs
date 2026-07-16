// @flow strict
// Copyright  Taois <taoist.han@vertechs.com>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

const ESCAPE_RE = /[.*+?^${}()|[\]\\]/g;

// Walks text nodes under `root` and wraps any occurrence of `words` in a
// <mark class="terminal-highlight">. Operates on TEXT nodes only, so it never
// breaks existing HTML tags/attributes in the rendered output.
export default function highlightTextNodes(root: HTMLElement, words: $ReadOnlyArray<string>) {
  if (!words || !words.length) return;
  const lowerWords: Array<string> = [];
  const escapedWords: Array<string> = [];
  for (const w of words) {
    if (!w) continue;
    lowerWords.push(w.toLowerCase());
    escapedWords.push(w.replace(ESCAPE_RE, '\\$&'));
  }
  if (!escapedWords.length) return;
  const re = new RegExp(escapedWords.join('|'), 'gi');
  // $FlowFixMe[unsupported-syntax]
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const text = node.nodeValue;
      if (!text) return NodeFilter.FILTER_REJECT;
      const lower = text.toLowerCase();
      return lowerWords.some((w) => lower.includes(w)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const targets: Array<Node> = [];
  let n = walker.nextNode();
  while (n) {
    targets.push(n);
    n = walker.nextNode();
  }
  for (const node of targets) {
    const text = node.nodeValue || '';
    re.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let last = 0;
    let m;
    while ((m = re.exec(text))) {
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      const mark = document.createElement('mark');
      mark.className = 'terminal-highlight';
      mark.textContent = m[0];
      frag.appendChild(mark);
      last = m.index + m[0].length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    if (node.parentNode) node.parentNode.replaceChild(frag, node);
  }
}
