import { describe, expect, it } from "vitest";
import { teacherSignupSchema } from "@classtown/shared-schema";
import { toFieldErrors } from "./formErrors";

describe("toFieldErrors", () => {
  it("keys each message by its field name", () => {
    const result = teacherSignupSchema.safeParse({
      name: "",
      schoolName: "",
      email: "not-an-email",
      password: "short",
      confirmPassword: "different",
    });
    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    const fieldErrors = toFieldErrors(result.error);
    expect(Object.keys(fieldErrors)).toEqual(
      expect.arrayContaining(["name", "schoolName", "email", "password"]),
    );
  });

  it("keeps only the first issue per field", () => {
    const result = teacherSignupSchema.safeParse({
      name: "김선생",
      schoolName: "학교",
      email: "teacher@example.com",
      password: "short",
      confirmPassword: "short",
    });
    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    const fieldErrors = toFieldErrors(result.error);
    expect(typeof fieldErrors.password).toBe("string");
  });
});
