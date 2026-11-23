import { publicEnv } from "@/lib/env";

export const AVATAR_BUCKET = "avatars";
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Uploaded avatars are always "<user id>/<timestamp>.webp" (resized in the browser).
export function isValidAvatarPath(path: string, userId: string): boolean {
  return new RegExp(`^${userId}/[0-9]{10,16}\\.webp$`).test(path);
}

export function avatarUrl(path: string): string {
  return `${publicEnv().NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${AVATAR_BUCKET}/${path}`;
}
