// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).


export default function elementPicker(): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    let hoveredEl: HTMLElement | null = null;

    const highlight = document.createElement('div');
    highlight.className = 'terminal-element-picker-highlight';
    document.body?.append(highlight);

    const label = document.createElement('div');
    label.className = 'terminal-element-picker-label';
    document.body?.append(label);

    const cursorStyle = document.createElement('style');
    cursorStyle.textContent = 'html, html * { cursor: crosshair !important; }';
    document.head?.append(cursorStyle);

    function cleanup() {
      document.removeEventListener('mousemove', onMouseMove, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown, true);
      highlight.remove();
      label.remove();
      cursorStyle.remove();
    }

    function onMouseMove(e: MouseEvent) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!(el instanceof HTMLElement) || el === highlight || el === label) {
        return;
      }
      hoveredEl = el;
      const rect = el.getBoundingClientRect();
      highlight.style.top = `${rect.top}px`;
      highlight.style.left = `${rect.left}px`;
      highlight.style.width = `${rect.width}px`;
      highlight.style.height = `${rect.height}px`;
      const tag = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : '';
      const cls = el.className && typeof el.className === 'string'
        ? '.' + el.className.trim().split(/\s+/).join('.')
        : '';
      label.textContent = `${tag}${id}${cls}`;
      label.style.top = `${Math.max(0, rect.top - 22)}px`;
      label.style.left = `${rect.left}px`;
    }

    function onClick(e: MouseEvent) {
      e.preventDefault();
      e.stopImmediatePropagation();
      cleanup();
      if (hoveredEl !== null) {
        resolve(hoveredEl);
      } else {
        reject(new Error('No element selected'));
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        cleanup();
        reject(new Error('Cancelled'));
      }
    }

    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);
  });
}
