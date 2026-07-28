import { AgentService } from './agent.service';
import { Agent } from './agent.entity';
import { AgentVersion } from './agent-version.entity';
import { ChatConversation } from '../chat/chat-conversation.entity';
import { ChatMessage } from '../chat/chat-message.entity';

describe('AgentService', () => {
  it('真实删除智能体并清理版本、关联会话和消息', async () => {
    const conversationRepository = {
      find: jest.fn().mockResolvedValue([{ id: 11 }, { id: 12 }]),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const messageRepository = {
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const versionRepository = {
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const transactionAgentRepository = {
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const manager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === ChatConversation) return conversationRepository;
        if (entity === ChatMessage) return messageRepository;
        if (entity === AgentVersion) return versionRepository;
        if (entity === Agent) return transactionAgentRepository;
        throw new Error('未注册的测试实体');
      }),
    };
    const agentRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 3,
        userId: 7,
        archivedAt: null,
      }),
      manager: {
        transaction: jest.fn(
          async (callback: (value: typeof manager) => Promise<void>) =>
            callback(manager),
        ),
      },
    };
    const service = new AgentService(
      agentRepository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await service.remove(7, 3);

    expect(messageRepository.delete).toHaveBeenCalledWith({
      conversationId: expect.anything(),
    });
    expect(conversationRepository.delete).toHaveBeenCalledWith({
      id: expect.anything(),
      userId: 7,
    });
    expect(versionRepository.delete).toHaveBeenCalledWith({ agentId: 3 });
    expect(transactionAgentRepository.delete).toHaveBeenCalledWith({
      id: 3,
      userId: 7,
    });
  });
});
