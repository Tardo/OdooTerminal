// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

type DrawOp = (ctx: CanvasRenderingContext2D) => void;

const queues: WeakMap<HTMLCanvasElement, Array<DrawOp>> = new WeakMap();

// The TraSH VM is async, so consecutive draw calls can span several browser
// tasks and get painted half-done. Ops are queued per canvas and flushed
// together in a single requestAnimationFrame callback, so every frame is
// painted atomically in sync with the browser drawing cycle.
export default function scheduleDraw(canvas: HTMLCanvasElement, op: DrawOp): void {
  let queue = queues.get(canvas);
  if (typeof queue === 'undefined') {
    queue = [];
    queues.set(canvas, queue);
    window.requestAnimationFrame(() => {
      const ops = queues.get(canvas);
      queues.delete(canvas);
      if (typeof ops === 'undefined' || !canvas.isConnected) {
        return;
      }
      const ctx = canvas.getContext('2d');
      for (const draw_op of ops) {
        draw_op(ctx);
      }
    });
  }
  queue.push(op);
}
