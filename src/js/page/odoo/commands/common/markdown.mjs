// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import MarkdownIt from 'markdown-it';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';

// html:false escapes literal HTML in the input instead of passing it through, since the
// rendered output is inserted into the screen as raw HTML (see Screen#print).
const mdConverter = new MarkdownIt({breaks: true, html: false});

async function cmdMarkdown(kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<string> {
  const html = mdConverter.render(kwargs.text);
  ctx.screen.print(html, false);
  return html;
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdMarkdown.definition', 'Renders markdown as HTML'),
    callback: cmdMarkdown,
    detail: i18n.t(
      'cmdMarkdown.detail',
      'Converts the given markdown text to HTML using markdown-it and prints the result',
    ),
    args: [[ARG.String, ['t', 'text'], true, i18n.t('cmdMarkdown.args.text', 'The markdown text to convert')]],
    example: '-t "# Hello\\n**World**"',
  };
}
