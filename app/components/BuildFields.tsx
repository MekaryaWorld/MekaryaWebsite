import { OPTIONAL_STAGES } from "../lib/stages";

export interface BuildFieldValues {
  name: string;
  email: string;
  phone: string | null;
  project: string | null;
  notes: string | null;
  optionalStages: string[];
  emailUpdates: boolean;
}

export type BuildFieldErrors = Partial<Record<"name" | "email", string>>;

// Customer details + which optional production stages apply. Used by "Add build" and the build page.
export function BuildFields({
  values,
  errors,
}: {
  values?: Partial<BuildFieldValues>;
  errors?: BuildFieldErrors;
}) {
  const optional = new Set(values?.optionalStages ?? []);
  return (
    <s-stack direction="block" gap="base">
      <s-grid gridTemplateColumns="@container (inline-size > 500px) 1fr 1fr, 1fr" gap="base">
        <s-text-field
          name="name"
          label="Customer name"
          required
          defaultValue={values?.name ?? ""}
          error={errors?.name}
        />
        <s-email-field
          name="email"
          label="Email"
          required
          defaultValue={values?.email ?? ""}
          error={errors?.email}
        />
        <s-text-field name="phone" label="Phone" defaultValue={values?.phone ?? ""} />
        <s-text-field
          name="project"
          label="Project"
          placeholder="e.g. 1991 Miata front lip"
          defaultValue={values?.project ?? ""}
        />
      </s-grid>
      <s-text-area
        name="notes"
        label="Private notes"
        details="Only visible to staff."
        rows={3}
        defaultValue={values?.notes ?? ""}
      />
      <s-stack direction="block" gap="small-200">
        <s-text type="strong">Optional production stages</s-text>
        <s-text color="subdued">
          Turn on the stages this build goes through after test fit.
        </s-text>
        {OPTIONAL_STAGES.map((stage) => (
          <s-checkbox
            key={stage.key}
            name="optionalStages"
            value={stage.key}
            label={stage.label}
            defaultChecked={optional.has(stage.key)}
          />
        ))}
      </s-stack>
      <s-checkbox
        name="emailUpdates"
        label="Email the customer when this build is updated"
        defaultChecked={values?.emailUpdates ?? true}
      />
    </s-stack>
  );
}
