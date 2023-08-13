// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from "@trash/constants";
import {asyncSleep} from "@terminal/core/utils";
import {getOdooService, getOdooVersionMajor} from "@odoo/utils";

const AVAILABLE_BARCODE_COMMANDS = [
  "O-CMD.EDIT",
  "O-CMD.DISCARD",
  "O-CMD.SAVE",
  "O-CMD.PREV",
  "O-CMD.NEXT",
  "O-CMD.PAGER-FIRST",
  "O-CMD.PAGER-LAST",
];

function getBarcodeEvent(data) {
  const OdooVer = getOdooVersionMajor();
  if (OdooVer >= 16) {
    return new KeyboardEvent("keydown", {
      key: data,
    });
  }
  const keyCode = data.charCodeAt(0);
  return new KeyboardEvent("keypress", {
    keyCode: keyCode,
    which: keyCode,
  });
}

function getBarcodeInfo(barcodeService) {
  const OdooVer = getOdooVersionMajor();
  if (OdooVer >= 16) {
    return [
      `Max. time between keys (ms): ${barcodeService.barcodeService.maxTimeBetweenKeysInMs}`,
      "Reserved barcode prefixes: O-BTN., O-CMD.",
      `Available commands: ${AVAILABLE_BARCODE_COMMANDS.join(", ")}`,
    ];
  }
  return [
    `Max. time between keys (ms): ${barcodeService.BarcodeEvents.max_time_between_keys_in_ms}`,
    `Reserved barcode prefixes: ${barcodeService.ReservedBarcodePrefixes.join(
      ", "
    )}`,
    `Available commands: ${AVAILABLE_BARCODE_COMMANDS.join(", ")}`,
    `Currently accepting barcode scanning? ${
      barcodeService.BarcodeEvents.$barcodeInput.length > 0 ? "Yes" : "No"
    }`,
  ];
}

function cmdBarcode(kwargs) {
  // Soft-dependency... this don't exists if barcodes module is not installed

  const barcodeService = getOdooService(
    "barcodes.BarcodeEvents",
    "@barcodes/barcode_service"
  );
  if (!barcodeService) {
    this.screen.printError("The 'barcode' module is not installed/available");
    return Promise.resolve();
  }
  return new Promise(async (resolve, reject) => {
    if (kwargs.operation === "info") {
      const info = getBarcodeInfo(barcodeService);
      this.screen.eprint(info);
      return resolve(info);
    } else if (kwargs.operation === "send") {
      if (!kwargs.data) {
        return reject("No data given!");
      }

      for (const barcode of kwargs.data) {
        for (let i = 0, bardoce_len = barcode.length; i < bardoce_len; i++) {
          document.body.dispatchEvent(getBarcodeEvent(barcode[i]));
          await asyncSleep(kwargs.pressdelay);
        }
        await asyncSleep(kwargs.barcodedelay);
      }
    } else {
      return reject("Invalid operation!");
    }
    return resolve(kwargs.data);
  });
}

export default {
  definition: "Operations over barcode",
  callback: cmdBarcode,
  detail: "See information and send barcode strings",
  args: [
    [
      ARG.String,
      ["o", "operation"],
      false,
      "The operation",
      "send",
      ["send", "info"],
    ],
    [ARG.List | ARG.Any, ["d", "data"], false, "The data to send"],
    [
      ARG.Number,
      ["pd", "pressdelay"],
      false,
      "The delay between presskey events (in ms)",
      3,
    ],
    [
      ARG.Number,
      ["bd", "barcodedelay"],
      false,
      "The delay between barcodes reads (in ms)",
      150,
    ],
  ],
  example: "-o send -d O-CMD.NEXT",
};
