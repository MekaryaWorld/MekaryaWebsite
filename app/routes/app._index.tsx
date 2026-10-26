import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Form, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import type { Prisma } from "@prisma/client";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { STAGES, getStage, isStageKey, stagesForBuild, statusLabel } from "../lib/stages";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const status = url.searchParams.get("status") ?? "";

  const where: Prisma.BuildWhereInput = { shop: session.shop };
  if (isStageKey(status)) where.status = status;
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { email: { contains: q.toLowerCase() } },
      { code: { contains: q.toUpperCase() } },
      { project: { contains: q } },
    ];
  }

  const [builds, counts] = await Promise.all([
    db.build.findMany({ where, orderBy: { updatedAt: "desc" }, take: 250 }),
    db.build.groupBy({
      by: ["status"],
      where: { shop: session.shop },
      _count: { _all: true },
    }),
  ]);

  return {
    q,
    status,
    total: counts.reduce((sum, c) => sum + c._count._all, 0),
    counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])),
    builds: builds.map((b) => {
      const stages = stagesForBuild(b.optionalStages);
      return {
        id: b.id,
        code: b.code,
        name: b.name,
        email: b.email,
        project: b.project,
        status: b.status,
        statusLabel: statusLabel(b.status, b.revisionRound),
        step: stages.findIndex((s) => s.key === b.status) + 1,
        totalSteps: stages.length,
        updatedAt: b.updatedAt.toISOString(),
      };
    }),
  };
};

type Tone = "neutral" | "info" | "success" | "caution" | "warning";

function toneFor(status: string): Tone {
  const stage = getStage(status);
  if (stage.key === "waitlist") return "neutral";
  if (stage.key === "design_review") return "warning";
  if (stage.designCycle) return "caution";
  if (stage.key === "test_fit" || stage.key === "final_finish") return "success";
  return "info";
}

export default function BuildsIndex() {
  const { builds, counts, total, q, status } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Customer builds">
      <s-button slot="primary-action" variant="primary" href="/app/builds/new">
        Add build
      </s-button>

      <s-section heading="Pipeline">
        <s-stack direction="inline" gap="small-200">
          <s-link href="/app">
            <s-badge tone={status ? "neutral" : "info"}>All · {total}</s-badge>
          </s-link>
          {STAGES.map((stage) => (
            <s-link key={stage.key} href={`/app?status=${stage.key}`}>
              <s-badge tone={status === stage.key ? "info" : "neutral"}>
                {stage.label} · {counts[stage.key] ?? 0}
              </s-badge>
            </s-link>
          ))}
        </s-stack>
      </s-section>

      <s-section padding="none">
        <Form method="get">
          {status && <input type="hidden" name="status" value={status} />}
          <s-box padding="base">
            <s-stack direction="inline" gap="base" alignItems="end">
              <s-search-field
                name="q"
                label="Search builds"
                labelAccessibilityVisibility="exclusive"
                placeholder="Search by name, email, code or project"
                defaultValue={q}
              />
              <s-button type="submit">Search</s-button>
            </s-stack>
          </s-box>
        </Form>

        {builds.length === 0 ? (
          <s-box padding="base">
            <s-paragraph>
              {total === 0
                ? "No builds yet. Add one here, or share the storefront sign-up page so customers can join the waitlist."
                : "No builds match this filter."}
            </s-paragraph>
          </s-box>
        ) : (
          <s-table>
            <s-table-header-row>
              <s-table-header listSlot="primary">Customer</s-table-header>
              <s-table-header>Code</s-table-header>
              <s-table-header listSlot="secondary">Project</s-table-header>
              <s-table-header listSlot="inline">Status</s-table-header>
              <s-table-header>Last updated</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {builds.map((b) => (
                <s-table-row key={b.id}>
                  <s-table-cell>
                    <s-stack direction="block" gap="none">
                      <s-link href={`/app/builds/${b.id}`}>{b.name}</s-link>
                      <s-text color="subdued">{b.email}</s-text>
                    </s-stack>
                  </s-table-cell>
                  <s-table-cell>{b.code}</s-table-cell>
                  <s-table-cell>{b.project || "—"}</s-table-cell>
                  <s-table-cell>
                    <s-badge tone={toneFor(b.status)}>
                      {b.step}/{b.totalSteps} · {b.statusLabel}
                    </s-badge>
                  </s-table-cell>
                  <s-table-cell>
                    {new Date(b.updatedAt).toLocaleDateString()}
                  </s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        )}
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
