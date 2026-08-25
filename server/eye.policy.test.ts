import { describe, expect, it } from "vitest";
import { canViewPartnerLocation, canWriteLocation, normalizePartnerCode } from "./eye.policy";

describe("THE EYE privacy policy", () => {
  it("normalizes partner codes without changing their meaning", () => {
    expect(normalizePartnerCode(" eye-7x92k ")).toBe("EYE-7X92K");
    expect(normalizePartnerCode("eye 7x92k")).toBe("EYE7X92K");
  });

  it("only exposes a partner location after acceptance and explicit sharing", () => {
    expect(canViewPartnerLocation("pending", true)).toBe(false);
    expect(canViewPartnerLocation("accepted", false)).toBe(false);
    expect(canViewPartnerLocation("accepted", true)).toBe(true);
    expect(canViewPartnerLocation("disconnected", true)).toBe(false);
  });

  it("only accepts location writes for an accepted connection with sharing on", () => {
    expect(canWriteLocation("accepted", true)).toBe(true);
    expect(canWriteLocation("accepted", false)).toBe(false);
    expect(canWriteLocation("pending", true)).toBe(false);
  });
});
