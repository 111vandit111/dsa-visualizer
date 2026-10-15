import { describe, expect, it } from "vitest";
import { parseListParams } from "./question";

describe("parseListParams", () => {
  it("returns defaults for an empty query", () => {
    expect(parseListParams(new URLSearchParams())).toEqual({ page: 1, pageSize: 12 });
  });

  it("clamps page and pageSize", () => {
    const params = parseListParams(new URLSearchParams("page=-4&pageSize=999"));
    expect(params).toMatchObject({ page: 1, pageSize: 50 });
    expect(parseListParams(new URLSearchParams("page=abc&pageSize=0"))).toMatchObject({ page: 1, pageSize: 1 });
  });

  it("whitelists difficulty", () => {
    expect(parseListParams(new URLSearchParams("difficulty=Hard")).difficulty).toBe("Hard");
    expect(parseListParams(new URLSearchParams("difficulty=%24ne")).difficulty).toBeUndefined();
  });

  it("accepts only known kinds", () => {
    expect(parseListParams(new URLSearchParams("kind=algorithm")).kind).toBe("algorithm");
    expect(parseListParams(new URLSearchParams("kind=question")).kind).toBe("question");
    expect(parseListParams(new URLSearchParams("kind=%24ne")).kind).toBeUndefined();
  });

  it("splits, trims, lowercases and dedupes tags", () => {
    const params = parseListParams(new URLSearchParams("tags=Heap, design,heap,,bad tag"));
    expect(params.tags).toEqual(["heap", "design"]);
  });

  it("strips control characters from q", () => {
    expect(parseListParams(new URLSearchParams("q=a%00b%1f")).q).toBe("ab");
    expect(parseListParams(new URLSearchParams("q=%00")).q).toBeUndefined();
  });

  it("trims q and drops it when blank", () => {
    expect(parseListParams(new URLSearchParams("q=%20twitter%20")).q).toBe("twitter");
    expect(parseListParams(new URLSearchParams("q=%20%20")).q).toBeUndefined();
  });
});
