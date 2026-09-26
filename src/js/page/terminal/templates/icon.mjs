// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import getOdooVersion from '@odoo/utils/get_odoo_version';
import encodeHTML from '@terminal/utils/encode_html';

// Odoo 20 replaces Font Awesome with Material Symbols.
const MATERIAL_ICONS = {
  'fa-bug': 'bug_report',
  'fa-camera': 'photo_camera',
  'fa-caret-right': 'arrow_right',
  'fa-code': 'code',
  'fa-cog': 'settings',
  'fa-copy': 'content_copy',
  'fa-crosshairs': 'my_location',
  'fa-desktop': 'desktop_windows',
  'fa-envelope-o': 'mail',
  'fa-file-archive-o': 'folder_zip',
  'fa-file-audio-o': 'audio_file',
  'fa-file-image-o': 'image',
  'fa-file-o': 'description',
  'fa-file-pdf-o': 'picture_as_pdf',
  'fa-file-text-o': 'article',
  'fa-file-video-o': 'video_file',
  'fa-magic': 'wand_stars',
  'fa-map-pin': 'push_pin',
  'fa-paperclip': 'attach_file',
  'fa-plus': 'add',
  'fa-question-circle': 'help',
  'fa-refresh': 'autorenew',
  'fa-sliders': 'tune',
  'fa-tachometer': 'speed',
  'fa-trash': 'delete',
  'fa-upload': 'upload',
  'fa-window-maximize': 'fullscreen',
};

export default function (name: $Keys<typeof MATERIAL_ICONS>, classes: string = ''): string {
  const version = getOdooVersion('major');
  const modern = typeof version === 'number' && version >= 20;
  const extraClasses = modern ? classes.replace(/\bfa-spin\b/g, 'oi-spin') : classes;
  const dataIcon = modern ? ` data-icon='${MATERIAL_ICONS[name]}'` : '';
  return `<i class='${modern ? 'oi' : 'fa'} ${name}${extraClasses ? ` ${encodeHTML(extraClasses)}` : ''}'${dataIcon} aria-hidden='true'></i>`;
}
