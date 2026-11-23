import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cacheLife } from "next/cache";
import { publicEnv } from "@/lib/env";
import type { Database, Tables } from "@/lib/supabase/database.types";

// Public reference data (anon-readable, identical for every visitor), so it is
// safe to cache across users. Uses a cookie-less client on purpose: never put
// session-based queries in a 'use cache' function.
function anonClient() {
  const env = publicEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type University = Pick<Tables<"universities">, "id" | "name" | "short_name">;
export type Category = Pick<Tables<"categories">, "id" | "slug" | "name">;

export async function getUniversities(): Promise<University[]> {
  "use cache";
  cacheLife("hours");
  const { data, error } = await anonClient()
    .from("universities")
    .select("id, name, short_name")
    .order("sort_order")
    .order("name");
  if (error) throw new Error(`Could not load universities: ${error.message}`);
  return data;
}

export async function getCategories(): Promise<Category[]> {
  "use cache";
  cacheLife("hours");
  const { data, error } = await anonClient()
    .from("categories")
    .select("id, slug, name")
    .order("sort_order")
    .order("name");
  if (error) throw new Error(`Could not load categories: ${error.message}`);
  return data;
}
