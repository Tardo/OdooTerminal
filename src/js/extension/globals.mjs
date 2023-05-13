// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export const isFirefox = typeof chrome === "undefined";

export const ubrowser = isFirefox ? browser : chrome;
