// HTML for the storefront tracker (served through the app proxy inside the store theme).
import { escapeHtml as e } from "./html";
import { getStage, stagesForBuild, statusLabel } from "./stages";

export interface TrackerBuild {
  code: string;
  name: string;
  project: string | null;
  status: string;
  revisionRound: number;
  optionalStages: string;
  updates: { status: string; message: string | null; createdAt: Date }[];
}

const STYLES = `<style>
.mkt{max-width:880px;margin:0 auto;padding:40px 16px 64px;font-size:16px;line-height:1.5}
.mkt *{box-sizing:border-box}
.mkt h1{margin:0 0 8px}
.mkt h2{margin:0 0 12px;font-size:1.25em}
.mkt .mkt-sub{opacity:.7;margin:0 0 28px}
.mkt-grid{display:grid;gap:20px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
.mkt-card{border:1px solid rgba(127,127,127,.3);border-radius:12px;padding:24px}
.mkt label{display:block;font-size:.9em;font-weight:600;margin:12px 0 4px}
.mkt input,.mkt textarea{width:100%;padding:10px 12px;border:1px solid rgba(127,127,127,.45);border-radius:8px;font:inherit;background:transparent;color:inherit}
.mkt button{margin-top:16px;padding:12px 18px;border:0;border-radius:8px;font:inherit;font-weight:600;cursor:pointer;background:currentColor;width:100%}
.mkt button span{color:#fff;mix-blend-mode:difference}
.mkt-msg{padding:12px 16px;border-radius:8px;margin:0 0 20px;background:rgba(127,127,127,.12)}
.mkt-msg.err{background:rgba(220,38,38,.12)}
.mkt-hp{position:absolute;left:-9999px}
.mkt-code{font-family:ui-monospace,Menlo,monospace;font-size:1.4em;font-weight:700;letter-spacing:.05em}
.mkt-current{border-radius:12px;padding:24px;margin:0 0 28px;background:rgba(127,127,127,.1)}
.mkt-step{font-size:.8em;text-transform:uppercase;letter-spacing:.08em;opacity:.7}
.mkt-bar{height:8px;border-radius:4px;background:rgba(127,127,127,.2);margin:14px 0 0;overflow:hidden}
.mkt-bar div{height:100%;background:currentColor}
.mkt-steps{list-style:none;padding:0;margin:0}
.mkt-steps li{display:flex;gap:12px;align-items:flex-start;padding:8px 0}
.mkt-dot{flex:none;width:22px;height:22px;border-radius:50%;border:2px solid rgba(127,127,127,.5);display:flex;align-items:center;justify-content:center;font-size:12px;margin-top:2px}
.mkt-steps .done .mkt-dot{background:currentColor;border-color:currentColor}
.mkt-steps .done .mkt-dot span{color:#fff;mix-blend-mode:difference}
.mkt-steps .now .mkt-dot{border-color:currentColor;box-shadow:0 0 0 4px rgba(127,127,127,.2)}
.mkt-steps .todo{opacity:.55}
.mkt-steps small{display:block;opacity:.75}
.mkt-tag{display:inline-block;font-size:.75em;padding:1px 8px;border-radius:99px;border:1px solid rgba(127,127,127,.4);margin-left:6px;vertical-align:middle}
.mkt-updates{list-style:none;padding:0;margin:0}
.mkt-updates li{border-left:2px solid rgba(127,127,127,.4);padding:4px 0 16px 16px}
.mkt-updates time{font-size:.85em;opacity:.7}
.mkt-updates p{margin:4px 0 0;white-space:pre-wrap}
.mkt-back{display:inline-block;margin-top:28px}
</style>`;

function page(body: string): string {
  return `${STYLES}<div class="mkt">${body}</div>`;
}

function notice(message: string | undefined, isError = false): string {
  return message ? `<p class="mkt-msg${isError ? " err" : ""}">${e(message)}</p>` : "";
}

function button(label: string): string {
  return `<button type="submit"><span>${e(label)}</span></button>`;
}

