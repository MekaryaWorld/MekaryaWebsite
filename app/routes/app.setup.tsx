import { useEffect } from "react";
import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { emailConfigured, sendWelcome } from "../lib/builds.server";
import { isValidEmail, normalizeEmail } from "../lib/codes.server";
import { text } from "../lib/forms.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  return {
    emailReady: emailConfigured(),
    from: process.env.EMAIL_FROM ?? null,
    trackerUrl: process.env.TRACKER_URL || `https://${session.shop}/apps/build-status`,
    trackerUrlFromEnv: Boolean(process.env.TRACKER_URL),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const email = normalizeEmail(text(await request.formData(), "email"));
  if (!isValidEmail(email)) return { error: "Enter a valid email", toast: null };

  const now = new Date();
  const error = await sendWelcome({
    id: 0,
    shop: session.shop,
    code: "MK-TEST00",
    name: "Test customer",
    email,
    phone: null,
    project: null,
    notes: null,
    status: "waitlist",
    revisionRound: 0,
    optionalStages: "",
    emailUpdates: true,
    createdAt: now,
    updatedAt: now,
  });
  return error
    ? { error: `Email failed: ${error}`, toast: null }
    : { error: null, toast: `Test email sent to ${email}` };
};

export default function Setup() {
  const { emailReady, from, trackerUrl, trackerUrlFromEnv } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const shopify = useAppBridge();

  useEffect(() => {
    if (actionData?.toast) shopify.toast.show(actionData.toast);
  }, [actionData, shopify]);

  return (
    <s-page heading="Setup">
      <s-section heading="Customer tracker page">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Customers sign up for the waitlist and check their build status here:
          </s-paragraph>
          <s-link href={trackerUrl} target="_blank">{trackerUrl}</s-link>
          <s-paragraph>
            Add it to your store menu in <s-text type="strong">Online Store → Navigation</s-text>{" "}
            (link to the URL above, e.g. as &quot;Build Status&quot;).
          </s-paragraph>
          {!trackerUrlFromEnv && (
            <s-text color="subdued">
              Using your myshopify.com domain. Set TRACKER_URL to your custom domain so links in
              emails use it.
            </s-text>
          )}
        </s-stack>
      </s-section>

      <s-section heading="Email">
        <s-stack direction="block" gap="base">
          {emailReady ? (
            <s-banner tone="success">Email is configured. Sending from {from}.</s-banner>
          ) : (
            <s-banner tone="warning" heading="Email isn't configured">
              Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and EMAIL_FROM in the app&apos;s
              environment (see .env.example), then restart the app.
            </s-banner>
          )}
          {actionData?.error && <s-banner tone="critical">{actionData.error}</s-banner>}
          <Form method="post">
            <s-stack direction="inline" gap="base" alignItems="end">
              <s-email-field name="email" label="Send a test email to" />
              <s-button
                type="submit"
                disabled={!emailReady}
                {...(navigation.state === "submitting" ? { loading: true } : {})}
              >
                Send test
              </s-button>
            </s-stack>
          </Form>
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="How it works">
        <s-unordered-list>
          <s-list-item>Customers join the waitlist on the tracker page and get a build code by email.</s-list-item>
          <s-list-item>You add or update builds under Builds. Every stage change or message is emailed automatically.</s-list-item>
          <s-list-item>Customers enter their code + email on the tracker to see progress and your messages.</s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
