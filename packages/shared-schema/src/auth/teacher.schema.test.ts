import { describe, expect, it } from "vitest";
import { teacherLoginSchema, teacherSignupSchema } from "./teacher.schema";

const VALID_SIGNUP = {
  name: "김선생",
  schoolName: "클래스타운초등학교",
  email: "teacher@example.com",
  password: "password1",
  confirmPassword: "password1",
};

describe("teacherSignupSchema", () => {
  it("accepts a valid signup payload", () => {
    expect(teacherSignupSchema.safeParse(VALID_SIGNUP).success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = teacherSignupSchema.safeParse({ ...VALID_SIGNUP, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty school name", () => {
    const result = teacherSignupSchema.safeParse({ ...VALID_SIGNUP, schoolName: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed email", () => {
    const result = teacherSignupSchema.safeParse({
      ...VALID_SIGNUP,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = teacherSignupSchema.safeParse({
      ...VALID_SIGNUP,
      password: "abc123",
      confirmPassword: "abc123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password with no digit", () => {
    const result = teacherSignupSchema.safeParse({
      ...VALID_SIGNUP,
      password: "abcdefgh",
      confirmPassword: "abcdefgh",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password with no letter", () => {
    const result = teacherSignupSchema.safeParse({
      ...VALID_SIGNUP,
      password: "12345678",
      confirmPassword: "12345678",
    });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched password confirmation", () => {
    const result = teacherSignupSchema.safeParse({
      ...VALID_SIGNUP,
      confirmPassword: "different1",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["confirmPassword"]);
    }
  });
});

describe("teacherLoginSchema", () => {
  it("accepts a valid login payload", () => {
    const result = teacherLoginSchema.safeParse({
      email: "teacher@example.com",
      password: "anything",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty email", () => {
    const result = teacherLoginSchema.safeParse({ email: "", password: "x" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty password", () => {
    const result = teacherLoginSchema.safeParse({
      email: "teacher@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});
