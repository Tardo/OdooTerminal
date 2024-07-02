// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import ElementNotFoundTemplateError from '@terminal/exceptions/element_not_found_template_error';
import TooManyElementsTemplateError from '@terminal/exceptions/too_many_elements_template_error';
import InvalidElementTemplateError from '@terminal/exceptions/invalid_element_template_error';

export default function (template: string): HTMLElement {
  const doc = new DOMParser().parseFromString(template, "text/html");
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
