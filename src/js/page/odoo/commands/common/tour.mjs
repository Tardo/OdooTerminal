// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from "@trash/constants";
import {getOdooService} from "@odoo/utils";

function cmdRunTour(kwargs) {
  // Loaded in this way because 'tour' is not initialized on mobile mode.
  const tour = getOdooService("web_tour.tour");
  if (!tour) {
    return Promise.reject("tour not accesible! Can't use this command now.");
  }
  const tour_names = Object.keys(tour.tours);
  if (kwargs.name) {
    if (tour_names.indexOf(kwargs.name) === -1) {
      return Promise.reject("The given tour doesn't exists!");
    }
    tour.run(kwargs.name);
    this.screen.print("Running tour...");
  } else if (tour_names.length) {
    this.screen.print(tour_names);
    return Promise.resolve(tour_names);
  } else {
    this.screen.print("The tour list is empty");
  }
  return Promise.resolve();
}

export default {
  definition: "Launch Tour",
  callback: cmdRunTour,
  detail:
    "Runs the selected tour. If no tour given, prints all available tours.",
  args: [[ARG.String, ["n", "name"], false, "The tour technical name"]],
  example: "-n mail_tour",
};
