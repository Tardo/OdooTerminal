// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// Registry of open 2D windows, keyed by their unique canvas.id. Lets commands
// operate on a window via its id alone, without needing to keep the $var
// holding the canvas returned by 2d_create_window.
const windows: Map<string, HTMLCanvasElement> = new Map();

export function registerWindow(canvas: HTMLCanvasElement): void {
  windows.set(canvas.id, canvas);
}

export function unregisterWindow(canvas: HTMLCanvasElement): void {
  windows.delete(canvas.id);
}

export function listWindows(): $ReadOnlyArray<HTMLCanvasElement> {
  return [...windows.values()];
}

export function resolveWindow(canvas_or_id: HTMLCanvasElement | string): HTMLCanvasElement {
  if (typeof canvas_or_id === 'string') {
    const canvas = windows.get(canvas_or_id);
    if (typeof canvas === 'undefined') {
      throw new Error(`Unknown 2D window id '${canvas_or_id}'`);
    }
    return canvas;
  }
  return canvas_or_id;
}
