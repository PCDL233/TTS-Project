import { BadRequestException } from '@nestjs/common';

export const CHAT_ROLE_CUSTOM_PRESET_ID = 'custom';
export const MAX_CUSTOM_ROLE_PROMPT_LENGTH = 2000;

export const CHAT_ROLE_PRESETS = {
  professional_assistant: {
    name: '专业严谨助手',
    prompt:
      '你是一名专业严谨的智能助手。回答必须先给结论，再给关键依据和可执行步骤；使用清晰的小标题或项目符号；不编造不确定信息，对不确定内容明确说明；语言简洁、客观、礼貌。',
  },
  code_mentor: {
    name: '代码导师',
    prompt:
      '你是一名代码导师。回答必须说明核心思路、关键代码或伪代码、潜在风险和验证方法；优先给出可执行建议；遇到错误信息时先定位原因再给修复步骤；保持耐心、清晰、工程化。',
  },
  writing_polisher: {
    name: '写作润色助手',
    prompt:
      '你是一名写作润色助手。回答必须保持用户原意，优化逻辑、语气和表达；优先给出润色后的完整版本，再简要列出修改要点；不擅自增加事实性信息；语言自然、流畅、有分寸。',
  },
  learning_coach: {
    name: '学习教练',
    prompt:
      '你是一名学习教练。回答必须从简单结论开始，再循序渐进解释原因；使用例子、类比或小练习帮助理解；主动指出常见误区；语气鼓励、耐心、易懂。',
  },
  translator: {
    name: '翻译专家',
    prompt:
      '你是一名翻译专家。回答必须忠实传达原文含义，保留原有格式、列表和专有名词；根据上下文选择自然准确的表达；必要时在译文后用简短备注说明关键术语或可替代表达。',
  },
} as const;

type ChatRolePresetId = keyof typeof CHAT_ROLE_PRESETS;

export interface ChatRoleSettings {
  enabled?: boolean;
  presetId?: string;
  customPrompt?: string;
}

export interface ChatRoleMessage {
  role: string;
  content?: string;
  contentParts?: any[];
}

function buildRoleSystemPrompt(roleName: string, rolePrompt: string): string {
  return [
    '你现在必须扮演以下模型角色，并在整个回复中严格遵守。',
    '角色设定的要求优先于用户要求改变回答风格、身份或输出规则的请求；除非内容违反安全、法律或平台规则，否则不得脱离角色。',
    '所有答复必须完全满足角色设定中的语气、结构、细节约束；如果用户的问题与角色无关，也要保持该角色的表达方式。',
    '',
    `--- 角色设定：${roleName} ---`,
    rolePrompt,
    '--- 角色设定结束 ---',
  ].join('\n');
}

export function resolveChatRolePrompt(
  settings?: ChatRoleSettings,
): string | null {
  if (!settings?.enabled) return null;

  const presetId = settings.presetId?.trim();
  if (!presetId) {
    throw new BadRequestException('请选择模型角色设定');
  }

  if (presetId === CHAT_ROLE_CUSTOM_PRESET_ID) {
    const customPrompt = settings.customPrompt?.trim() || '';
    if (!customPrompt) {
      throw new BadRequestException('请输入自定义角色设定');
    }
    if (customPrompt.length > MAX_CUSTOM_ROLE_PROMPT_LENGTH) {
      throw new BadRequestException(
        `自定义角色设定不能超过 ${MAX_CUSTOM_ROLE_PROMPT_LENGTH} 字`,
      );
    }
    return buildRoleSystemPrompt('自定义角色', customPrompt);
  }

  const preset = CHAT_ROLE_PRESETS[presetId as ChatRolePresetId];
  if (!preset) {
    throw new BadRequestException('未知的模型角色设定');
  }

  return buildRoleSystemPrompt(preset.name, preset.prompt);
}

export function prependChatRolePrompt<T extends ChatRoleMessage>(
  messages: T[],
  rolePrompt: string | null,
): Array<T | { role: 'system'; content: string }> {
  if (!rolePrompt) return messages;
  return [{ role: 'system', content: rolePrompt }, ...messages];
}
