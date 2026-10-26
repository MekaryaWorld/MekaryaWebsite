import nodemailer from "nodemailer";
import type { Build } from "@prisma/client";
import { getStage, stagesForBuild, statusLabel } from "./stages";
import { escapeHtml } from "./html";

let transporter: nodemailer.Transporter | null = null;

export function emailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.EMAIL_FROM);
}

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE
        ? process.env.SMTP_SECURE === "true"
        : port === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }
  return transporter;
}

async function send(to: string, subject: string, html: string, text: string) {
  if (!emailConfigured()) {
    throw new Error("Email is not configured (set SMTP_HOST and EMAIL_FROM)");
  }
  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM,
    replyTo: process.env.EMAIL_REPLY_TO || undefined,
    to,
    subject,
    html,
    text,
  });
}

function trackerUrl(): string | null {
  return process.env.TRACKER_URL || null;
}

function layout(title: string, body: string): string {
  const url = trackerUrl();
  const button = url
    ? `<p style="margin:24px 0"><a href="${escapeHtml(url)}" style="background:#111;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block">Check your build status</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111">
<div style="max-width:560px;margin:0 auto;padding:32px 16px">
<div style="background:#fff;border-radius:10px;padding:28px">
<h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(title)}</h1>
${body}
${button}
</div></div></body></html>`;
}

function progressLine(build: Build): string {
  const stages = stagesForBuild(build.optionalStages);
  const idx = stages.findIndex((s) => s.key === build.status);
  return `Step ${idx + 1} of ${stages.length}`;
}

function codeBlock(build: Build): string {
  return `<p style="font-size:14px;color:#555">Your build code: <strong style="font-family:monospace;font-size:16px;color:#111">${escapeHtml(build.code)}</strong><br>Use it with this email address to check your status any time.</p>`;
}

export async function sendStatusEmail(
  build: Build,
  message: string | null,
  statusChanged: boolean,
) {
  const stage = getStage(build.status);
  const label = statusLabel(build.status, build.revisionRound);
  const subject = statusChanged
    ? `Your build is now: ${label}`
    : `New update on your build (${build.code})`;

  const messageHtml = message
    ? `<div style="border-left:3px solid #111;padding:4px 0 4px 14px;margin:16px 0;white-space:pre-wrap">${escapeHtml(message)}</div>`
    : "";
  const html = layout(
    subject,
    `<p>Hi ${escapeHtml(build.name)},</p>
<p style="margin:0 0 4px;font-size:13px;color:#555;text-transform:uppercase;letter-spacing:.05em">${escapeHtml(progressLine(build))}</p>
<p style="font-size:18px;font-weight:600;margin:0 0 6px">${escapeHtml(label)}</p>
<p style="margin:0;color:#444">${escapeHtml(stage.description)}</p>
${messageHtml}
${codeBlock(build)}`,
  );
  const text = [
    `Hi ${build.name},`,
    "",
    `${progressLine(build)}: ${label}`,
    stage.description,
    message ? `\n${message}\n` : "",
    `Build code: ${build.code}`,
    trackerUrl() ? `Check your status: ${trackerUrl()}` : "",
  ].join("\n");

  await send(build.email, subject, html, text);
}

export async function sendWelcomeEmail(build: Build) {
  const subject = `You're on the list! Your build code is ${build.code}`;
  const html = layout(
    "You're on the list!",
    `<p>Hi ${escapeHtml(build.name)},</p>
<p>Thanks for signing up. We'll email you every time your build moves forward.</p>
${codeBlock(build)}`,
  );
  const text = [
    `Hi ${build.name},`,
    "",
    "Thanks for signing up. We'll email you every time your build moves forward.",
    "",
    `Build code: ${build.code}`,
    trackerUrl() ? `Check your status: ${trackerUrl()}` : "",
  ].join("\n");
  await send(build.email, subject, html, text);
}

export async function sendCodeReminderEmail(email: string, builds: Build[]) {
  const subject = "Your build code";
  const list = builds
    .map(
      (b) =>
        `<li><strong style="font-family:monospace">${escapeHtml(b.code)}</strong>${b.project ? ` — ${escapeHtml(b.project)}` : ""}</li>`,
    )
    .join("");
  const html = layout(
    subject,
    `<p>Here ${builds.length === 1 ? "is the build code" : "are the build codes"} linked to this email address:</p><ul>${list}</ul>`,
  );
  const text = builds
    .map((b) => `${b.code}${b.project ? ` — ${b.project}` : ""}`)
    .join("\n");
  await send(email, subject, html, `Your build codes:\n${text}`);
}
