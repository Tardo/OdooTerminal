// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import postMessage from '@common/utils/post_message';
import type Terminal from '@terminal/terminal.mjs';
import type {MessageListenerData} from '@terminal/terminal.mjs';


export default function captureScreenshot(terminal: Terminal, crop: ?(string | HTMLElement)): Promise<string> {
  return new Promise((resolve, reject) => {
    const termEl: HTMLElement = terminal.el;
    const prevVisibility: string = termEl.style.visibility;
    termEl.style.visibility = 'hidden';

    async function onScreenshotDone(data: MessageListenerData): Promise<mixed> {
      terminal.removeMessageListener('ODOO_TERM_SCREENSHOT_DONE', onScreenshotDone);
      termEl.style.visibility = prevVisibility;

      const err = data.error;
      if (typeof err === 'string' && err) {
        reject(new Error(err));
        return;
      }

      const rawDataUrl = data.dataUrl;
      const dataUrl = rawDataUrl !== null && rawDataUrl !== undefined ? String(rawDataUrl) : '';
      if (!dataUrl) {
        reject(new Error('No screenshot data received'));
        return;
      }

      const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');

      if (crop === null || crop === undefined) {
        resolve(base64);
        return;
      }

      const el: HTMLElement | null = crop instanceof HTMLElement
        ? crop
        : (() => {
            const found = document.querySelector(crop);
            return found instanceof HTMLElement ? found : null;
          })();

      if (el === null) {
        reject(new Error(`Element not found: ${String(crop)}`));
        return;
      }

      const rect = el.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        const ctx2d = canvas.getContext('2d');
        if (!ctx2d) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx2d.drawImage(
          img,
          Math.round(rect.left * dpr),
          Math.round(rect.top * dpr),
          Math.round(rect.width * dpr),
          Math.round(rect.height * dpr),
          0,
          0,
          Math.round(rect.width * dpr),
          Math.round(rect.height * dpr),
        );
        resolve(canvas.toDataURL('image/png').replace(/^data:image\/\w+;base64,/, ''));
      };
      img.onerror = () => reject(new Error('Failed to load screenshot for cropping'));
      img.src = dataUrl;
    }

    terminal.addMessageListener('ODOO_TERM_SCREENSHOT_DONE', onScreenshotDone);

    requestAnimationFrame(() => {
      postMessage('ODOO_TERM_SCREENSHOT_REQ', {});
    });
  });
}
