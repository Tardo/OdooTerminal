// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import i18n from 'i18next';
import searchRead from '@odoo/orm/search_read';
import doAction from '@odoo/base/do_action';
import getOdooService from '@odoo/utils/get_odoo_service';
import getOdooVersion from '@odoo/utils/get_odoo_version';
import {ARG} from '@tardo/trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@tardo/trash/interpreter';
import type Terminal from '@odoo/terminal';

// Registers the templates in the web client's own QWeb (volatile: nothing is written to the database).
// <=15: legacy `web.core` qweb (add_template handles t-extend). 16: `@web/core/assets` loadXML. 17: `xml_templates` registry. 18+: `@web/core/templates` (handles t-inherit).
function registerTemplates(xml: string, nodes: Array<Element>) {
  const core = getOdooService('web.core');
  if (core?.qweb?.add_template) {
    core.qweb.add_template(`<templates>${xml}</templates>`);
    // 16 still ships the legacy qweb, but its Owl views read the templates from `@web/core/assets`
    if (getOdooVersion('major') !== 16) {
      return;
    }
    const assets = getOdooService('@web/core/assets');
    if (assets?.loadXML) {
      // loadXML only takes the elements marked as `owl`
      const owlXml = nodes.map(n => n.outerHTML.replace(/^<([\w.-]+)/, '<$1 owl="1"')).join('');
      assets.loadXML(`<templates>${owlXml}</templates>`);
    }
    return;
  }
  const tpls = getOdooService('@web/core/templates');
  if (!tpls?.registerTemplate) {
    // 17: the `xml_templates` registry feeds every Owl App (and handles t-inherit)
    const registry = getOdooService('@web/core/registry')?.registry;
    if (registry && getOdooService('@web/core/assets')?.templates) {
      registry
        .category('xml_templates')
        .add(`odoo-terminal.${Date.now()}`, `<templates>${xml}</templates>`, {force: true});
      return;
    }
    throw new Error(
      i18n.t('cmdQView.error.unsupported', 'This Odoo version does not expose its QWeb templates registry'),
    );
  }
  for (const node of nodes) {
    const inherit = node.getAttribute('t-inherit');
    if (inherit !== null && inherit !== '') {
      tpls.registerTemplateExtension(inherit, 'odoo-terminal', node.outerHTML);
    } else {
      tpls.registerTemplate(node.getAttribute('t-name'), 'odoo-terminal', node.outerHTML);
    }
  }
  // ponytail: not every 16+ build has it; without it only never-rendered templates pick up the change
  tpls.clearProcessedTemplates?.();
}

function renderTemplate(name: string, values: {...}): string {
  const core = getOdooService('web.core');
  if (core?.qweb?.render) {
    return core.qweb.render(name, values);
  }
  const render = getOdooService('@web/core/utils/render');
  if (render?.renderToString) {
    return render.renderToString(name, values);
  }
  throw new Error(i18n.t('cmdQView.error.noRender', 'Cannot render: QWeb renderer not found'));
}

// Volatile QWeb view: lives only in the current page session, like a template shipped in a module asset bundle.
async function cmdQView(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<> {
  let names: Array<string> = [];
  if (typeof kwargs.arch !== 'undefined') {
    const xml: string = kwargs.arch;
    const doc = new DOMParser().parseFromString(`<templates>${xml}</templates>`, 'text/xml');
    const parse_error = doc.querySelector('parsererror');
    if (parse_error) {
      ctx.screen.printError(parse_error.textContent);
      return false;
    }
    const nodes = Array.from(doc.querySelectorAll('[t-name]'));
    if (!nodes.length) {
      ctx.screen.printError(i18n.t('cmdQView.error.noTemplate', 'No template found: use <t t-name="...">'));
      return false;
    }
    registerTemplates(xml, nodes);
    names = nodes.map(n => n.getAttribute('t-name') ?? '');
    ctx.screen.print(i18n.t('cmdQView.registered', 'Registered: {{names}}', {names: names.join(', ')}));
  }
  const target: string | void = kwargs.render ?? kwargs.template ?? names[0];
  if (typeof target === 'undefined' || target === '') {
    ctx.screen.printError(i18n.t('cmdQView.error.nothingToDo', 'Use -a to register templates and/or -t to open one'));
    return false;
  }

  const values = {...(kwargs.values || {})};
  if (kwargs.model) {
    // Like ir.qweb on a model view: the selected records are available as `docs` (and `doc_ids`/`doc_model`)
    const domain = kwargs.ids ? [['id', 'in', kwargs.ids]] : [];
    values.docs = await searchRead(kwargs.model, domain, false, await this.getContext(), {
      limit: kwargs.ids ? undefined : 80,
    });
    values.doc_ids = values.docs.map(r => r.id);
    values.doc_model = kwargs.model;
  }
  const registry = getOdooService('@web/core/registry')?.registry;
  if (kwargs.render || !registry) {
    // -r, or Odoo without OWL client actions (<16): print the rendered HTML
    const html = renderTemplate(target, values);
    ctx.screen.print(html);
    return html;
  }
  // Open it as a client action whose component uses the volatile template (Owl 3 templates read the values as `this.<name>`)
  const tag = `odoo_terminal_qview.${target}`;
  class VolatileView extends owl.Component {
    static template: string = target;
    setup() {
      for (const [key, value] of Object.entries(values)) {
        // $FlowFixMe[prop-missing]
        this[key] = value;
      }
    }
  }
  registry.category('actions').add(tag, VolatileView, {force: true});
  await doAction({type: 'ir.actions.client', tag, name: target, target: kwargs.target ?? 'current'});
  this.doHide();
  return target;
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdQView.definition', 'Register a volatile QWeb view (nothing is saved in the database)'),
    callback: cmdQView,
    detail: i18n.t(
      'cmdQView.detail',
      'Registers QWeb templates in the web client for the current page session only. t-inherit/t-extend templates extend existing ones. The view is opened as a client action (Odoo 16+; -t opens an already registered one, -r prints the HTML instead); t-inherit extensions apply the next time the target template is rendered (e.g. reopen the view); with -m the model records are passed as `docs`. In Owl 3 (Odoo 19+) access the values through `this` (e.g. this.docs).',
    ),
    args: [
      [ARG.String, ['a', 'arch'], false, i18n.t('cmdQView.args.arch', 'The QWeb templates (elements with t-name)')],
      [
        ARG.String,
        ['t', 'template'],
        false,
        i18n.t('cmdQView.args.template', 'Template to open (default: the first registered one)'),
      ],
      [
        ARG.String,
        ['r', 'render'],
        false,
        i18n.t('cmdQView.args.render', 'Template to print as HTML in the terminal instead of opening it'),
      ],
      [
        ARG.String,
        ['tg', 'target'],
        false,
        i18n.t('cmdQView.args.target', 'Where to open it'),
        'current',
        ['current', 'new', 'fullscreen'],
      ],
      [
        ARG.String,
        ['m', 'model'],
        false,
        i18n.t('cmdQView.args.model', 'Model whose records are passed to the render as `docs`'),
      ],
      [
        ARG.List | ARG.Number,
        ['i', 'ids'],
        false,
        i18n.t('cmdQView.args.ids', 'The record IDs for -m (default: first 80)'),
      ],
      [ARG.Dictionary, ['v', 'values'], false, i18n.t('cmdQView.args.values', 'Extra render values')],
    ],
    example:
      "-a \"<t t-name='tm.partners'><ul><li t-foreach='this.docs' t-as='p' t-key='p.id'><t t-esc='p.name'/></li></ul></t>\" -m res.partner -i [1,2]",
  };
}
