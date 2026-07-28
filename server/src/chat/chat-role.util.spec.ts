import { BadRequestException } from '@nestjs/common';
import {
  MAX_CUSTOM_ROLE_PROMPT_LENGTH,
  prependChatRolePrompt,
  resolveChatRolePrompt,
} from './chat-role.util';

describe('chat-role.util', () => {
  it('未启用角色设定时不生成 system prompt', () => {
    expect(resolveChatRolePrompt()).toBeNull();
    expect(
      resolveChatRolePrompt({ enabled: false, presetId: 'code_mentor' }),
    ).toBeNull();
  });

  it('按后端预设 id 生成可信角色 prompt', () => {
    const prompt = resolveChatRolePrompt({
      enabled: true,
      presetId: 'code_mentor',
      customPrompt: '前端伪造的角色内容不应生效',
    });

    expect(prompt).toContain('代码导师');
    expect(prompt).toContain('回答必须说明核心思路');
    expect(prompt).not.toContain('前端伪造');
  });

  it('自定义角色为空或过长时抛出 400 错误', () => {
    expect(() =>
      resolveChatRolePrompt({
        enabled: true,
        presetId: 'custom',
        customPrompt: '   ',
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      resolveChatRolePrompt({
        enabled: true,
        presetId: 'custom',
        customPrompt: '你'.repeat(MAX_CUSTOM_ROLE_PROMPT_LENGTH + 1),
      }),
    ).toThrow(BadRequestException);
  });

  it('在已有消息前插入角色 system prompt，保证顺序优先于 RAG', () => {
    const rolePrompt = resolveChatRolePrompt({
      enabled: true,
      presetId: 'translator',
    });
    const messages = prependChatRolePrompt(
      [
        { role: 'system', content: 'RAG 知识库提示' },
        { role: 'user', content: 'hello' },
      ],
      rolePrompt,
    );

    expect(messages).toHaveLength(3);
    expect(messages[0]).toMatchObject({ role: 'system' });
    expect(messages[0].content).toContain('翻译专家');
    expect(messages[1].content).toBe('RAG 知识库提示');
  });
});
