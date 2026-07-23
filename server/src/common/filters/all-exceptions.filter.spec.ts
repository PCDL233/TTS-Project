import { ArgumentsHost, BadRequestException, Logger } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

function createHost(exceptionPath = '/api/example') {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const getHeader = jest.fn(() => 'req-1');
  const response = {
    headersSent: false,
    getHeader,
    status,
  };
  const request = {
    method: 'POST',
    originalUrl: exceptionPath,
    url: exceptionPath,
    headers: { 'x-request-id': 'req-1' },
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;

  return { host, response, status, json };
}

describe('AllExceptionsFilter', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('将 class-validator 数组消息规范化为首条 message 和 messages 明细', () => {
    const filter = new AllExceptionsFilter();
    const { host, status, json } = createHost();

    filter.catch(
      new BadRequestException(['名称不能为空', '年龄必须是数字']),
      host,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 400,
        message: '名称不能为空',
        messages: ['名称不能为空', '年龄必须是数字'],
        requestId: 'req-1',
        path: '/api/example',
      }),
    );
  });

  it('将未知异常转换为 500 响应并透传错误消息', () => {
    const filter = new AllExceptionsFilter();
    const { host, status, json } = createHost('/api/fail');

    filter.catch(new Error('数据库连接失败'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 500,
        message: '数据库连接失败',
        requestId: 'req-1',
        path: '/api/fail',
      }),
    );
  });

  it('响应已开始时不再写入响应体', () => {
    const filter = new AllExceptionsFilter();
    const { host, response, status, json } = createHost('/api/stream');
    response.headersSent = true;

    filter.catch(new Error('stream failed'), host);

    expect(status).not.toHaveBeenCalled();
    expect(json).not.toHaveBeenCalled();
  });
});
