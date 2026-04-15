import { describe, expect, it } from "vitest";

import { DELETE_ACCOUNT_ACCORDION_SECTIONS } from "../src/pages/delete-account/content";

describe("delete-account page copy", () => {
  it("documents the hard-delete policy without the old delayed-retention messaging", () => {
    const text = DELETE_ACCOUNT_ACCORDION_SECTIONS.flatMap((section) =>
      section.content.map((item) => item.text)
    ).join(" ");

    expect(text).toContain("minimal de-identified payment audit");
    expect(text).toContain("brand-new empty account");
    expect(text).not.toContain("30 days");
    expect(text).not.toContain("7 years");
  });
});
