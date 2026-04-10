import { env } from "../../config/env.ts";
import { DEFAULT_APP_URL } from "../../shared/constants/app.ts";

interface EmailTemplate {
  html: string;
  subject: string;
}

interface ReleaseNotificationTemplateInput {
  repo: string;
  tag: string;
  unsubscribeToken: string;
}

const appUrl = env.APP_URL ?? DEFAULT_APP_URL;

const buildConfirmUrl = (confirmToken: string) =>
  `${appUrl}/api/confirm/${encodeURIComponent(confirmToken)}`;

const buildReleaseUrl = (repo: string, tag: string) =>
  `https://github.com/${repo}/releases/tag/${encodeURIComponent(tag)}`;

const buildUnsubscribeUrl = (unsubscribeToken: string) =>
  `${appUrl}/api/unsubscribe/${encodeURIComponent(unsubscribeToken)}`;

export const renderConfirmationEmailTemplate = (
  confirmToken: string
): EmailTemplate => {
  const confirmUrl = buildConfirmUrl(confirmToken);

  return {
    subject: "Підтвердіть підписку на GitHub релізи",
    html: `<!DOCTYPE html>
<html lang="uk">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Підтвердження підписки</title>
  </head>
  <body style="margin:0;padding:24px 12px;background:#f4f4f5;font-family:Arial,sans-serif;color:#18181b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:32px;">
            <tr>
              <td>
                <h1 style="margin:0 0 16px;font-size:28px;line-height:1.3;">Підтвердження підписки</h1>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">
                  Підтвердьте підписку, щоб отримувати сповіщення про нові релізи GitHub-репозиторіїв.
                </p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">
                  Натисніть кнопку нижче, щоб активувати підписку.
                </p>
                <a href="${confirmUrl}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#e66a26;color:#ffffff;text-decoration:none;font-weight:700;">
                  Підтвердити підписку
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
};

export const renderReleaseNotificationTemplate = ({
  repo,
  tag,
  unsubscribeToken,
}: ReleaseNotificationTemplateInput): EmailTemplate => {
  const releaseUrl = buildReleaseUrl(repo, tag);
  const unsubscribeUrl = buildUnsubscribeUrl(unsubscribeToken);

  return {
    subject: `Новий реліз ${repo}: ${tag}`,
    html: `<!DOCTYPE html>
<html lang="uk">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Новий реліз</title>
  </head>
  <body style="margin:0;padding:24px 12px;background:#f4f4f5;font-family:Arial,sans-serif;color:#18181b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:32px;">
            <tr>
              <td>
                <h1 style="margin:0 0 16px;font-size:28px;line-height:1.3;">Новий реліз</h1>
                <p style="margin:0 0 12px;font-size:16px;line-height:1.6;">
                  У репозиторії <strong>${repo}</strong> з'явився новий реліз.
                </p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">
                  Поточний тег: <strong>${tag}</strong>
                </p>
                <a href="${releaseUrl}" style="display:inline-block;margin:0 12px 12px 0;padding:12px 20px;border-radius:10px;background:#e66a26;color:#ffffff;text-decoration:none;font-weight:700;">
                  Переглянути реліз
                </a>
                <a href="${unsubscribeUrl}" style="display:inline-block;margin:0 0 12px;padding:12px 20px;border-radius:10px;background:#18181b;color:#ffffff;text-decoration:none;font-weight:700;">
                  Відписатися
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
};
