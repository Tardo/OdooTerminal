// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from "@trash/constants";

async function cmdGen(kwargs) {
  this.parameterGenerator.resetStores();
  const type = kwargs.type.toLowerCase();
  let result = false;
  if (type === "email") {
    result = this.parameterGenerator.generateEmail(kwargs.min, kwargs.max);
  } else if (type === "url") {
    result = this.parameterGenerator.generateUrl(kwargs.min, kwargs.max);
  } else if (type === "float") {
    result = this.parameterGenerator.generateFloat(kwargs.min, kwargs.max);
  } else if (type === "int") {
    result = this.parameterGenerator.generateInt(kwargs.min, kwargs.max);
  } else if (type === "intseq") {
    result = this.parameterGenerator.generateIntSeq(kwargs.min, kwargs.max);
  } else if (type === "intiter") {
    result = this.parameterGenerator.doIntIter(kwargs.min, kwargs.max);
  } else if (type === "str") {
    result = this.parameterGenerator.generateString(kwargs.min, kwargs.max);
  } else if (type === "tzdate") {
    result = this.parameterGenerator.generateTzDate(kwargs.min, kwargs.max);
  } else if (type === "date") {
    result = this.parameterGenerator.generateDate(kwargs.min, kwargs.max);
  } else if (type === "tztime") {
    result = this.parameterGenerator.generateTzTime(kwargs.min, kwargs.max);
  } else if (type === "time") {
    result = this.parameterGenerator.generateTime(kwargs.min, kwargs.max);
  } else if (type === "tzdatetime") {
    result = this.parameterGenerator.generateTzDateTime(kwargs.min, kwargs.max);
  } else if (type === "datetime") {
    result = this.parameterGenerator.generateDateTime(kwargs.min, kwargs.max);
  }
  this.screen.print(result);
  return result;
}

export default {
  definition: "Generate random values",
  callback: cmdGen,
  detail: "Generate numbers, strings, url's, dates, etc...",
  args: [
    [
      ARG.String,
      ["t", "type"],
      true,
      "Generator type",
      "str",
      [
        "str",
        "float",
        "int",
        "intseq",
        "intiter",
        "date",
        "tzdate",
        "time",
        "tztime",
        "datetime",
        "tzdatetime",
        "email",
        "url",
      ],
    ],
    [ARG.Number, ["mi", "min"], false, "Min. value", 1],
    [ARG.Number, ["ma", "max"], false, "Max. value"],
  ],
  example: "-t str -mi 2 -ma 4",
};
