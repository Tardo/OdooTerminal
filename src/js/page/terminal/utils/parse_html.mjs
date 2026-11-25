// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import ElementNotFoundTemplateError from '@terminal/exceptions/element_not_found_template_error';
import TooManyElementsTemplateError from '@terminal/exceptions/too_many_elements_template_error';
import InvalidElementTemplateError from '@terminal/exceptions/invalid_element_template_error';

const FORBIDDEN_SELECTOR = 'script,iframe,frame,object,embed,base,meta,link,template,animate,set';
const URL_ATTRS = ['href', 'xlink:href', 'src', 'action', 'formaction', 'data'];

// Printed text can carry values written by other users (record names, server errors...):
// the HTML is allowed, but it must not be able to run code.
function sanitize(doc: Document) {
  doc.querySelectorAll(FORBIDDEN_SELECTOR).forEach(el => el.remove());
  doc.querySelectorAll('*').forEach(el => {
    for (const {name, value} of Array.from(el.attributes)) {
      const is_script_url =
        URL_ATTRS.includes(name) && /^(javascript|vbscript):/i.test(value.replace(/[\u0000-\u0020]/g, ''));
      if (name.startsWith('on') || is_script_url) {
        el.removeAttribute(name);
      }
    }
  });
}

export default function (template: string): HTMLElement {
  const doc = new DOMParser().parseFromString(template, "text/html");
  sanitize(doc);
  if (!doc.body?.childNodes) {
    throw new ElementNotFoundTemplateError();
  }
  if (doc.body.childNodes.length > 1) {
    throw new TooManyElementsTemplateError();
  }

  if (doc.body.childNodes[0] instanceof HTMLElement) {
    return document.importNode(doc.body.childNodes[0], true);
  }
  throw new InvalidElementTemplateError();
}
