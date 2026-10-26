import { useEffect } from "react";
import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Form, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { BuildFields } from "../components/BuildFields";
import { emailConfigured, recordUpdate, sendWelcome } from "../lib/builds.server";
import { parseBuildFields, text } from "../lib/forms.server";
import { quickActions } from "../lib/flow";
import {
  STAGES,
  getStage,
  isStageKey,
  parseOptionalStages,
  stagesForBuild,
  statusLabel,
} from "../lib/stages";

async function loadBuild(request: Request, id: string | undefined) {
  const { session } = await authenticate.admin(request);
  const build = await db.build.findFirst({
    where: { id: Number(id), shop: session.shop },
  });
  if (!build) throw new Response("Build not found", { status: 404 });
  return build;
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const build = await loadBuild(request, params.id);
  const updates = await db.buildUpdate.findMany({
    where: { buildId: build.id },
    orderBy: { createdAt: "desc" },
  });
  const url = new URL(request.url);

  return {
    build: {
      ...build,
      optionalStages: parseOptionalStages(build.optionalStages),
      rawOptionalStages: build.optionalStages,
      statusLabel: statusLabel(build.status, build.revisionRound),
      createdAt: build.createdAt.toISOString(),
      updatedAt: build.updatedAt.toISOString(),
    },
    stages: stagesForBuild(build.optionalStages),
    quickActions: quickActions(build.status, build.optionalStages),
    updates: updates.map((u) => ({
      id: u.id,
      status: u.status,
      statusLabel: getStage(u.status).label,
      message: u.message,
      public: u.public,
      emailedAt: u.emailedAt?.toISOString() ?? null,
      emailError: u.emailError,
      createdAt: u.createdAt.toISOString(),
    })),
    emailReady: emailConfigured(),
    welcomeError: url.searchParams.get("welcomeError"),
  };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const build = await loadBuild(request, params.id);
  const form = await request.formData();
  const intent = text(form, "intent");

  if (intent === "update") {
    const status = text(form, "status");
    const message = text(form, "message") || null;
    if (!isStageKey(status)) return { ok: false, error: "Pick a valid stage" };
    if (status === build.status && !message) {
      return { ok: false, error: "Change the stage or write a message first" };
    }
    const result = await recordUpdate({
      build,
      status,
      message,
      isPublic: !form.has("internal"),
      notify: form.has("notify"),
    });
    return {
      ok: true,
      toast: result.emailed ? "Update saved and emailed to customer" : "Update saved",
      error: result.emailError ? `Email failed: ${result.emailError}` : null,
    };
  }

  if (intent === "details") {
    const { data, errors } = parseBuildFields(form);
    if (errors) return { ok: false, errors };
    const optional = new Set(parseOptionalStages(data.optionalStages));
    const current = getStage(build.status);
    if (current.optional && !optional.has(current.key)) {
      return {
        ok: false,
        error: `This build is currently in "${current.label}". Move it to another stage before turning that stage off.`,
      };
    }
    await db.build.update({ where: { id: build.id }, data });
    return { ok: true, toast: "Details saved" };
  }

  if (intent === "resend") {
    const error = await sendWelcome({ ...build, emailUpdates: true });
    return error
      ? { ok: false, error: `Email failed: ${error}` }
      : { ok: true, toast: "Build code emailed to customer" };
  }

  if (intent === "delete") {
    await db.build.delete({ where: { id: build.id } });
    return redirect("/app");
  }

  return { ok: false, error: "Unknown action" };
};

