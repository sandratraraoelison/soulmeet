import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PasswordResetEmailService {
  private readonly logger = new Logger(PasswordResetEmailService.name);
  constructor(private readonly config: ConfigService) {}
  async send(email: string, code: string) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.error('RESEND_API_KEY is not configured');
      throw new InternalServerErrorException('Password recovery email is temporarily unavailable');
    }
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: this.config.get<string>('EMAIL_FROM'),
        to: [email],
        subject: 'Your Soulmeet password reset code',
        html: `<div style="font-family:Arial,sans-serif;color:#171620"><h1>Reset your password</h1><p>Enter this code in Soulmeet:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px">${code}</p><p>This code expires in 15 minutes. If you did not request it, you can ignore this email.</p></div>`,
      }),
    });
    if (!response.ok) {
      this.logger.error(`Password reset email rejected with status ${response.status}`);
      throw new InternalServerErrorException('Password recovery email is temporarily unavailable');
    }
  }
}
