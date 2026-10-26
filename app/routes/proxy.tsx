// Storefront tracker, served at https://<store>/apps/build-status through the app proxy.
// Returns Liquid so Shopify renders it inside the store's theme.
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import {
  generateUniqueCode,
  isValidEmail,
  normalizeCode,
  normalizeEmail,
} from "../lib/codes.server";
import { sendCodeReminderEmail } from "../lib/email.server";
import { sendWelcome } from "../lib/builds.server";
import { text } from "../lib/forms.server";
import { renderHome, renderSignedUp, renderStatus } from "../lib/tracker-page";

function proxyContext(request: Request) {
  const url = new URL(request.url);
  return {
    shop: url.searchParams.get("shop") ?? "",
    // Merchants can rename the proxy path, so always link back via what Shopify tells us.
    action: url.searchParams.get("path_prefix") || "/apps/build-status",
  };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { liquid } = await authenticate.public.appProxy(request);
  const { action } = proxyContext(request);
  return liquid(renderHome(action));
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { liquid } = await authenticate.public.appProxy(request);
  const { shop, action } = proxyContext(request);
  const form = await request.formData();
  const intent = text(form, "intent");
  const email = normalizeEmail(text(form, "email"));

  if (intent === "lookup") {
    const code = normalizeCode(text(form, "code"));
    const build = await db.build.findFirst({
      where: { shop, code, email },
      include: {
        updates: { where: { public: true }, orderBy: { createdAt: "desc" } },
      },
    });
    if (!build) {
      return liquid(
        renderHome(action, {
          error: "We couldn't find a build with that code and email. Double-check both and try again.",
          code: text(form, "code"),
          email,
        }),
      );
    }
    return liquid(renderStatus(action, build));
  }

  if (intent === "signup") {
    // Honeypot: real people never see or fill this field.
    if (text(form, "website")) return liquid(renderSignedUp(action, "MK-000000", false));

    const name = text(form, "name").slice(0, 120);
    if (!name || !isValidEmail(email)) {
      return liquid(renderHome(action, { error: "Please enter your name and a valid email." }));
    }
    const build = await db.build.create({
      data: {
        shop,
        code: await generateUniqueCode(),
        name,
        email,
        phone: text(form, "phone").slice(0, 40) || null,
        project: text(form, "project").slice(0, 500) || null,
        status: "waitlist",
        updates: { create: { status: "waitlist", message: null } },
      },
    });
    const emailError = await sendWelcome(build);
    return liquid(renderSignedUp(action, build.code, !emailError));
  }

  if (intent === "remind") {
    if (isValidEmail(email)) {
      const builds = await db.build.findMany({
        where: { shop, email },
        orderBy: { createdAt: "desc" },
      });
      if (builds.length > 0) {
        try {
          await sendCodeReminderEmail(email, builds);
        } catch (error) {
          console.error(`Failed to send code reminder to ${email}:`, error);
        }
      }
    }
    // Same answer either way so this can't be used to discover who has a build.
    return liquid(
      renderHome(action, {
        info: "If that email has a build with us, we've sent its code. Check your inbox.",
      }),
    );
  }

  return liquid(renderHome(action));
};
