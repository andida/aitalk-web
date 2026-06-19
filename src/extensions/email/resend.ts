import type {
  EmailAttachment,
  EmailConfigs,
  EmailMessage,
  EmailProvider,
  EmailSendResult,
} from '.';

/**
 * Resend email provider configs
 * @docs https://resend.com/docs/send-with-nextjs
 */
export interface ResendConfigs extends EmailConfigs {
  apiKey: string;
  defaultFrom?: string;
}

/**
 * Resend email provider implementation
 * @website https://resend.com/
 */
export class ResendProvider implements EmailProvider {
  readonly name = 'resend';
  configs: ResendConfigs;

  constructor(configs: ResendConfigs) {
    this.configs = configs;
  }

  async sendEmail(email: EmailMessage): Promise<EmailSendResult> {
    try {
      const resendEmail: ResendEmailPayload = {
        from: email.from || this.configs.defaultFrom || '',
        to: Array.isArray(email.to) ? email.to : [email.to],
        subject: email.subject,
      };

      if (email.cc) {
        resendEmail.cc = Array.isArray(email.cc) ? email.cc : [email.cc];
      }
      if (email.bcc) {
        resendEmail.bcc = Array.isArray(email.bcc) ? email.bcc : [email.bcc];
      }
      if (email.text) {
        resendEmail.text = email.text;
      }
      if (email.html) {
        resendEmail.html = email.html;
      }
      if (email.replyTo) {
        resendEmail.reply_to = email.replyTo;
      }
      if (email.attachments) {
        resendEmail.attachments = email.attachments.map(toResendAttachment);
      }
      if (email.tags) {
        resendEmail.tags = email.tags.map((tag) => ({
          name: 'category',
          value: tag,
        }));
      }
      if (email.headers) {
        resendEmail.headers = email.headers;
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.configs.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resendEmail),
      });

      const result = (await response
        .json()
        .catch(() => ({}))) as ResendEmailResponse;

      console.log('resend email result', result);

      if (!response.ok || result.error) {
        return {
          success: false,
          error:
            result.error?.message ||
            result.message ||
            `Resend API error: ${response.status}`,
          provider: this.name,
        };
      }

      return {
        success: true,
        messageId: result.id || result.data?.id,
        provider: this.name,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name,
      };
    }
  }
}

/**
 * Create Resend provider with configs
 */
export function createResendProvider(configs: ResendConfigs): ResendProvider {
  return new ResendProvider(configs);
}

type ResendEmailPayload = {
  from: string;
  to: string[];
  subject: string;
  cc?: string[];
  bcc?: string[];
  text?: string;
  html?: string;
  reply_to?: string;
  attachments?: ResendAttachment[];
  tags?: { name: string; value: string }[];
  headers?: Record<string, string>;
};

type ResendAttachment = {
  filename: string;
  content: string;
  content_type?: string;
};

type ResendEmailResponse = {
  id?: string;
  data?: { id?: string };
  error?: { message?: string };
  message?: string;
};

function toBase64(content: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;

  for (let index = 0; index < content.length; index += chunkSize) {
    const chunk = content.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function toResendAttachment(attachment: EmailAttachment): ResendAttachment {
  return {
    filename: attachment.filename,
    content:
      typeof attachment.content === 'string'
        ? attachment.content
        : toBase64(attachment.content),
    content_type: attachment.contentType,
  };
}
