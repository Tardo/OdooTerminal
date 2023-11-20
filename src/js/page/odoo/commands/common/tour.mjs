// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooEnvService from '@odoo/utils/get_odoo_env_service';
import getOdooVersion from '@odoo/utils/get_odoo_version';
import getOdooService from '@odoo/utils/get_odoo_service';
import {ARG} from '@trash/constants';

function getTourObj() {
  const OdooVerMajor = getOdooVersion('major');
  if (OdooVerMajor >= 17) {
    return getOdooEnvService('tour_service');
  } else {
    return getOdooService('web_tour.tour');
  }
}

// Note: 'tour' is not initialized on mobile mode.
function getTourNames(only_active) {
  const tour_obj = getTourObj();
  if (!tour_obj) {
    throw new Error("tour not accesible! Can't use it in this moment.");
  }
  const OdooVerMajor = getOdooVersion('major');
  if (OdooVerMajor >= 17) {
    if (only_active) {
      const {tourState} = getOdooService('@web_tour/tour_service/tour_state');
      return tourState.getActiveTourNames();
    }
    return tour_obj.getSortedTours().map(item => item.name);
  } else {
    if (only_active) {
      throw new Error('This is not available on Odoo <17.0');
    }
    return Object.keys(tour_obj.tours);
  }
}

function runTour(name) {
  const OdooVerMajor = getOdooVersion('major');
  const tour_obj = getTourObj();
  if (OdooVerMajor >= 17) {
    tour_obj.startTour(name, {mode: 'manual'});
  } else {
    tour_obj.run(name);
  }
}

async function cmdRunTour(kwargs, screen) {
  if (kwargs.name) {
    if (kwargs.clear) {
      const {tourState} = getOdooService('@web_tour/tour_service/tour_state');
      tourState.clear(kwargs.name);
      screen.print(`Tour '${kwargs.name}' clean`);
      return;
    }

    const tour_names = getTourNames();
    if (tour_names.indexOf(kwargs.name) === -1) {
      throw new Error("The given tour doesn't exists!");
    }
    runTour(kwargs.name);
    screen.print('Running tour...');
  } else {
    const tour_names = getTourNames(kwargs.only_active);
    if (tour_names.length) {
      screen.print(tour_names);
      return tour_names;
    } else {
      screen.print('The tour list is empty');
    }
  }
}

function getOptions(arg_name) {
  if (arg_name === 'name') {
    return Promise.resolve(getTourNames());
  }
  return Promise.resolve([]);
}

export default {
  definition: 'Launch Tour',
  callback: cmdRunTour,
  options: getOptions,
  detail:
    'Runs the selected tour. If no tour given, prints all available tours.',
  args: [
    [ARG.String, ['n', 'name'], false, 'The tour technical name'],
    [ARG.Flag, ['c', 'clear'], false, 'Clear the state'],
    [ARG.Flag, ['oa', 'only-active'], false, 'Clear the state'],
  ],
  example: '-n mail_tour',
};
