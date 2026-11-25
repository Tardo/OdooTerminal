// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import {h} from 'preact';
import {useState} from 'preact/hooks';
import {Card, Field, Input, Button, message} from '../ui.mjs';
import {t} from '../i18n.mjs';
import {toOrigin} from '@shared/relay_policy';

export default function TrustedSitesSection({settings, mutate}: any) {
  const [newSite, setNewSite] = useState<string>('');
  const sites = Array.isArray(settings.trusted_origins) ? settings.trusted_origins : [];

  const addSite = () => {
    const origin = toOrigin(newSite.trim());
    if (origin === null || origin === undefined) {
      message.warning(t('optionsTrustedSitesInvalid', 'Enter a full URL (e.g. https://my.odoo.com)'));
      return;
    }
    mutate((s: any) => {
      s.trusted_origins = [...new Set([...sites, origin])];
    });
    setNewSite('');
  };

  return h(Card, {title: t('optionsTitleTrustedSites', 'Trusted Sites'), class: 'ot-card'},
    h('p', {class: 'ot-hint'}, t('optionsTitleTrustedSitesDescription', 'Only these sites can use your AI providers and MCP servers, take screenshots and use the "copy" and "paste" commands.')),
    h('ul', null, sites.map((site: string) => h('li', {key: site}, `${site} `,
      h(Button, {onClick: () => mutate((s: any) => { s.trusted_origins = sites.filter((item: string) => item !== site); })},
        t('optionsTitleThemeRemove', 'Remove'))))),
    h(Field, {label: t('optionsTrustedSitesUrl', 'Site URL')},
      h(Input, {value: newSite, 'onUpdate:value': setNewSite, placeholder: 'https://my.odoo.com'})),
    h(Button, {type: 'primary', onClick: addSite}, t('optionsTrustedSitesAdd', 'Add site')));
}
