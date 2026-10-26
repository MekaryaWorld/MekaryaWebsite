// Every stage a build can be in, in display order.
// Design → Design ready to review → Revision cycles until the customer approves.

export type StageKey =
  | "waitlist"
  | "ready_to_scan"
  | "scan_processing"
  | "design"
  | "design_review"
  | "revision"
  | "printing"
  | "assembly"
  | "test_fit"
  | "bodywork"
  | "molding"
  | "first_sample"
  | "production"
  | "final_finish";

export interface Stage {
  key: StageKey;
  label: string;
  // Shown to the customer on the tracker and in emails
  description: string;
  optional?: boolean;
  // Part of the design → review → revision loop
  designCycle?: boolean;
}

export const STAGES: Stage[] = [
  {
    key: "waitlist",
    label: "Waitlist",
    description: "You're on the list. We'll reach out when your build slot opens.",
  },
  {
    key: "ready_to_scan",
    label: "Ready to scan",
    description: "Your slot is open — we're ready to schedule your 3D scan.",
  },
  {
    key: "scan_processing",
    label: "Scan processing",
    description: "We've captured your scan and are cleaning it up for design.",
  },
  {
    key: "design",
    label: "Design",
    description: "Our designers are working on your part.",
    designCycle: true,
  },
  {
    key: "design_review",
    label: "Design ready to review",
    description: "Your design is ready! Take a look and send us your feedback.",
    designCycle: true,
  },
  {
    key: "revision",
    label: "Revision design",
    description: "We're making the changes you asked for.",
    designCycle: true,
  },
  {
    key: "printing",
    label: "Printing",
    description: "Your approved design is on the printer.",
  },
  {
    key: "assembly",
    label: "Assembly",
    description: "Printed parts are being assembled.",
  },
  {
    key: "test_fit",
    label: "Ready to test fit",
    description: "Your build is ready for a test fit.",
  },
  {
    key: "bodywork",
    label: "Bodywork / mold prep",
    description: "Prepping and finishing the master for molding.",
    optional: true,
  },
  {
    key: "molding",
    label: "Molding",
    description: "Creating the production mold.",
    optional: true,
  },
  {
    key: "first_sample",
    label: "First unit sample",
    description: "The first unit from the mold is being made and checked.",
    optional: true,
  },
  {
    key: "production",
    label: "Production",
    description: "Your units are in production.",
    optional: true,
  },
  {
    key: "final_finish",
    label: "Final finish",
    description: "Final finishing and quality check.",
    optional: true,
  },
];

export const OPTIONAL_STAGES = STAGES.filter((s) => s.optional);

const BY_KEY = new Map(STAGES.map((s) => [s.key, s]));

export function isStageKey(value: unknown): value is StageKey {
  return typeof value === "string" && BY_KEY.has(value as StageKey);
}

export function getStage(key: string): Stage {
  return BY_KEY.get(key as StageKey) ?? STAGES[0];
}

export function parseOptionalStages(value: string): StageKey[] {
  return value
    .split(",")
    .filter((k): k is StageKey => isStageKey(k) && getStage(k).optional === true);
}

// The stages that apply to one build: all core stages plus the optional ones it uses.
export function stagesForBuild(optionalStages: string): Stage[] {
  const enabled = new Set(parseOptionalStages(optionalStages));
  return STAGES.filter((s) => !s.optional || enabled.has(s.key));
}

// Human label, including the round number while in the design loop.
export function statusLabel(status: string, revisionRound: number): string {
  const stage = getStage(status);
  if (stage.key === "revision" && revisionRound > 0) {
    return `${stage.label} (round ${revisionRound})`;
  }
  if (stage.key === "design_review" && revisionRound > 0) {
    return `${stage.label} (round ${revisionRound + 1})`;
  }
  return stage.label;
}
