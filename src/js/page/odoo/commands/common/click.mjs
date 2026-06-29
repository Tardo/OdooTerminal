// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';

const CONTENT_SELECTORS = ['.o_action_manager', '.o_web_client', 'body'];

function getContentRoot(): Element | null {
  for (const sel of CONTENT_SELECTORS) {
    // $FlowFixMe[prop-missing]
    const el = document.querySelector(sel);
    if (el !== null && typeof el !== 'undefined') {
      return el;
    }
  }
  return document.body;
}

async function cmdClick(kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<number | void> {
  const text: string = typeof kwargs.text === 'string' ? kwargs.text : '';
  const selector: string = typeof kwargs.selector === 'string' ? kwargs.selector : 'button';
  const index: number = typeof kwargs.index === 'number' ? kwargs.index : 0;
  const listMode: boolean = kwargs.list === true;

  const root = getContentRoot();
  if (root === null) {
    ctx.screen.printError(i18n.t('cmdClick.error.noRoot', 'Cannot find Odoo content area'));
    return;
  }

  // $FlowFixMe[prop-missing]
  let elements: Array<Element> = Array.from(root.querySelectorAll(selector));

  // Exclude terminal elements
  elements = elements.filter(el => el.closest('.o_terminal') === null);

  if (text.length > 0) {
    const lowerText = text.toLowerCase();
    elements = elements.filter(el => (el.textContent ?? '').trim().toLowerCase().includes(lowerText));
  }

  if (elements.length === 0) {
    ctx.screen.printError(
      text.length > 0
        ? i18n.t('cmdClick.error.notFoundText', 'No button found matching "{{text}}"', {text})
        : i18n.t('cmdClick.error.notFound', 'No element found for selector "{{selector}}"', {selector}),
    );
    return;
  }

  if (listMode) {
    elements.forEach((el, i) => {
      const label = (el.textContent ?? '').trim();
      ctx.screen.print(`[${i}] ${label.length > 0 ? label : el.tagName.toLowerCase()}`);
    });
    return elements.length;
  }

  if (index >= elements.length) {
    ctx.screen.printError(
      i18n.t('cmdClick.error.indexOutOfRange', 'Index {{index}} out of range ({{count}} match(es) found)', {
        index,
        count: elements.length,
      }),
    );
    return;
  }

  const target = elements[index];
  if (!(target instanceof HTMLElement)) {
    ctx.screen.printError(i18n.t('cmdClick.error.notHtmlElement', 'Matched element is not clickable'));
    return;
  }

  target.click();
  const label = target.textContent?.trim() ?? '';
  ctx.screen.print(i18n.t('cmdClick.result.clicked', 'Clicked: {{label}}', {label: label.length > 0 ? label : selector}));
  return 1;
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdClick.definition', 'Click a button or element in the current view'),
    callback: cmdClick,
    detail: i18n.t(
      'cmdClick.detail',
      'Finds and clicks a button or element by visible text or CSS selector. -t matches any button whose text contains the given string (case-insensitive). -s overrides the element selector (default: button). -n picks the nth match (0-based). --list shows all matches without clicking.',
    ),
    args: [
      [ARG.String, ['t', 'text'], false, i18n.t('cmdClick.args.text', 'Button text to match (case-insensitive, partial)')],
      [ARG.String, ['s', 'selector'], false, i18n.t('cmdClick.args.selector', 'CSS selector (default: button)')],
      [ARG.Number, ['n', 'index'], false, i18n.t('cmdClick.args.index', 'Index of the match to click, 0-based (default: 0)'), 0],
      [ARG.Flag, ['l', 'list'], false, i18n.t('cmdClick.args.list', 'List all matches without clicking')],
    ],
    example: '-t "Save"',
  };
}
