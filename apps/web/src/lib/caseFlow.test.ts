import { describe, expect, it } from "vitest";
import { caseTimeline, nextStep } from "./caseFlow";

function summarize(status: Parameters<typeof caseTimeline>[0], reached: Parameters<typeof caseTimeline>[1]) {
  return caseTimeline(status, reached).map((step) => `${step.status}:${step.state}`);
}

describe("caseTimeline", () => {
  it("drops the quote step for a case that never received one", () => {
    expect(summarize("IN_PROGRESS", ["SUBMITTED", "UNDER_REVIEW", "IN_PROGRESS"])).toEqual([
      "SUBMITTED:done",
      "UNDER_REVIEW:done",
      "IN_PROGRESS:current",
      "COMPLETED:upcoming",
    ]);
  });

  it("keeps the quote step in place once the case was quoted", () => {
    expect(summarize("QUOTED", ["SUBMITTED", "UNDER_REVIEW", "QUOTED"])).toEqual([
      "SUBMITTED:done",
      "UNDER_REVIEW:done",
      "QUOTED:current",
      "IN_PROGRESS:upcoming",
      "COMPLETED:upcoming",
    ]);
  });

  it("shows only the steps a cancelled case reached, with none marked current", () => {
    expect(summarize("CANCELLED", ["SUBMITTED", "UNDER_REVIEW", "NEED_MORE_INFO", "CANCELLED"])).toEqual([
      "SUBMITTED:done",
      "UNDER_REVIEW:done",
    ]);
  });
});

describe("nextStep", () => {
  it("keeps a cancelled case passive with no waiting party", () => {
    expect(nextStep("CANCELLED", { hasDocuments: true })).toMatchObject({
      waitingOn: "—",
      needsYourAction: false,
    });
  });
});
