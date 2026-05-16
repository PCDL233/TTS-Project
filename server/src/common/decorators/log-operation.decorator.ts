import { SetMetadata } from '@nestjs/common'

export const LOG_OPERATION_KEY = 'log_operation'

export interface LogOperationOptions {
  module: string
  action: string
}

export const LogOperation = (module: string, action: string) =>
  SetMetadata(LOG_OPERATION_KEY, { module, action })
