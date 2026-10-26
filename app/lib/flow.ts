import { stagesForBuild, type StageKey } from "./stages";

export interface QuickAction {
  label: string;
  status: StageKey;
}

// Suggested next moves from the current stage, including the design review loop.
export function quickActions(status: string, optionalStages: string): QuickAction[] {
  if (status === "design_review") {
    return [
      { label: "Customer approved → Printing", status: "printing" },
      { label: "Changes requested → Revision design", status: "revision" },
    ];
  }
  if (status === "revision") {
    return [{ label: "Revised design ready → Design ready to review", status: "design_review" }];
  }
  if (status === "design") {
    return [{ label: "Design ready → Design ready to review", status: "design_review" }];
  }
  const stages = stagesForBuild(optionalStages).filter((s) => s.key !== "revision");
  const idx = stages.findIndex((s) => s.key === status);
  const next = idx >= 0 ? stages[idx + 1] : undefined;
  return next ? [{ label: `Move to ${next.label}`, status: next.key }] : [];
}
