// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export const DEFAULT_MAX_STEPS: number = 99;
export const DEFAULT_MAX_TOKENS: number = 4000;

// Token threshold that triggers history compression during an agent run.
// Anthropic: sum of uncached + cached tokens; trigger well before the 200k window.
// OpenAI-compatible: trigger conservatively for small local-server context windows.
// Gemini: 1M-token context on current models; trigger well before that ceiling.
// Cohere: Command models sit around 128k-256k; trigger well under the smallest of those.
export const ANTHROPIC_CONTEXT_LIMIT_TOKENS: number = 150000;
export const OPENAI_CONTEXT_LIMIT_TOKENS: number = 28000;
export const GEMINI_CONTEXT_LIMIT_TOKENS: number = 500000;
export const COHERE_CONTEXT_LIMIT_TOKENS: number = 100000;

// Number of complete tool-call rounds (assistant + user pair) to keep after compression.
export const COMPRESS_KEEP_ROUNDS: number = 4;
