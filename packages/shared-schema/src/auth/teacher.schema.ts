import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "비밀번호는 8자 이상이어야 합니다.")
  .regex(/[A-Za-z]/, "비밀번호에 영문자를 포함해야 합니다.")
  .regex(/[0-9]/, "비밀번호에 숫자를 포함해야 합니다.");

export const teacherSignupSchema = z
  .object({
    name: z.string().trim().min(1, "이름을 입력해 주세요.").max(50, "이름이 너무 깁니다."),
    schoolName: z
      .string()
      .trim()
      .min(1, "학교 이름을 입력해 주세요.")
      .max(100, "학교 이름이 너무 깁니다."),
    email: z
      .string()
      .trim()
      .min(1, "이메일을 입력해 주세요.")
      .email("올바른 이메일 형식이 아닙니다."),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "비밀번호 확인을 입력해 주세요."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["confirmPassword"],
  });

export type TeacherSignupInput = z.infer<typeof teacherSignupSchema>;

export const teacherLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "이메일을 입력해 주세요.")
    .email("올바른 이메일 형식이 아닙니다."),
  password: z.string().min(1, "비밀번호를 입력해 주세요."),
});

export type TeacherLoginInput = z.infer<typeof teacherLoginSchema>;
