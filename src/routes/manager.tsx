import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Check, Eye, EyeOff, LockKeyhole, LogOut, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addMenuItem,
  lockManager,
  readManagerData,
  removeMenuItem,
  saveWhatsAppNumber,
  unlockManager,
  updateMenuItem,
} from "@/lib/kosamba.functions";
import type { Tables } from "@/integrations/supabase/types";

type MenuItem = Tables<"menu_items">;
type MenuDraft = Omit<MenuItem, "id" | "created_at">;

const emptyDraft: MenuDraft = { name: "", description: "", category: "Breakfast", price: 0, enabled: true };

export const Route = createFileRoute("/manager")({
  head: () => ({
    meta: [
      { title: "Manager | Online Kosamba" },
      { name: "description", content: "Manage Online Kosamba breakfast items, prices, availability and WhatsApp orders." },
      { property: "og:title", content: "Manager | Online Kosamba" },
      { property: "og:description", content: "Manage the Online Kosamba breakfast menu and order contact." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ManagerPage,
});

function ManagerPage() {
  const readData = useServerFn(readManagerData);
  const unlock = useServerFn(unlockManager);
  const lock = useServerFn(lockManager);
  const addItem = useServerFn(addMenuItem);
  const saveItem = useServerFn(updateMenuItem);
  const deleteItem = useServerFn(removeMenuItem);
  const saveNumber = useServerFn(saveWhatsAppNumber);
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [number, setNumber] = useState("");
  const [draft, setDraft] = useState<MenuDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh() {
    const result = await readData();
    setAuthorized(result.authorized);
    if (result.authorized) {
      setItems(result.items);
      setNumber(result.whatsappNumber);
    }
    setChecking(false);
  }

  useEffect(() => {
    void refresh().catch(() => setChecking(false));
  }, []);

  async function handleUnlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError(false);
    const result = await unlock({ data: { password } });
    if (!result.ok) {
      setLoginError(true);
      return;
    }
    setPassword("");
    await refresh();
  }

  async function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await addItem({ data: { ...draft, price: Number(draft.price) } });
      setDraft(emptyDraft);
      setMessage("Menu item added.");
      await refresh();
    } catch {
      setMessage("Could not add the item. Check the details and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(item: MenuItem, changes: Partial<MenuDraft>) {
    try {
      await saveItem({ data: { id: item.id, name: item.name, description: item.description, category: item.category, price: item.price, enabled: item.enabled, ...changes } });
      setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, ...changes } : candidate));
      setMessage("Changes saved.");
    } catch {
      setMessage("Could not save that change.");
    }
  }

  async function handleRemove(id: string) {
    if (!window.confirm("Remove this item from the menu?")) return;
    try {
      await deleteItem({ data: { id } });
      setItems((current) => current.filter((item) => item.id !== id));
      setMessage("Menu item removed.");
    } catch {
      setMessage("Could not remove this item.");
    }
  }

  async function handleSaveNumber(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await saveNumber({ data: { whatsappNumber: number } });
      setMessage("WhatsApp number saved.");
    } catch {
      setMessage("Enter a valid number with country code, then try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLock() {
    await lock();
    setAuthorized(false);
    setItems([]);
  }

  if (checking) return <main className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Loading manager…</main>;

  if (!authorized) return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12 text-foreground">
      <section className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Back to menu</Link>
        <div className="mt-12 flex size-12 items-center justify-center rounded-full bg-secondary text-primary"><LockKeyhole className="size-5" /></div>
        <p className="mt-7 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Online Kosamba</p>
        <h1 className="mt-2 font-display text-4xl font-bold">Manager access</h1>
        <p className="mt-3 text-muted-foreground">Enter the manager password to edit the breakfast menu.</p>
        <form onSubmit={handleUnlock} className="mt-7 space-y-4">
          <label className="block text-sm font-medium" htmlFor="manager-password">Password</label>
          <Input id="manager-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} maxLength={128} required />
          {loginError && <p role="alert" className="text-sm text-destructive">That password did not match. Please try again.</p>}
          <Button type="submit" className="w-full">Unlock manager <LockKeyhole /></Button>
        </form>
      </section>
    </main>
  );

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <header className="flex items-center justify-between border-b border-border pb-6">
          <div><Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Online Kosamba</Link><h1 className="mt-3 font-display text-3xl font-bold">Menu manager</h1></div>
          <Button variant="outline" onClick={handleLock}><LogOut /> <span className="hidden sm:inline">Lock manager</span></Button>
        </header>

        <section className="border-b border-border py-8">
          <div className="mb-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Ordering contact</p><h2 className="mt-1 font-display text-xl font-bold">WhatsApp number</h2></div>
          <form onSubmit={handleSaveNumber} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block flex-1 text-sm font-medium">Number with country code<input className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-base outline-none focus-visible:ring-1 focus-visible:ring-ring" inputMode="tel" autoComplete="tel" placeholder="e.g. 91 98765 43210" value={number} onChange={(event) => setNumber(event.target.value.replace(/[^+\d ]/g, "").slice(0, 20))} /></label>
            <Button type="submit" variant="secondary" disabled={saving}>Save number <Check /></Button>
          </form>
        </section>

        <section className="border-b border-border py-8">
          <div className="mb-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Menu editor</p><h2 className="mt-1 font-display text-xl font-bold">Add a breakfast item</h2></div>
          <form onSubmit={handleAdd} className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">Item name<Input required maxLength={100} className="mt-2" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
            <label className="text-sm font-medium">Category<Input required maxLength={60} className="mt-2" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} /></label>
            <label className="text-sm font-medium sm:col-span-2">Description<Input maxLength={240} className="mt-2" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
            <label className="text-sm font-medium">Price (₹)<Input required type="number" min="0" max="1000000" step="0.01" className="mt-2" value={draft.price} onChange={(event) => setDraft({ ...draft, price: Number(event.target.value) })} /></label>
            <div className="flex items-end"><Button type="submit" disabled={saving}><Plus /> Add item</Button></div>
          </form>
        </section>

        <section className="py-8">
          <div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Current selection</p><h2 className="mt-1 font-display text-xl font-bold">Breakfast items <span className="font-sans text-sm font-normal text-muted-foreground">({items.length})</span></h2></div></div>
          <div className="divide-y divide-border">{items.map((item) => <ManagerItem key={item.id} item={item} onSave={handleUpdate} onToggle={(enabled) => handleUpdate(item, { enabled })} onRemove={handleRemove} />)}</div>
          {items.length === 0 && <p className="py-8 text-muted-foreground">No menu items yet.</p>}
        </section>
        {message && <p aria-live="polite" className="fixed bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-md border border-border bg-background px-4 py-3 text-sm shadow-lg">{message}</p>}
      </div>
    </main>
  );
}

