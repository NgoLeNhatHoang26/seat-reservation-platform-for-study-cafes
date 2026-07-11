import sgMail from '@sendgrid/mail';
import { env } from '../config/env';

export type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

if (env.NODE_ENV !== 'test' && env.SENDGRID_API_KEY) {
  sgMail.setApiKey(env.SENDGRID_API_KEY);
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  if (env.NODE_ENV === 'test') {
    return;
  }

  if (!env.SENDGRID_API_KEY) {
    console.warn('[sendgrid] SENDGRID_API_KEY missing — skip send', {
      to: params.to,
      subject: params.subject,
    });
    return;
  }

  try {
    await sgMail.send({
      to: params.to,
      from: env.SENDGRID_FROM_EMAIL,
      subject: params.subject,
      html: params.html,
      text: params.text ?? stripHtml(params.html),
    });
  } catch (err: unknown) {
    const statusCode =
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      typeof (err as { code: unknown }).code === 'number'
        ? (err as { code: number }).code
        : undefined;

    if (statusCode !== undefined && statusCode >= 400 && statusCode < 500) {
      const message = err instanceof Error ? err.message : 'SendGrid client error';
      const clientError = new Error(message);
      (clientError as Error & { noRetry?: boolean }).noRetry = true;
      throw clientError;
    }

    throw err;
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
