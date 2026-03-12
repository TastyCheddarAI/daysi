/**
 * Email service — AWS SES
 *
 * All outbound email flows through this module. Add new templates here.
 * If SES_FROM_EMAIL is not configured, email sending is silently skipped so
 * the API works without email in development/bootstrap mode.
 */

import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

import type { AppEnv } from "./config";

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

let _sesClient: SESClient | null = null;

const getSesClient = (region: string): SESClient => {
  if (!_sesClient) {
    _sesClient = new SESClient({ region });
  }
  return _sesClient;
};

// ---------------------------------------------------------------------------
// Core send
// ---------------------------------------------------------------------------

interface EmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

const sendEmail = async (env: AppEnv, input: EmailInput): Promise<void> => {
  if (!env.SES_FROM_EMAIL) {
    // Not configured — skip silently in bootstrap/dev mode
    return;
  }

  const fromName = env.SES_FROM_NAME ?? env.DAYSI_PUBLIC_BRAND_NAME;
  const from = `${fromName} <${env.SES_FROM_EMAIL}>`;
  const client = getSesClient(env.AWS_REGION);

  await client.send(
    new SendEmailCommand({
      Source: from,
      Destination: { ToAddresses: [input.to] },
      Message: {
        Subject: { Data: input.subject, Charset: "UTF-8" },
        Body: {
          Html: { Data: input.html, Charset: "UTF-8" },
          Text: { Data: input.text, Charset: "UTF-8" },
        },
      },
    }),
  );
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCurrency = (amountCents: number, currency = "CAD"): string =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(amountCents / 100);

const formatDate = (isoString: string): string =>
  new Date(isoString).toLocaleDateString("en-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const formatTime = (isoString: string): string =>
  new Date(isoString).toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Winnipeg",
  });

