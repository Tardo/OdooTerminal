// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

// OpenAI and Cohere v2 use the same message and tool-call representation.
export default function toChatMessages(messages: Array<AIMessage>): Array<{[string]: mixed}> {
  const result: Array<{[string]: mixed}> = [];
  for (const msg of messages) {
    const {role, content} = msg;
    if (typeof content === 'string') {
      result.push({role, content});
      continue;
    }
    if (role === 'assistant') {
      let textContent = '';
      const toolCalls: Array<{[string]: mixed}> = [];
      for (const block of content) {
        if (block.type === 'text') {
          textContent += block.text;
        } else if (block.type === 'tool_use') {
          toolCalls.push({
            id: block.id,
            type: 'function',
            function: {name: block.name, arguments: JSON.stringify(block.input)},
          });
        }
      }
      if (toolCalls.length > 0) {
        // $FlowFixMe[incompatible-call]
        result.push({role: 'assistant', content: textContent || null, tool_calls: toolCalls});
      } else {
        result.push({role: 'assistant', content: textContent});
      }
    } else if (role === 'user') {
      const textParts: Array<string> = [];
      const imageParts: Array<{[string]: mixed}> = [];
      for (const block of content) {
        if (block.type === 'tool_result') {
          result.push({role: 'tool', tool_call_id: block.tool_use_id, content: block.content});
        } else if (block.type === 'text') {
          textParts.push(block.text);
        } else if (block.type === 'image') {
          imageParts.push({
            type: 'image_url',
            image_url: {url: `data:${block.source.media_type};base64,${block.source.data}`},
          });
        } else if (block.type === 'document') {
          textParts.push('[PDF document attached — inline PDF is not supported by this provider]');
        }
      }
      if (textParts.length > 0 || imageParts.length > 0) {
        if (imageParts.length === 0) {
          result.push({role: 'user', content: textParts.join('')});
        } else {
          const parts: Array<{[string]: mixed}> = [];
          if (textParts.length > 0) {
            parts.push({type: 'text', text: textParts.join('')});
          }
          parts.push(...imageParts);
          result.push({role: 'user', content: parts});
        }
      }
    } else {
      let textContent = '';
      for (const block of content) {
        if (block.type === 'text') textContent += block.text;
      }
      result.push({role, content: textContent});
    }
  }
  return result;
}
