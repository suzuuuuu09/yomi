import { z } from "@hono/zod-openapi";

// GET /auth/get-session
export const SessionResponseSchema = z
	.object({
		session: z
			.object({
				id: z.string(),
				userId: z.string(),
				token: z.string(),
				expiresAt: z.string(),
			})
			.nullable(),
		user: z
			.object({
				id: z.string(),
				name: z.string(),
				email: z.string(),
				image: z.string().nullable(),
			})
			.nullable(),
	})
	.openapi("Session");

// POST /auth/sign-in/social
export const SocialSignInBodySchema = z
	.object({
		provider: z.enum(["google"]).openapi({ example: "google" }),
		callbackURL: z.string().optional().openapi({ example: "/" }),
	})
	.openapi("SocialSignInBody");

export const SocialSignInResponseSchema = z
	.object({
		url: z.string().url(),
		redirect: z.boolean(),
	})
	.openapi("SocialSignInResponse");

// POST /auth/sign-out
export const SignOutResponseSchema = z
	.object({
		success: z.boolean(),
	})
	.openapi("SignOutResponse");
