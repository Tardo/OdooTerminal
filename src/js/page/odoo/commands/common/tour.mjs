// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooService from "@odoo/utils/get_odoo_service";
import {ARG} from "@trash/constants";

async function cmdRunTour(kwargs) {
  // Loaded in this way because 'tour' is not initialized on mobile mode.
  const tour = getOdooService("web_tour.tour");
  if (!tour) {
    throw new Error("tour not accesible! Can't use this command now.");
  }
  const tour_names = Object.keys(tour.tours);
  if (kwargs.name) {
    if (tour_names.indexOf(kwargs.name) === -1) {
      throw new Error("The given tour doesn't exists!");
    }
    tour.run(kwargs.name);
    this.screen.print("Running tour...");
  } else if (tour_names.length) {
    this.screen.print(tour_names);
    return tour_names;
  } else {
    this.screen.print("The tour list is empty");
  }
}

export default {
  definition: "Launch Tour",
  callback: cmdRunTour,
  detail:
    "Runs the selected tour. If no tour given, prints all available tours.",
  args: [[ARG.String, ["n", "name"], false, "The tour technical name"]],
  example: "-n mail_tour",
};
