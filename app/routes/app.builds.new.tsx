import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Form, redirect, useActionData, useNavigation } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { BuildFields } from "../components/BuildFields";
import { generateUniqueCode } from "../lib/codes.server";
import { parseBuildFields, text } from "../lib/forms.server";
import { sendWelcome } from "../lib/builds.server";
import { STAGES, isStageKey } from "../lib/stages";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const { data, errors } = parseBuildFields(form);
  if (errors) return { errors };

  const startStatus = text(form, "status");
  const status = isStageKey(startStatus) ? startStatus : "waitlist";

  const build = await db.build.create({
    data: {
      ...data,
      shop: session.shop,
      code: await generateUniqueCode(),
      status,
      updates: { create: { status, message: null } },
    },
  });

  if (form.has("sendWelcome")) {
    const emailError = await sendWelcome(build);
    if (emailError) {
      return redirect(`/app/builds/${build.id}?welcomeError=${encodeURIComponent(emailError)}`);
    }
  }
  return redirect(`/app/builds/${build.id}`);
};

export default function NewBuild() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const saving = navigation.state === "submitting";

  return (
    <s-page heading="Add build">
      <s-link slot="breadcrumb-actions" href="/app">Builds</s-link>
      <Form method="post">
        <s-section heading="Customer">
          <s-stack direction="block" gap="base">
            <BuildFields errors={actionData?.errors} />
            <s-select name="status" label="Starting stage" value="waitlist">
              {STAGES.map((stage) => (
                <s-option key={stage.key} value={stage.key}>
                  {stage.label}
                </s-option>
              ))}
            </s-select>
            <s-checkbox
              name="sendWelcome"
              label="Send the customer a welcome email with their build code"
              defaultChecked
            />
            <s-stack direction="inline" gap="base">
              <s-button type="submit" variant="primary" {...(saving ? { loading: true } : {})}>
                Create build
              </s-button>
            </s-stack>
          </s-stack>
        </s-section>
      </Form>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
