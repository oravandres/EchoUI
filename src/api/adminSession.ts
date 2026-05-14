import { z } from "zod";
import { fetchJson, postJson } from "@/api/client";

const API_PREFIX = "/api/v1/admin/session";

const adminSessionSchema = z
  .object({
    authenticated: z.boolean(),
    expiresAt: z
      .string()
      .optional()
      .transform((value) => value ?? ""),
    csrfToken: z
      .string()
      .optional()
      .transform((value) => value ?? ""),
  })
  .superRefine((value, ctx) => {
    if (!value.authenticated) return;
    if (value.expiresAt === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiresAt"],
        message: "authenticated sessions must include expiresAt",
      });
    }
    if (value.csrfToken === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["csrfToken"],
        message: "authenticated sessions must include csrfToken",
      });
    }
  });

export type AdminSession = z.infer<typeof adminSessionSchema>;

export type AdminSessionParams = {
  signal?: AbortSignal;
};

export async function getAdminSession(
  params: AdminSessionParams = {}
): Promise<AdminSession> {
  const data = await fetchJson<unknown>(API_PREFIX, {
    credentials: "include",
    signal: params.signal,
  });
  return adminSessionSchema.parse(data);
}

export async function loginAdminSession(
  token: string,
  params: AdminSessionParams = {}
): Promise<AdminSession> {
  const data = await postJson<unknown>(
    API_PREFIX,
    { token },
    {
      credentials: "include",
      signal: params.signal,
    }
  );
  return adminSessionSchema.parse(data);
}

export async function logoutAdminSession(
  params: AdminSessionParams = {}
): Promise<void> {
  await fetchJson<void>(API_PREFIX, {
    credentials: "include",
    method: "DELETE",
    signal: params.signal,
  });
}