const emailWrapper = (brandName: string, content: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${brandName}</title>
</head>
<body style="margin:0;padding:0;background:#f9f5f2;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f5f2;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:#1a0a0a;padding:28px 40px;text-align:center;">
              <span style="color:#f7e4d4;font-size:24px;font-weight:700;letter-spacing:0.05em;">${brandName}</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9f5f2;padding:24px 40px;text-align:center;border-top:1px solid #ede8e3;">
              <p style="margin:0;font-size:12px;color:#9e9e9e;">
                ${brandName} · Niverville, MB · Canada
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:#9e9e9e;">
                You received this email because you have an appointment or account with us.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export interface BookingConfirmationParams {
  customerName: string;
  customerEmail: string;
  serviceName: string;
  providerName: string;
  locationName: string;
  startTime: string; // ISO string
  durationMinutes: number;
  bookingCode: string;
  managementToken?: string;
  brandName: string;
}

export const sendBookingConfirmation = async (
  env: AppEnv,
  params: BookingConfirmationParams,
): Promise<void> => {
  const subject = `Your ${params.serviceName} appointment is confirmed — ${formatDate(params.startTime)}`;

  const html = emailWrapper(
    params.brandName,
    `
    <h2 style="margin:0 0 8px;font-size:22px;color:#1a0a0a;">You're booked!</h2>
    <p style="margin:0 0 28px;font-size:15px;color:#666;">Here are your appointment details.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #ede8e3;border-radius:8px;overflow:hidden;margin-bottom:28px;">
      <tr style="background:#fdf8f5;">
        <td style="padding:16px 20px;border-bottom:1px solid #ede8e3;">
          <p style="margin:0;font-size:12px;color:#9e9e9e;text-transform:uppercase;letter-spacing:0.08em;">Service</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#1a0a0a;">${params.serviceName}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 20px;border-bottom:1px solid #ede8e3;">
          <p style="margin:0;font-size:12px;color:#9e9e9e;text-transform:uppercase;letter-spacing:0.08em;">Date &amp; Time</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#1a0a0a;">${formatDate(params.startTime)}</p>
          <p style="margin:2px 0 0;font-size:14px;color:#555;">${formatTime(params.startTime)} · ${params.durationMinutes} min</p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 20px;border-bottom:1px solid #ede8e3;">
          <p style="margin:0;font-size:12px;color:#9e9e9e;text-transform:uppercase;letter-spacing:0.08em;">Provider</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#1a0a0a;">${params.providerName}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0;font-size:12px;color:#9e9e9e;text-transform:uppercase;letter-spacing:0.08em;">Location</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#1a0a0a;">${params.locationName}</p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 4px;font-size:13px;color:#9e9e9e;">Booking reference: <strong style="color:#555;">${params.bookingCode}</strong></p>
    <p style="margin:0 0 28px;font-size:14px;color:#666;">Questions? Reply to this email or call us and we'll be happy to help.</p>

    <p style="margin:0;font-size:14px;color:#888;">See you soon,<br /><strong style="color:#1a0a0a;">${params.brandName} Team</strong></p>
    `,
  );

  const text = [
    `You're booked — ${params.serviceName}`,
    ``,
    `Date: ${formatDate(params.startTime)}`,
    `Time: ${formatTime(params.startTime)} (${params.durationMinutes} min)`,
    `Provider: ${params.providerName}`,
    `Location: ${params.locationName}`,
    `Reference: ${params.bookingCode}`,
    ``,
    `Questions? Reply to this email.`,
    ``,
    `See you soon,`,
    `${params.brandName} Team`,
  ].join("\n");

  await sendEmail(env, { to: params.customerEmail, subject, html, text });
};

// ---------------------------------------------------------------------------

export interface BookingCancellationParams {
  customerName: string;
  customerEmail: string;
  serviceName: string;
  startTime: string;
  bookingCode: string;
  brandName: string;
}

export const sendBookingCancellation = async (
  env: AppEnv,
  params: BookingCancellationParams,
): Promise<void> => {
  const subject = `Your ${params.serviceName} appointment has been cancelled`;

  const html = emailWrapper(
    params.brandName,
    `
    <h2 style="margin:0 0 8px;font-size:22px;color:#1a0a0a;">Appointment Cancelled</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#666;">
      Your <strong>${params.serviceName}</strong> appointment on <strong>${formatDate(params.startTime)}</strong> at <strong>${formatTime(params.startTime)}</strong> has been cancelled.
    </p>
    <p style="margin:0 0 8px;font-size:13px;color:#9e9e9e;">Reference: <strong style="color:#555;">${params.bookingCode}</strong></p>
    <p style="margin:0 0 28px;font-size:14px;color:#666;">
      If you didn't request this cancellation or would like to rebook, please reply to this email or give us a call.
    </p>
    <p style="margin:0;font-size:14px;color:#888;">
      ${params.brandName} Team
    </p>
    `,
  );

  const text = [
    `Appointment Cancelled — ${params.serviceName}`,
    ``,
    `Your appointment on ${formatDate(params.startTime)} at ${formatTime(params.startTime)} has been cancelled.`,
    `Reference: ${params.bookingCode}`,
    ``,
    `If you'd like to rebook, please contact us.`,
    ``,
    `${params.brandName} Team`,
  ].join("\n");

  await sendEmail(env, { to: params.customerEmail, subject, html, text });
};

// ---------------------------------------------------------------------------

export interface OrderConfirmationParams {
  customerName: string;
  customerEmail: string;
  orderCode: string;
  lineItems: Array<{ name: string; amountCents: number; quantity?: number }>;
  totalAmountCents: number;
  currency: string;
  brandName: string;
}

export const sendOrderConfirmation = async (
  env: AppEnv,
  params: OrderConfirmationParams,
): Promise<void> => {
  const subject = `Order confirmed — ${params.orderCode}`;

  const lineItemRows = params.lineItems
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #ede8e3;font-size:14px;color:#333;">
          ${item.name}${item.quantity && item.quantity > 1 ? ` × ${item.quantity}` : ""}
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #ede8e3;font-size:14px;color:#333;text-align:right;">
          ${formatCurrency(item.amountCents, params.currency)}
        </td>
      </tr>`,
    )
    .join("");

  const html = emailWrapper(
    params.brandName,
    `
    <h2 style="margin:0 0 8px;font-size:22px;color:#1a0a0a;">Order Confirmed</h2>
    <p style="margin:0 0 28px;font-size:15px;color:#666;">Thank you for your order!</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      ${lineItemRows}
      <tr>
        <td style="padding:16px 0 0;font-size:15px;font-weight:700;color:#1a0a0a;">Total</td>
        <td style="padding:16px 0 0;font-size:15px;font-weight:700;color:#1a0a0a;text-align:right;">
          ${formatCurrency(params.totalAmountCents, params.currency)}
        </td>
      </tr>
    </table>

    <p style="margin:24px 0 0;font-size:13px;color:#9e9e9e;">Order reference: <strong style="color:#555;">${params.orderCode}</strong></p>
    `,
  );

  const lineItemText = params.lineItems
    .map(
      (item) =>
        `  ${item.name}${item.quantity && item.quantity > 1 ? ` × ${item.quantity}` : ""} — ${formatCurrency(item.amountCents, params.currency)}`,
    )
    .join("\n");

  const text = [
    `Order Confirmed — ${params.orderCode}`,
    ``,
    lineItemText,
    ``,
    `Total: ${formatCurrency(params.totalAmountCents, params.currency)}`,
    ``,
    `${params.brandName} Team`,
  ].join("\n");

  await sendEmail(env, { to: params.customerEmail, subject, html, text });
};

// ---------------------------------------------------------------------------

export interface MembershipWelcomeParams {
  customerName: string;
  customerEmail: string;
  planName: string;
  billingCycleCents: number;
  currency: string;
  brandName: string;
}

export const sendMembershipWelcome = async (
  env: AppEnv,
  params: MembershipWelcomeParams,
): Promise<void> => {
  const subject = `Welcome to ${params.planName} — your membership is active`;

  const html = emailWrapper(
    params.brandName,
    `
    <h2 style="margin:0 0 8px;font-size:22px;color:#1a0a0a;">Welcome to ${params.planName}!</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#666;">
      Your <strong>${params.planName}</strong> membership is now active at
      <strong>${formatCurrency(params.billingCycleCents, params.currency)}/month</strong>.
      Your member benefits are ready to use.
    </p>
    <p style="margin:0;font-size:14px;color:#888;">
      ${params.brandName} Team
    </p>
    `,
  );

  const text = [
    `Welcome to ${params.planName}!`,
    ``,
    `Your ${params.planName} membership is now active at ${formatCurrency(params.billingCycleCents, params.currency)}/month.`,
    ``,
    `${params.brandName} Team`,
  ].join("\n");

  await sendEmail(env, { to: params.customerEmail, subject, html, text });
};
