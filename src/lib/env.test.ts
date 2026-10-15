import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SITE_URL, getSiteUrl, getVerification } from "./env";

afterEach(() => vi.unstubAllEnvs());

function clearSiteEnv() {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
  vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
}

describe("getSiteUrl", () => {
  it("falls back to the default when nothing is set or values are blank", () => {
    clearSiteEnv();
    expect(getSiteUrl()).toBe(DEFAULT_SITE_URL);
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "   ");
    expect(getSiteUrl()).toBe(DEFAULT_SITE_URL);
  });

  it("prefers NEXT_PUBLIC_SITE_URL over the Vercel host", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "app.vercel.app");
    expect(getSiteUrl()).toBe("https://example.com");
  });

  it("adds https to the Vercel host, which has no scheme", () => {
    clearSiteEnv();
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "app.vercel.app");
    expect(getSiteUrl()).toBe("https://app.vercel.app");
  });

  it("strips trailing slashes", () => {
    clearSiteEnv();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com///");
    expect(getSiteUrl()).toBe("https://example.com");
  });

  it("falls back to the next source or the default for an invalid URL", () => {
    clearSiteEnv();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "not a url");
    expect(getSiteUrl()).toBe(DEFAULT_SITE_URL);
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "app.vercel.app");
    expect(getSiteUrl()).toBe("https://app.vercel.app");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "javascript:alert(1)");
    expect(getSiteUrl()).toBe("https://app.vercel.app");
  });
});

describe("getVerification", () => {
  it("returns undefined for blank values and trims set ones", () => {
    vi.stubEnv("GOOGLE_SITE_VERIFICATION", " abc ");
    vi.stubEnv("BING_SITE_VERIFICATION", "");
    expect(getVerification()).toEqual({ google: "abc", bing: undefined });
  });
});
