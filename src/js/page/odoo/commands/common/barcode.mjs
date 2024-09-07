// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import getOdooService from '@odoo/utils/get_odoo_service';
import getOdooVersion from '@odoo/utils/get_odoo_version';
import asyncSleep from '@terminal/utils/async_sleep';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';

const AVAILABLE_BARCODE_COMMANDS = [
  'O-CMD.EDIT',
  'O-CMD.DISCARD',
  'O-CMD.SAVE',
  'O-CMD.PREV',
  'O-CMD.NEXT',
  'O-CMD.PAGER-FIRST',
  'O-CMD.PAGER-LAST',
];

function getBarcodeEvent(data: string) {
  const OdooVerMajor = getOdooVersion('major');
  if (typeof OdooVerMajor === 'number' && OdooVerMajor >= 16) {
    return new KeyboardEvent('keydown', {
      key: data,
    });
  }
  const keyCode = data.charCodeAt(0);
  return new KeyboardEvent('keypress', {
    keyCode: keyCode,
    which: keyCode,
  });
}

function getBarcodeInfo(barcodeService: BarcodeService) {
  const OdooVerMajor = getOdooVersion('major');
  if (typeof OdooVerMajor === 'number' && OdooVerMajor >= 16) {
    return [
      i18n.t('cmdBarcode.result.maxTimeBetweenKeysInMs', 'Max. time between keys (ms): {{maxTimeBetweenKeysInMs}}', {
        maxTimeBetweenKeysInMs: barcodeService.barcodeService.maxTimeBetweenKeysInMs,
      }),
      i18n.t('cmdBarcode.result.reservedPrefixes', 'Reserved barcode prefixes: {{prefixes}}', {
        prefixes: 'O-BTN., O-CMD.',
      }),
      i18n.t('cmdBarcode.result.availableCommands', 'Available commands: {{availableCommands}}', {
        availableCommands: AVAILABLE_BARCODE_COMMANDS.join(', '),
      }),
    ];
  }
  return [
    i18n.t('cmdBarcode.result.maxTimeBetweenKeysInMs', 'Max. time between keys (ms): {{maxTimeBetweenKeysInMs}}', {
      maxTimeBetweenKeysInMs: barcodeService.BarcodeEvents.max_time_between_keys_in_ms,
    }),
    i18n.t('cmdBarcode.result.reservedPrefixes', 'Reserved barcode prefixes: {{prefixes}}', {
      prefixes: barcodeService.ReservedBarcodePrefixes.join(', '),
    }),
    i18n.t('cmdBarcode.result.availableCommands', 'Available commands: {{availableCommands}}', {
      availableCommands: AVAILABLE_BARCODE_COMMANDS.join(', '),
    }),
    i18n.t('cmdBarcode.result.acceptScan', 'Currently accepting barcode scanning? {{isAcceptingScan}}', {
      isAcceptingScan: barcodeService.BarcodeEvents.$barcodeInput.length > 0 ? 'Yes' : 'No',
    }),
  ];
}

async function cmdBarcode(kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  const barcodeService = getOdooService('barcodes.BarcodeEvents', '@barcodes/barcode_service');
  if (!barcodeService) {
    // Soft-dependency... this don't exists if barcodes module is not installed
    ctx.screen.printError(
      i18n.t('cmdBarcode.error.moudeNotAvailable', "The 'barcode' module is not installed/available"),
    );
    return;
  }

  if (kwargs.operation === 'info') {
    const info = getBarcodeInfo(barcodeService);
    ctx.screen.eprint(info);
    return info;
  } else if (kwargs.operation === 'send') {
    if (!kwargs.data) {
      throw new Error(i18n.t('cmdBarcode.error.noData', 'No data given!'));
    }

    for (const barcode of kwargs.data) {
      for (let i = 0, bardoce_len = barcode.length; i < bardoce_len; i++) {
        document.body?.dispatchEvent(getBarcodeEvent(barcode[i]));
        await asyncSleep(kwargs.pressdelay);
      }
      await asyncSleep(kwargs.barcodedelay);
    }
  } else {
    throw new Error(i18n.t('cmdBarcode.error.invalidOperation', 'Invalid operation!'));
  }
  return kwargs.data;
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdBarcode.definition', 'Operations over barcode'),
    callback: cmdBarcode,
    detail: i18n.t('cmdBarcode.detail', 'See information and send barcode strings'),
    args: [
      [
        ARG.String,
        ['o', 'operation'],
        false,
        i18n.t('cmdBarcode.args.operation', 'The operation'),
        'send',
        ['send', 'info'],
      ],
      [ARG.List | ARG.Any, ['d', 'data'], false, i18n.t('cmdBarcode.args.data', 'The data to send')],
      [
        ARG.Number,
        ['pd', 'pressdelay'],
        false,
        i18n.t('cmdBarcode.args.pressDelay', 'The delay between presskey events (in ms)'),
        3,
      ],
      [
        ARG.Number,
        ['bd', 'barcodedelay'],
        false,
        i18n.t('cmdBarcode.args.barcodeDelay', 'The delay between barcodes reads (in ms)'),
        150,
      ],
    ],
    example: '-o send -d O-CMD.NEXT',
  };
}
