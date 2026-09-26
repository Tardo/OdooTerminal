// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import type {SkillDef} from '@ai/skills/__all__';


const content: string =
  '# SKILL: 2D Graphics / Drawing\n' +
  '\n' +
  'Draw charts and diagrams on a floating canvas window. Origin is top-left, +Y goes DOWN. Colors are CSS strings.\n' +
  '\n' +
  '## Workflow\n' +
  'Load trash-syntax before using the loops, callbacks, or math helpers below.\n' +
  '```\n' +
  "$win = (2d_create_window -w 500 -h 300 --centered)\n" +
  '// ...draw calls... They are batched and painted automatically on the next browser frame.\n' +
  '```\n' +
  'The window value is a browser canvas. Keep the width and height you passed to 2d_create_window in variables; TraSH cannot read inherited DOM properties from the canvas.\n' +
  '\n' +
  '## Window lifecycle\n' +
  'Work in ONE window: to redo a drawing, `2d_clear -c $win` and draw again — never open a new window per attempt. ' +
  'If you do replace a window, FIRST destroy the discarded one (`2d_destroy_window -c $old`); stale windows must not pile up on screen. ' +
  'Keep the final window open — the user must see the result.\n' +
  '\n' +
  '## Checking your drawing\n' +
  'Draw calls never fail visibly — wrong coordinates just produce a wrong picture, and the canvas is invisible to inspect/read. ' +
  'When the result matters (many computed coordinates, layout you are unsure about), verify with the `take_screenshot` tool using selector `.terminal-graphics-window` and fix what looks wrong. ' +
  'One check at the end of the drawing; not after every call.\n' +
  '\n' +
  '## Functions\n' +
  "- `2d_list_windows` — list open windows as `[{id, width, height}, ...]`. Every function accepting `-c` takes the canvas value OR its `id` string, so a window can be operated on later without keeping its $var.\n" +
  '- `2d_rect -c $win -x N -y N -w N -h N -rc COLOR` — filled rectangle (bars).\n' +
  '- `2d_line -c $win -fx N -fy N -tx N -ty N -lc COLOR -w N` — line segment (axes, grid).\n' +
  '- `2d_poly -c $win -p [[x, y], [x, y], ...] -pc COLOR -w N` — polyline (line charts). Add `--fill` to close and fill the shape.\n' +
  '- `2d_circle -c $win -x N -y N -r N -cc COLOR` — filled circle (scatter points). `-sa DEG -ea DEG` draws a pie slice (angles clockwise from 3 o\'clock); `--stroke -w N` outlines instead of filling.\n' +
  '- `2d_text -c $win -t "label" -x N -y N -tc COLOR -f "12px sans-serif"` — text; x/y is the BOTTOM-left of the text.\n' +
  '- `2d_clear -c $win` — clear everything (or a region with -x -y -w -h).\n' +
  '- `2d_handle_loop -c $win -f $fn -mf N` — pass the function value, run it once per browser frame (animations, see below).\n' +
  '- `2d_next_frame` — waits for the next browser frame, returns its timestamp in ms. Low-level; prefer 2d_handle_loop for animations.\n' +
  '\n' +
  '## Example: bar chart with labels\n' +
  '```\n' +
  "$data = [['Jan', 120], ['Feb', 80], ['Mar', 200]]\n" +
  '$W = 500\n' +
  '$H = 300\n' +
  "$win = (2d_create_window -w $W -h $H --centered)\n" +
  '$max = 200\n' +
  "$bar_w = (floor $W / $data['length'])\n" +
  "for ($i = 0; $i < $data['length']; $i += 1) {\n" +
  '  $bh = (floor (($data[$i][1] * ($H - 40)) / $max))\n' +
  '  $x = $i * $bar_w\n' +
  "  2d_rect -c $win -x ($x + 4) -y ($H - 20 - $bh) -w ($bar_w - 8) -h $bh -rc '#4a90d9'\n" +
  "  2d_text -c $win -t $data[$i][0] -x ($x + 8) -y ($H - 5) -tc '#fff'\n" +
  '}\n' +
  '```\n' +
  'Pie chart: accumulate angles with 2d_circle slices (`$deg = ($value * 360) / $total`). Line chart: build the points list in a loop, then one 2d_poly call.\n' +
  '\n' +
  '## Animation\n' +
  '```\n' +
  '$tick = function (time, delta, count) {\n' +
  '  2d_clear -c $win\n' +
  '  // ...draw this frame. Initialize shared state before defining this lexical closure.\n' +
  '}\n' +
  '2d_handle_loop -c $win -f $tick -mf 300\n' +
  '```\n' +
  'The function runs once per browser frame with (time ms, delta ms, frame count); the loop stops at --max-frames, ' +
  'when the window is destroyed, or when the function returns false. It returns the frames run.\n' +
  'Use $tick, not $$tick, to pass callbacks reliably even when they declare no parameters. Captured outer variables persist between frames; caller-local variables are not visible.\n' +
  'ALWAYS pass -mf (60 frames ≈ 1 s): an unbounded loop would never return control to you.\n';

const skill: SkillDef = {
  name: 'graphics',
  description:
    '2D drawing on a floating canvas window: custom charts, diagrams and animations (2d_rect, 2d_line, 2d_poly, 2d_circle, 2d_text, 2d_next_frame). Load before canvas drawing; native Odoo graph/pivot views do not need this skill.',
  content: (): string => content,
};

export default skill;