export default function BuildPage() {
  const { build, stages, quickActions, updates, emailReady, welcomeError } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const shopify = useAppBridge();
  const busyIntent =
    navigation.state === "submitting" ? navigation.formData?.get("intent") : null;
  const currentIndex = stages.findIndex((s) => s.key === build.status);

  useEffect(() => {
    if (actionData && "toast" in actionData && actionData.toast) {
      shopify.toast.show(actionData.toast);
    }
  }, [actionData, shopify]);

  const error = actionData && "error" in actionData ? actionData.error : null;
  const fieldErrors = actionData && "errors" in actionData ? actionData.errors : undefined;

  return (
    <s-page heading={build.name}>
      <s-link slot="breadcrumb-actions" href="/app">Builds</s-link>

      {!emailReady && (
        <s-banner tone="warning" heading="Email isn't set up yet">
          Updates are saved and visible on the tracker, but customers won&apos;t get
          emails until SMTP is configured. See <s-link href="/app/setup">Setup</s-link>.
        </s-banner>
      )}
      {welcomeError && (
        <s-banner tone="critical" heading="Welcome email failed">{welcomeError}</s-banner>
      )}
      {error && <s-banner tone="critical">{error}</s-banner>}

      <s-section heading="Current status">
        <s-stack direction="block" gap="base">
          <s-stack direction="inline" gap="small-200" alignItems="center">
            <s-badge tone="info" size="large">
              Step {currentIndex + 1} of {stages.length}
            </s-badge>
            <s-heading>{build.statusLabel}</s-heading>
          </s-stack>
          <s-text color="subdued">{getStage(build.status).description}</s-text>
          {quickActions.length > 0 && (
            <s-stack direction="inline" gap="base">
              {quickActions.map((qa, i) => (
                <Form method="post" key={qa.status}>
                  <input type="hidden" name="intent" value="update" />
                  <input type="hidden" name="status" value={qa.status} />
                  <input type="hidden" name="notify" value="on" />
                  <s-button type="submit" variant={i === 0 ? "primary" : "secondary"}>
                    {qa.label}
                  </s-button>
                </Form>
              ))}
            </s-stack>
          )}
          <s-text color="subdued">
            Quick actions email the customer automatically. Use the form below to add a
            message.
          </s-text>
        </s-stack>
      </s-section>

      <s-section heading="Post an update">
        {/* Keyed so the form clears after each saved update */}
        <Form method="post" key={build.updatedAt + updates.length}>
          <input type="hidden" name="intent" value="update" />
          <s-stack direction="block" gap="base">
            <s-select name="status" label="Stage" value={build.status}>
              {STAGES.filter(
                (s) => !s.optional || build.optionalStages.includes(s.key),
              ).map((stage) => (
                <s-option key={stage.key} value={stage.key}>
                  {stage.label}
                </s-option>
              ))}
            </s-select>
            <s-text-area
              name="message"
              label="Message to customer"
              details="Shown on their tracker and included in the email. Leave blank to only change the stage."
              rows={4}
            />
            <s-checkbox
              name="notify"
              label="Email this update to the customer"
              defaultChecked={build.emailUpdates}
              disabled={!build.emailUpdates}
              details={build.emailUpdates ? undefined : "Email updates are turned off for this build."}
            />
            <s-checkbox
              name="internal"
              label="Internal note only (hide from customer, don't email)"
              details="Only applies when the stage isn't changing."
            />
            <s-stack direction="inline">
              <s-button
                type="submit"
                variant="primary"
                {...(busyIntent === "update" ? { loading: true } : {})}
              >
                Save update
              </s-button>
            </s-stack>
          </s-stack>
        </Form>
      </s-section>

      <s-section heading="Timeline">
        {updates.length === 0 ? (
          <s-paragraph>No updates yet.</s-paragraph>
        ) : (
          <s-stack direction="block" gap="base">
            {updates.map((u) => (
              <s-box key={u.id} padding="base" borderWidth="base" borderRadius="base">
                <s-stack direction="block" gap="small-200">
                  <s-stack direction="inline" gap="small-200" alignItems="center">
                    <s-text type="strong">{u.statusLabel}</s-text>
                    {!u.public && <s-badge>Internal</s-badge>}
                    {u.emailedAt && <s-badge tone="success">Emailed</s-badge>}
                    {u.emailError && <s-badge tone="critical">Email failed</s-badge>}
                    <s-text color="subdued">{new Date(u.createdAt).toLocaleString()}</s-text>
                  </s-stack>
                  {u.message && (
                    <s-paragraph>
                      <span style={{ whiteSpace: "pre-wrap" }}>{u.message}</span>
                    </s-paragraph>
                  )}
                  {u.emailError && <s-text tone="critical">{u.emailError}</s-text>}
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        )}
      </s-section>

      <s-section heading="Customer details">
        <Form method="post" key={`details-${build.updatedAt}`}>
          <input type="hidden" name="intent" value="details" />
          <s-stack direction="block" gap="base">
            <BuildFields values={build} errors={fieldErrors} />
            <s-stack direction="inline">
              <s-button type="submit" {...(busyIntent === "details" ? { loading: true } : {})}>
                Save details
              </s-button>
            </s-stack>
          </s-stack>
        </Form>
      </s-section>

      <s-section slot="aside" heading="Build code">
        <s-stack direction="block" gap="base">
          <s-heading>{build.code}</s-heading>
          <s-text color="subdued">
            The customer enters this code and their email on the storefront tracker.
          </s-text>
          <Form method="post">
            <input type="hidden" name="intent" value="resend" />
            <s-button type="submit" {...(busyIntent === "resend" ? { loading: true } : {})}>
              Email code to customer
            </s-button>
          </Form>
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="Progress">
        <s-stack direction="block" gap="small-200">
          {stages.map((stage, i) => (
            <s-stack key={stage.key} direction="inline" gap="small-200" alignItems="center">
              <s-icon
                type={i < currentIndex ? "check-circle-filled" : i === currentIndex ? "in-progress" : "circle"}
                tone={i < currentIndex ? "success" : i === currentIndex ? "info" : "neutral"}
              />
              <s-text type={i === currentIndex ? "strong" : "generic"}>{stage.label}</s-text>
            </s-stack>
          ))}
          {build.revisionRound > 0 && (
            <s-text color="subdued">Design revisions so far: {build.revisionRound}</s-text>
          )}
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="Danger zone">
        <Form
          method="post"
          onSubmit={(event) => {
            if (!confirm(`Delete ${build.name}'s build and its history? This can't be undone.`)) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="intent" value="delete" />
          <s-button type="submit" tone="critical">Delete build</s-button>
        </Form>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
