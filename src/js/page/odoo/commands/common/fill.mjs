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

async function cmdFill(kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<string | void> {
  const selector: string = typeof kwargs.selector === 'string' ? kwargs.selector : '';
  const value: string = typeof kwargs.value === 'string' ? kwargs.value : '';
  const index: number = typeof kwargs.index === 'number' ? kwargs.index : 0;
  const submitEnter: boolean = kwargs.enter === true;

  if (selector.length === 0) {
    ctx.screen.printError(i18n.t('cmdFill.error.noSelector', 'A CSS selector is required (-s)'));
    return;
  }

  const root = getContentRoot();
  if (root === null) {
    ctx.screen.printError(i18n.t('cmdFill.error.noRoot', 'Cannot find Odoo content area'));
    return;
  }

  // $FlowFixMe[prop-missing]
  let elements: Array<Element> = Array.from(root.querySelectorAll(selector));
  elements = elements.filter(el => el.closest('.o_terminal') === null);

  if (elements.length === 0) {
    ctx.screen.printError(
      i18n.t('cmdFill.error.notFound', 'No element found for selector "{{selector}}"', {selector}),
    );
    return;
  }

  if (index >= elements.length) {
    ctx.screen.printError(
      i18n.t('cmdFill.error.indexOutOfRange', 'Index {{index}} out of range ({{count}} match(es) found)', {
        index,
        count: elements.length,
      }),
    );
    return;
  }

  const el = elements[index];

  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    el.value = value;
    el.dispatchEvent(new Event('input', {bubbles: true}));
    el.dispatchEvent(new Event('change', {bubbles: true}));
  } else if (el instanceof HTMLSelectElement) {
    el.value = value;
    el.dispatchEvent(new Event('change', {bubbles: true}));
  } else if (el instanceof HTMLElement && el.isContentEditable) {
    el.textContent = value;
    el.dispatchEvent(new Event('input', {bubbles: true}));
    el.dispatchEvent(new Event('change', {bubbles: true}));
  } else {
    ctx.screen.printError(
      i18n.t(
        'cmdFill.error.notFillable',
        'Element matched by "{{selector}}" is not a fillable input (input, textarea, select, or contenteditable)',
        {selector},
      ),
    );
    return;
  }

  if (submitEnter && el instanceof HTMLElement) {
    el.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', keyCode: 13, bubbles: true}));
    el.dispatchEvent(new KeyboardEvent('keyup', {key: 'Enter', keyCode: 13, bubbles: true}));
  }

  ctx.screen.print(
    i18n.t('cmdFill.result.filled', 'Filled "{{selector}}"{{enter}} with: {{value}}', {
      selector,
      value: value.length > 0 ? value : '(empty)',
      enter: submitEnter ? ' + Enter' : '',
    }),
  );
  return value;
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdFill.definition', 'Fill a text input, textarea, select, or contenteditable with a value'),
    callback: cmdFill,
    detail: i18n.t(
      'cmdFill.detail',
      'Finds an element by CSS selector and sets its value, then fires input and change events so the framework reacts. ' +
        'Use for inputs that are NOT Odoo form field widgets (search bars, filter boxes, custom HTML inputs). ' +
        'For standard Odoo form fields use "form -o edit" instead. ' +
        '-n picks the nth match (0-based). ' +
        '--enter also dispatches an Enter keydown after filling (required for the Odoo search bar to submit the query).',
    ),
    args: [
      [ARG.String, ['s', 'selector'], true, i18n.t('cmdFill.args.selector', 'CSS selector of the input element')],
      [ARG.String, ['v', 'value'], false, i18n.t('cmdFill.args.value', 'Text to fill in'), ''],
      [ARG.Number, ['n', 'index'], false, i18n.t('cmdFill.args.index', 'Index of the match to use, 0-based (default: 0)'), 0],
      [ARG.Flag, ['e', 'enter'], false, i18n.t('cmdFill.args.enter', 'Dispatch Enter keydown after filling (use for search bars)')],
    ],
    example: '-s ".o_searchview_input" -v "ACME" --enter',
  };
}
