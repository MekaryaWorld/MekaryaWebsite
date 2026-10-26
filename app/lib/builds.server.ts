import type { Build } from "@prisma/client";
import db from "../db.server";
import { emailConfigured, sendStatusEmail, sendWelcomeEmail } from "./email.server";
import type { StageKey } from "./stages";

interface RecordUpdateInput {
  build: Build;
  status: StageKey;
  message: string | null;
  isPublic: boolean;
  notify: boolean;
}

export interface RecordUpdateResult {
  emailed: boolean;
  emailError: string | null;
}

// Saves a status change and/or message and emails the customer when asked to.
export async function recordUpdate({
  build,
  status,
  message,
  isPublic,
  notify,
}: RecordUpdateInput): Promise<RecordUpdateResult> {
  const statusChanged = status !== build.status;
  if (!statusChanged && !message) {
    return { emailed: false, emailError: null };
  }

  // Each time a build goes back into revision, that's a new design round.
  const revisionRound =
    statusChanged && status === "revision"
      ? build.revisionRound + 1
      : build.revisionRound;

  const updated = statusChanged
    ? await db.build.update({
        where: { id: build.id },
        data: { status, revisionRound },
      })
    : build;

  const update = await db.buildUpdate.create({
    data: {
      buildId: build.id,
      status,
      message,
      // A status change is always visible to the customer; only notes can be private.
      public: statusChanged || isPublic,
    },
  });

  const shouldEmail = notify && update.public && updated.emailUpdates;
  if (!shouldEmail) return { emailed: false, emailError: null };

  try {
    await sendStatusEmail(updated, message, statusChanged);
    await db.buildUpdate.update({
      where: { id: update.id },
      data: { emailedAt: new Date() },
    });
    return { emailed: true, emailError: null };
  } catch (error) {
    const emailError = error instanceof Error ? error.message : String(error);
    console.error(`Failed to email ${updated.email} for ${updated.code}:`, error);
    await db.buildUpdate.update({ where: { id: update.id }, data: { emailError } });
    return { emailed: false, emailError };
  }
}

export async function sendWelcome(build: Build): Promise<string | null> {
  if (!build.emailUpdates) return null;
  try {
    await sendWelcomeEmail(build);
    return null;
  } catch (error) {
    console.error(`Failed to send welcome email to ${build.email}:`, error);
    return error instanceof Error ? error.message : String(error);
  }
}

export { emailConfigured };
