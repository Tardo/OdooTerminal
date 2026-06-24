declare type AIState = {
  url: ?string,
  apiKey: ?string,
  model: ?string,
  timeout: ?number,
  provider: ?string,
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

declare type AIRuntime = {
  controller: ?AbortController,
};

declare type AIConversation = {
  id: string,
  name: string,
  createdAt: number,
};

declare type AIModelConfig = {
  name: string,
  url: string,
  api_key: string,
  model: string,
  provider: string,
  timeout: number,
};
