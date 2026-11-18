import { describe, expect, it } from "vitest";
import { contactSchema, loginSchema, registerSchema } from "./schemas";

const canonical = "09121234567";

const variants: [string, string][] = [
  ["Latin digits", "09121234567"],
  ["Persian digits", "۰۹۱۲۱۲۳۴۵۶۷"],
  ["Arabic digits", "٠٩١٢١٢٣٤٥٦٧"],
  ["+98 prefix", "+989121234567"],
  ["0098 prefix", "00989121234567"],
  ["spaces and dashes", "0912 123-4567"],
];

describe("mobile normalisation", () => {
  it.each(variants)("accepts %s and stores one canonical number", (_label, input) => {
    const parsed = loginSchema.parse({ mobile: input, password: "Demo@12345" });
    expect(parsed.mobile).toBe(canonical);
  });

  it("still rejects a number that is not an Iranian mobile", () => {
    expect(() => loginSchema.parse({ mobile: "12345", password: "Demo@12345" })).toThrow();
  });

  it("normalises the register and contact forms too", () => {
    const registered = registerSchema.parse({
      fullName: "علی رضایی",
      mobile: "+98 ۹۱۲ ۱۲۳ ۴۵۶۷",
      email: "",
      password: "Demo@12345",
      confirmPassword: "Demo@12345",
    });
    expect(registered.mobile).toBe(canonical);

    const contact = contactSchema.parse({
      name: "علی رضایی",
      mobile: "٠٩١٢١٢٣٤٥٦٧",
      subject: "پیگیری",
      message: "این یک پیام آزمایشی برای بررسی نرمال‌سازی شماره است.",
      privacyAccepted: true,
    });
    expect(contact.mobile).toBe(canonical);
  });
});