export function renderHome(
  action: string,
  opts: { error?: string; info?: string; code?: string; email?: string } = {},
): string {
  return page(`
<h1>Build status</h1>
<p class="mkt-sub">Check where your build is at, or join the waitlist to get started.</p>
${notice(opts.info)}${notice(opts.error, true)}
<div class="mkt-grid">
  <form class="mkt-card" method="post" action="${e(action)}">
    <h2>Check your build</h2>
    <input type="hidden" name="intent" value="lookup">
    <label for="mkt-code">Build code</label>
    <input id="mkt-code" name="code" placeholder="MK-XXXXXX" required autocomplete="off" value="${e(opts.code ?? "")}">
    <label for="mkt-email">Email</label>
    <input id="mkt-email" name="email" type="email" required autocomplete="email" value="${e(opts.email ?? "")}">
    ${button("View status")}
  </form>
  <form class="mkt-card" method="post" action="${e(action)}">
    <h2>Join the waitlist</h2>
    <input type="hidden" name="intent" value="signup">
    <div class="mkt-hp" aria-hidden="true"><label>Leave blank<input name="website" tabindex="-1" autocomplete="off"></label></div>
    <label for="mkt-name">Name</label>
    <input id="mkt-name" name="name" required autocomplete="name">
    <label for="mkt-semail">Email</label>
    <input id="mkt-semail" name="email" type="email" required autocomplete="email">
    <label for="mkt-phone">Phone (optional)</label>
    <input id="mkt-phone" name="phone" type="tel" autocomplete="tel">
    <label for="mkt-project">What are we building? (optional)</label>
    <textarea id="mkt-project" name="project" rows="2" placeholder="Vehicle, part, anything we should know"></textarea>
    ${button("Join waitlist")}
  </form>
</div>
<form class="mkt-card" method="post" action="${e(action)}" style="margin-top:20px">
  <h2>Forgot your code?</h2>
  <input type="hidden" name="intent" value="remind">
  <label for="mkt-remail">Email you signed up with</label>
  <input id="mkt-remail" name="email" type="email" required autocomplete="email">
  ${button("Email me my code")}
</form>`);
}

export function renderSignedUp(action: string, code: string, emailSent: boolean): string {
  return page(`
<h1>You're on the list!</h1>
<div class="mkt-current">
  <p style="margin:0 0 6px">Your build code is</p>
  <p class="mkt-code" style="margin:0">${e(code)}</p>
</div>
<p>${emailSent ? "We've emailed it to you too. " : ""}Save this code — you'll use it with your email to check your build status. We'll email you every time your build moves forward.</p>
<a class="mkt-back" href="${e(action)}">← Back to build status</a>`);
}

export function renderStatus(action: string, build: TrackerBuild): string {
  const stages = stagesForBuild(build.optionalStages);
  const currentIndex = Math.max(0, stages.findIndex((s) => s.key === build.status));
  const current = getStage(build.status);
  const pct = Math.round(((currentIndex + 1) / stages.length) * 100);

  const steps = stages
    .map((stage, i) => {
      const state = i < currentIndex ? "done" : i === currentIndex ? "now" : "todo";
      // The design loop can go back and forth, so don't mark revision as "done" if it never happened.
      const skipped = stage.key === "revision" && build.revisionRound === 0 && i < currentIndex;
      const tag =
        stage.key === "revision" && build.revisionRound > 0
          ? `<span class="mkt-tag">${build.revisionRound} round${build.revisionRound === 1 ? "" : "s"}</span>`
          : "";
      return `<li class="${skipped ? "todo" : state}"><span class="mkt-dot">${state === "done" && !skipped ? "<span>✓</span>" : ""}</span><div><strong>${e(stage.label)}</strong>${tag}${state === "now" ? `<small>${e(stage.description)}</small>` : ""}</div></li>`;
    })
    .join("");

  const updates = build.updates
    .map(
      (u) =>
        `<li><time>${e(u.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }))}</time> · <strong>${e(getStage(u.status).label)}</strong>${u.message ? `<p>${e(u.message)}</p>` : ""}</li>`,
    )
    .join("");

  return page(`
<h1>Hi ${e(build.name.split(" ")[0])}</h1>
<p class="mkt-sub">Build <strong>${e(build.code)}</strong>${build.project ? ` · ${e(build.project)}` : ""}</p>
<div class="mkt-current">
  <div class="mkt-step">Step ${currentIndex + 1} of ${stages.length}</div>
  <h2 style="margin:4px 0 4px;font-size:1.6em">${e(statusLabel(build.status, build.revisionRound))}</h2>
  <p style="margin:0">${e(current.description)}</p>
  <div class="mkt-bar"><div style="width:${pct}%"></div></div>
</div>
<div class="mkt-grid">
  <div class="mkt-card"><h2>Progress</h2><ol class="mkt-steps">${steps}</ol></div>
  <div class="mkt-card"><h2>Updates</h2>${updates ? `<ol class="mkt-updates">${updates}</ol>` : "<p>No updates yet.</p>"}</div>
</div>
<a class="mkt-back" href="${e(action)}">← Check a different build</a>`);
}
