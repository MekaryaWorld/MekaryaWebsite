import { normalizeEmail, isValidEmail } from "./codes.server";
import { parseOptionalStages } from "./stages";
import type { BuildFieldErrors } from "../components/BuildFields";

export function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

// Reads and validates the fields rendered by <BuildFields>.
export function parseBuildFields(form: FormData) {
  const data = {
    name: text(form, "name"),
    email: normalizeEmail(text(form, "email")),
    phone: text(form, "phone") || null,
    project: text(form, "project") || null,
    notes: text(form, "notes") || null,
    optionalStages: parseOptionalStages(
      form.getAll("optionalStages").map(String).join(","),
    ).join(","),
    emailUpdates: form.has("emailUpdates"),
  };
  const errors: BuildFieldErrors = {};
  if (!data.name) errors.name = "Name is required";
  if (!isValidEmail(data.email)) errors.email = "Enter a valid email";
  return { data, errors: Object.keys(errors).length ? errors : null };
}
