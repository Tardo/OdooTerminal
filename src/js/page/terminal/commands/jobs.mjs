// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

async function cmdJobs() {
  const jobs = this.jobs.filter((item) => item);
  this.screen.print(
    jobs.map(
      (item) =>
        `${item.cmdInfo.cmdName} <small><i>${item.cmdInfo.cmdRaw}</i></small> ${
          item.healthy
            ? ""
            : '<span class="text-warning">This job is taking a long time</span>'
        }`
    )
  );
  return jobs;
}

export default {
  definition: "Display running jobs",
  callback: cmdJobs,
  detail: "Display running jobs",
};
