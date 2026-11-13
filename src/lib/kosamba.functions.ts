import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database, Tables } from "@/integrations/supabase/types";
import { managerPasswordMatches } from "@/lib/kosamba-security";

type MenuItem = Tables<"menu_items">;

function getSessionConfig() {
  const password = process.env["SESSION_SECRET"];
  if (!password) throw new Error("Manager session is not configured.");
  return {
    password,
    name: "kosamba-manager",
    maxAge: 60 * 60 * 12,
    cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
  };
}

async function managerSession() {
  return useSession<{ unlocked?: boolean }>(getSessionConfig());
}

const menuItemSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(240),
  category: z.string().trim().min(1).max(60),
  price: z.number().finite().min(0).max(1_000_000),
  enabled: z.boolean(),
});

const menuItemUpdateSchema = menuItemSchema.extend({ id: z.string().uuid() });
const idSchema = z.object({ id: z.string().uuid() });
const settingsSchema = z.object({
  whatsappNumber: z.string().trim().regex(/^(?:\+?\d{7,15})?$/),
});

export const getPublicMenu = createServerFn({ method: "GET" }).handler(async () => {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Online Kosamba menu is not configured.");

  const supabasePublic = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
  const [{ data: items, error: itemError }, { data: settings, error: settingsError }] =
    await Promise.all([
      supabasePublic.from("menu_items").select("*").eq("enabled", true).order("category").order("name"),
      supabasePublic.from("store_settings").select("whatsapp_number").eq("id", "main").maybeSingle(),
    ]);
  if (itemError || settingsError) throw new Error("Could not load the breakfast menu.");
  return { items: (items ?? []) as MenuItem[], whatsappNumber: settings?.whatsapp_number ?? "" };
});

export const unlockManager = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string }) => z.object({ password: z.string().max(128) }).parse(input))
  .handler(async ({ data }) => {
    const expected = process.env["SITE_PASSWORD"];
    if (!expected || !(await managerPasswordMatches(data.password, expected))) {
      return { ok: false as const };
    }
    const session = await managerSession();
    await session.update({ unlocked: true });
    return { ok: true as const };
  });

export const lockManager = createServerFn({ method: "POST" }).handler(async () => {
  const session = await managerSession();
  await session.clear();
  return { ok: true as const };
});

export const readManagerData = createServerFn({ method: "GET" }).handler(async () => {
  const session = await managerSession();
  if (!session.data.unlocked) return { authorized: false as const, items: [], whatsappNumber: "" };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: items, error: itemError }, { data: settings, error: settingsError }] =
    await Promise.all([
      supabaseAdmin.from("menu_items").select("*").order("category").order("name"),
      supabaseAdmin.from("store_settings").select("whatsapp_number").eq("id", "main").maybeSingle(),
    ]);
  if (itemError || settingsError) throw new Error("Could not load the manager menu.");

  return {
    authorized: true as const,
    items: (items ?? []) as MenuItem[],
    whatsappNumber: settings?.whatsapp_number ?? "",
  };
});

export const addMenuItem = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => menuItemSchema.parse(input))
  .handler(async ({ data }) => {
    const session = await managerSession();
    if (!session.data.unlocked) throw new Error("Manager access is locked.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("menu_items").insert(data);
    if (error) throw new Error("Could not add this menu item.");
    return { ok: true as const };
  });

export const updateMenuItem = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => menuItemUpdateSchema.parse(input))
  .handler(async ({ data }) => {
    const session = await managerSession();
    if (!session.data.unlocked) throw new Error("Manager access is locked.");
    const { id, ...changes } = data;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("menu_items").update(changes).eq("id", id);
    if (error) throw new Error("Could not update this menu item.");
    return { ok: true as const };
  });

export const removeMenuItem = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data }) => {
    const session = await managerSession();
    if (!session.data.unlocked) throw new Error("Manager access is locked.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("menu_items").delete().eq("id", data.id);
    if (error) throw new Error("Could not remove this menu item.");
    return { ok: true as const };
  });

export const saveWhatsAppNumber = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => settingsSchema.parse(input))
  .handler(async ({ data }) => {
    const session = await managerSession();
    if (!session.data.unlocked) throw new Error("Manager access is locked.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("store_settings").upsert(
      { id: "main", whatsapp_number: data.whatsappNumber, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    );
    if (error) throw new Error("Could not save the WhatsApp number.");
    return { ok: true as const };
  });