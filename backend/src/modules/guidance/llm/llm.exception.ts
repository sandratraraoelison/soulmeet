import { HttpException, HttpStatus } from '@nestjs/common';

export class LlmException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_GATEWAY,
  ) {
    super({ code, message }, status);
  }
}
