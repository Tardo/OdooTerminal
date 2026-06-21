declare type AIState = {
  url: ?string,
  apiKey: ?string,
  model: ?string,
  timeout: ?number,
};

declare type TokenUsage = {
  prompt_tokens: number,
  completion_tokens: number,
  total_tokens: number,
  cache_creation_input_tokens?: number,
  cache_read_input_tokens?: number,
  prompt_tokens_details?: {cached_tokens?: number},
};

declare type AIContentBlock = {
  type: 'text',
  text: string,
  cache_control?: {type: 'ephemeral'},
};

declare type AIMessage = {
  role: string,
  content: string | Array<AIContentBlock>,
};
