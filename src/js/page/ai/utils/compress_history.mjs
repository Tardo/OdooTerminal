// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {
  ANTHROPIC_CONTEXT_LIMIT_TOKENS,
  OPENAI_CONTEXT_LIMIT_TOKENS,
  GEMINI_CONTEXT_LIMIT_TOKENS,
  COHERE_CONTEXT_LIMIT_TOKENS,
  COMPRESS_KEEP_ROUNDS,
} from '@ai/constants';


// Returns the true context size in tokens for the last request, accounting for
// provider differences in how usage is reported.
// Anthropic: prompt_tokens = uncached only; add cache_read and cache_creation for full size.
// OpenAI: prompt_tokens = full size (cached portion tracked in prompt_tokens_details).
export function computeContextSize(usage: TokenUsage, provider: ?string): number {
  if (provider === 'anthropic') {
    return (
      usage.prompt_tokens +
      (usage.cache_read_input_tokens ?? 0) +
      (usage.cache_creation_input_tokens ?? 0)
    );
  }
  return usage.prompt_tokens;
}

const CONTEXT_LIMIT_TOKENS_BY_PROVIDER: {[string]: number} = {
  anthropic: ANTHROPIC_CONTEXT_LIMIT_TOKENS,
  gemini: GEMINI_CONTEXT_LIMIT_TOKENS,
  cohere: COHERE_CONTEXT_LIMIT_TOKENS,
};

export function shouldCompress(contextSize: number, provider: ?string): boolean {
  const limit =
    provider !== null && provider !== undefined && CONTEXT_LIMIT_TOKENS_BY_PROVIDER[provider] !== undefined
      ? CONTEXT_LIMIT_TOKENS_BY_PROVIDER[provider]
      : OPENAI_CONTEXT_LIMIT_TOKENS;
  return contextSize >= limit;
}

// Trims the oldest tool-call rounds from messages to reduce context size.
// Layout: [system, initial_user, assistant1, user1, assistant2, user2, ...]
// Keeps system + initial_user + last COMPRESS_KEEP_ROUNDS assistant/user pairs.
// Drops only complete pairs to preserve role alternation.
export function compressHistory(messages: Array<AIMessage>): Array<AIMessage> {
  const prefix = messages.slice(0, 2); // [system, initial_user]
  const rounds = messages.slice(2);    // alternating [assistant, user, ...]

  if (rounds.length <= COMPRESS_KEEP_ROUNDS * 2) {
    return messages;
  }

  return [...prefix, ...rounds.slice(-COMPRESS_KEEP_ROUNDS * 2)];
}
