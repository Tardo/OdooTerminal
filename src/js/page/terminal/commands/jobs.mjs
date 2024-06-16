// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@terminal/terminal';
import type {JobInfo} from '@trash/shell';

async function cmdJobs(
  this: Terminal,
  kwargs: CMDCallbackArgs,
  ctx: CMDCallbackContext,
): Promise<$ReadOnlyArray<JobInfo>> {
  const jobs = this.getShell().getActiveJobs();
  ctx.screen.print(
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

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdJobs.definition', 'Display running jobs'),
    callback: cmdJobs,
    detail: i18n.t('cmdJobs.detail', 'Display running jobs'),
  };
}
