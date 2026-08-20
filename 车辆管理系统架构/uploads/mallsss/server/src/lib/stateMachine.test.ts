import { describe, expect, test } from "vitest";
import { planPublish, planUnpublish } from "./stateMachine";

describe("planPublish（ADR-004）", () => {
  test("draft -> published：apply", () => {
    expect(planPublish("draft")).toEqual({ kind: "apply", nextStatus: "published" });
  });

  test("unpublished -> published：apply（重新上架）", () => {
    expect(planPublish("unpublished")).toEqual({ kind: "apply", nextStatus: "published" });
  });

  test("published 再次发布：幂等，无副作用", () => {
    expect(planPublish("published")).toEqual({ kind: "idempotent" });
  });
});

describe("planUnpublish（ADR-004）", () => {
  test("published -> unpublished：apply", () => {
    expect(planUnpublish("published")).toEqual({ kind: "apply", nextStatus: "unpublished" });
  });

  test("unpublished 再次下架：幂等，无副作用", () => {
    expect(planUnpublish("unpublished")).toEqual({ kind: "idempotent" });
  });

  test("draft 下架：非法转换", () => {
    expect(planUnpublish("draft")).toEqual({ kind: "illegal" });
  });
});
