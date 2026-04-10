import { Resend } from "resend";

import { env } from "../../config/env.ts";
import { AppError } from "../../core/errors/app-error.ts";
import { logger } from "../../core/logger/logger.ts";
import { DEFAULT_RESEND_FROM_EMAIL } from "../../shared/constants/app.ts";
import {
  renderConfirmationEmailTemplate,
  renderReleaseNotificationTemplate,
} from "./notifier.email-templates.ts";

interface SendEmailInput {
  email: string;
  html: string;
  subject: string;
}

const resend = new Resend(env?.RESEND_API_KEY);
const fromEmail = env?.RESEND_FROM_EMAIL ?? DEFAULT_RESEND_FROM_EMAIL;

const sendEmail = async ({
  email,
  html,
  subject,
}: SendEmailInput): Promise<void> => {
  const { data, error } = await resend.emails.send({
    from: fromEmail,
    html,
    subject,
    to: email,
  });

  if (error) {
    logger.error(
      { email, error, fromEmail, subject },
      "failed to send email via Resend"
    );

    throw AppError.serviceUnavailable("Email delivery failed", {
      cause: error,
      details: {
        provider: "resend",
      },
    });
  }

  logger.info(
    { email, fromEmail, resendEmailId: data?.id ?? null, subject },
    "email sent via Resend"
  );
};

const sendConfirmation = async (
  email: string,
  confirmToken: string
): Promise<void> => {
  const template = renderConfirmationEmailTemplate(confirmToken);

  await sendEmail({
    email,
    ...template,
  });
};

const sendReleaseNotification = async (
  email: string,
  repo: string,
  tag: string,
  unsubscribeToken: string
): Promise<void> => {
  const template = renderReleaseNotificationTemplate({
    repo,
    tag,
    unsubscribeToken,
  });

  await sendEmail({
    email,
    ...template,
  });
};

export const notifierService = {
  sendConfirmation,
  sendReleaseNotification,
};
