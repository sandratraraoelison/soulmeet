import { HttpException, HttpStatus } from '@nestjs/common';

export class ChatException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: object,
  ) {
    super({ code, message, ...(details ? { details } : {}) }, status);
  }
}
