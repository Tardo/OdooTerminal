// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export const aiState: AIState = {
  url: null,
  apiKey: null,
  model: null,
  timeout: null,
  provider: null,
  maxTokens: null,
  reasoning: null,
};

export const aiRuntime: AIRuntime = {
  controller: null,
};
