import type {
  EmailAttachment,
  EmailConfigs,
  EmailMessage,
  EmailProvider,
  EmailSendResult,
} from '.';

type CloudflareEmailAddress = string | { name?: string; email: string };
type CloudflareEmailRecipient =
  | CloudflareEmailAddress
  | CloudflareEmailAddress[];

type CloudflareEmailAttachment = {
  disposition: 'attachment';
  filename: string;
  type: string;
  content: string | ArrayBuffer | ArrayBufferView;
};

type CloudflareEmailPayload = {
  from: CloudflareEmailAddress;
  to: CloudflareEmailRecipient;
  subject: string;
  replyTo?: CloudflareEmailAddress;
  cc?: CloudflareEmailRecipient;
  bcc?: CloudflareEmailRecipient;
  headers?: Record<string, string>;
  text?: string;
  html?: string;
  attachments?: CloudflareEmailAttachment[];
};

type CloudflareSendEmailBinding = {
  send(message: CloudflareEmailPayload): Promise<{ messageId: string }>;
};

export interface CloudflareEmailConfigs extends EmailConfigs {
  bindingName?: string;
  defaultFrom: string;
}

export class CloudflareEmailProvider implements EmailProvider {
  readonly name = 'cloudflare';
  configs: CloudflareEmailConfigs;

  constructor(configs: CloudflareEmailConfigs) {
    this.configs = configs;
  }

  async sendEmail(email: EmailMessage): Promise<EmailSendResult> {
    try {
      const from = email.from || this.configs.defaultFrom;
      if (!from) {
        return {
          success: false,
          error: 'Transactional email sender is not configured',
          provider: this.name,
        };
      }

      const payload: CloudflareEmailPayload = {
        from: parseEmailAddress(from),
        to: parseEmailRecipients(email.to),
        subject: email.subject,
      };

      if (email.cc) {
        payload.cc = parseEmailRecipients(email.cc);
      }
      if (email.bcc) {
        payload.bcc = parseEmailRecipients(email.bcc);
      }
      if (email.text) {
        payload.text = email.text;
      }
      if (email.html) {
        payload.html = email.html;
      }
      if (email.replyTo) {
        payload.replyTo = parseEmailAddress(email.replyTo);
      }
      if (email.headers) {
        payload.headers = email.headers;
      }
      if (email.attachments?.length) {
        payload.attachments = email.attachments.map(toCloudflareAttachment);
      }

      const binding = await this.getBinding();
      const result = await binding.send(payload);

      return {
        success: true,
        messageId: result.messageId,
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

  private async getBinding(): Promise<CloudflareSendEmailBinding> {
    const bindingName = this.configs.bindingName || 'EMAIL';
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const { env } = await getCloudflareContext({ async: true });
    const binding = (env as Record<string, unknown>)[bindingName];

    if (
      !binding ||
      typeof (binding as CloudflareSendEmailBinding).send !== 'function'
    ) {
      throw new Error(
        `Transactional email binding "${bindingName}" is not configured`
      );
    }

    return binding as CloudflareSendEmailBinding;
  }
}

export function createCloudflareEmailProvider(
  configs: CloudflareEmailConfigs
): CloudflareEmailProvider {
  return new CloudflareEmailProvider(configs);
}

function parseEmailRecipients(
  recipient: string | string[]
): CloudflareEmailRecipient {
  if (Array.isArray(recipient)) {
    return recipient.map(parseEmailAddress);
  }

  return parseEmailAddress(recipient);
}

function parseEmailAddress(address: string): CloudflareEmailAddress {
  const trimmed = address.trim();
  const match = trimmed.match(/^"?([^"<]*)"?\s*<([^<>\s]+@[^<>\s]+)>$/);

  if (!match) {
    return trimmed;
  }

  const name = match[1]?.trim();
  const email = match[2].trim();

  return name ? { name, email } : { email };
}

function toCloudflareAttachment(
  attachment: EmailAttachment
): CloudflareEmailAttachment {
  return {
    disposition: 'attachment',
    filename: attachment.filename,
    type: attachment.contentType || 'application/octet-stream',
    content: attachment.content,
  };
}
