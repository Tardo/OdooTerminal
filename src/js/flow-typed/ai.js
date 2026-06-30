declare type AIState = {
  url: ?string,
  apiKey: ?string,
  model: ?string,
  timeout: ?number,
  provider: ?string,
  maxTokens: ?number,
};

declare type TokenUsage = {
  prompt_tokens: number,
  completion_tokens: number,
  total_tokens: number,
  cache_creation_input_tokens?: number,
  cache_read_input_tokens?: number,
  prompt_tokens_details?: {cached_tokens?: number},
};

declare type AIToolCall = {
  id: string,
  name: string,
  input: {[string]: mixed},
};

declare type AIToolDef = {
  name: string,
  description: string,
  parameters: {[string]: mixed},
};

declare type AIAttachment = {
  name: string,
  media_type: string,
  data: string,
};

declare type AIContentBlock =
  | {type: 'text', text: string, cache_control?: {type: 'ephemeral'}}
  | {type: 'tool_use', id: string, name: string, input: {[string]: mixed}}
  | {type: 'tool_result', tool_use_id: string, content: string, cache_control?: {type: 'ephemeral'}}
  | {type: 'image', source: {type: 'base64', media_type: string, data: string}, cache_control?: {type: 'ephemeral'}}
  | {type: 'document', source: {type: 'base64', media_type: string, data: string}, cache_control?: {type: 'ephemeral'}};

declare type AIMessage = {
  role: string,
  content: string | Array<AIContentBlock>,
};

declare type AIStreamResult = {
  text: string,
  toolCalls: Array<AIToolCall>,
  usage: ?TokenUsage,
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
  max_tokens: number,
};

declare type AICustomSkillDef = {
  name: string,
  description: string,
  content: string,
};
