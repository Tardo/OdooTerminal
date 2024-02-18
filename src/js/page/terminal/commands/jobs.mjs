// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';

async function cmdJobs(kwargs, screen) {
  const jobs = this.jobs.filter(item => item);
  screen.print(
    jobs.map(
      item =>
        `${item.cmdInfo.cmdName} <small><i>${item.cmdInfo.cmdRaw}</i></small> ${
          item.healthy
            ? ''
            : `<span class="text-warning">${i18n.t('cmdJobs.result.timeout', 'This job is taking a long time')}</span>`
        }`,
    ),
  );
  return jobs;
}

export default {
  definition: i18n.t('cmdJobs.definition', 'Display running jobs'),
  callback: cmdJobs,
  detail: i18n.t('cmdJobs.detail', 'Display running jobs'),
};