function ManagerItem({ item, onSave, onToggle, onRemove }: {
  item: MenuItem;
  onSave: (item: MenuItem, changes: Partial<MenuDraft>) => Promise<void>;
  onToggle: (enabled: boolean) => void;
  onRemove: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(String(item.price));

  return <article className="flex flex-wrap items-center justify-between gap-3 py-4">
    <div className="min-w-40 flex-1">
      {editing ? <div className="grid gap-2 sm:grid-cols-[1fr_8rem]"> <Input aria-label={`Edit ${item.name} name`} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} /><Input aria-label={`Edit ${item.name} price`} type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} /></div> : <><h3 className="font-semibold">{item.name}</h3><p className="text-sm text-muted-foreground">{item.category} · ₹{item.price.toFixed(2)}{item.enabled ? "" : " · Hidden"}</p></>}
    </div>
    <div className="flex items-center gap-1">
      {editing ? <><Button size="sm" onClick={async () => { await onSave(item, { name: name.trim(), price: Number(price) }); setEditing(false); }}><Check /> Save</Button><Button size="sm" variant="ghost" onClick={() => { setName(item.name); setPrice(String(item.price)); setEditing(false); }}>Cancel</Button></> : <><Button size="icon" variant="ghost" aria-label={item.enabled ? `Hide ${item.name}` : `Enable ${item.name}`} title={item.enabled ? "Hide from menu" : "Show on menu"} onClick={() => onToggle(!item.enabled)}>{item.enabled ? <Eye /> : <EyeOff />}</Button><Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button><Button size="icon" variant="ghost" aria-label={`Remove ${item.name}`} title="Remove item" onClick={() => onRemove(item.id)}><Trash2 /></Button></>}
    </div>
  </article>;
}