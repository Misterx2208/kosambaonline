import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Coffee, Minus, Plus, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import breakfastPhoto from "@/assets/kosamba-breakfast.jpg";
import { Button } from "@/components/ui/button";
import { getPublicMenu } from "@/lib/kosamba.functions";
import type { Tables } from "@/integrations/supabase/types";

type MenuItem = Tables<"menu_items">;
type Cart = Record<string, number>;
const ALL_ITEMS_CATEGORY = "__all_items__";

// The home route ships no og:image, so serve-time hosting can inject the
// project's social preview (explicit og:image or latest screenshot).
export const Route = createFileRoute("/")({
  loader: () => getPublicMenu(),
  head: () => ({
    meta: [
      { title: "Online Kosamba | Breakfast, Made Fresh" },
      { name: "description", content: "Order fresh Kosamba breakfast favourites, chai and coffee. Pick your breakfast and send your order on WhatsApp." },
      { property: "og:title", content: "Online Kosamba | Breakfast, Made Fresh" },
      { property: "og:description", content: "Fresh breakfast favourites, chai and coffee from Online Kosamba." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { items, whatsappNumber } = Route.useLoaderData();
  const [cart, setCart] = useState<Cart>({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const visibleItems = items as MenuItem[];
  const categories = useMemo(() => [...new Set(visibleItems.map((item) => item.category))], [visibleItems]);
  const [selectedCategory, setSelectedCategory] = useState(ALL_ITEMS_CATEGORY);
  const currentCategory = selectedCategory === ALL_ITEMS_CATEGORY || !categories.includes(selectedCategory)
    ? ALL_ITEMS_CATEGORY
    : selectedCategory;
  const categoryItems = currentCategory === ALL_ITEMS_CATEGORY
    ? visibleItems
    : visibleItems.filter((item) => item.category === currentCategory);
  const cartItems = visibleItems.filter((item) => (cart[item.id] ?? 0) > 0);
  const itemCount = Object.values(cart).reduce((sum, count) => sum + count, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * (cart[item.id] ?? 0), 0);

  useEffect(() => {
    const stored = window.localStorage.getItem("kosamba-cart");
    if (!stored) return;
    try {
      const parsed: unknown = JSON.parse(stored);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) setCart(parsed as Cart);
    } catch {
      window.localStorage.removeItem("kosamba-cart");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("kosamba-cart", JSON.stringify(cart));
  }, [cart]);

  function changeQuantity(id: string, change: number) {
    setCart((current) => {
      const next = Math.max(0, (current[id] ?? 0) + change);
      const updated = { ...current };
      if (next === 0) delete updated[id];
      else updated[id] = next;
      return updated;
    });
  }

  function placeOrder() {
    const number = whatsappNumber.replace(/\D/g, "");
    if (!number || cartItems.length === 0) return;
    const lines = [
      "Hello Online Kosamba! I would like to order:",
      "",
      ...cartItems.map((item) => `${cart[item.id]} × ${item.name} — ₹${(item.price * (cart[item.id] ?? 0)).toFixed(2)}`),
      "",
      `Total: ₹${subtotal.toFixed(2)}`,
      ...(customerName.trim() ? [`Name: ${customerName.trim()}`] : []),
      ...(orderNote.trim() ? [`Note: ${orderNote.trim()}`] : []),
    ];
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <header className="flex h-20 items-center justify-between border-b border-border">
          <a href="/" className="flex items-center gap-2" aria-label="Online Kosamba home">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground"><Coffee className="size-5" /></span>
            <span className="font-display text-xl font-bold">Online Kosamba</span>
          </a>
          <button onClick={() => setCheckoutOpen(true)} className="relative inline-flex size-10 items-center justify-center rounded-full border border-border transition-colors hover:bg-secondary" aria-label={`Open basket, ${itemCount} items`}>
            <ShoppingBag className="size-5" />
            {itemCount > 0 && <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs text-primary-foreground">{itemCount}</span>}
          </button>
        </header>

        <section className="grid items-center gap-8 pb-14 pt-9 md:grid-cols-[1.02fr_0.98fr] md:gap-12 md:pb-20 md:pt-12">
          <div className="order-2 md:order-1">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Fresh mornings, Kosamba style</p>
            <h1 className="max-w-xl font-display text-5xl font-bold leading-[1.02] sm:text-6xl">A better morning starts <span className="text-primary">here.</span></h1>
            <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">Warm, filling breakfast favourites made for your morning. Choose what you love and order in a few taps.</p>
            <a href="#menu" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-foreground transition-colors hover:text-primary">Explore the menu <ArrowRight className="size-4" /></a>
          </div>
          <div className="order-1 overflow-hidden rounded-2xl bg-secondary md:order-2">
            <img src={breakfastPhoto} alt="Fresh poha and a glass of chai at Online Kosamba" width={1280} height={960} className="aspect-[4/3] h-full w-full object-cover" fetchPriority="high" />
          </div>
        </section>

        <section id="menu" className="border-t border-border pb-24 pt-10">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Made for your morning</p><h2 className="mt-2 font-display text-3xl font-bold">Breakfast menu</h2></div>
            {categories.length > 0 && <div className="flex max-w-full gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Breakfast categories"><button role="tab" aria-selected={currentCategory === ALL_ITEMS_CATEGORY} onClick={() => setSelectedCategory(ALL_ITEMS_CATEGORY)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${currentCategory === ALL_ITEMS_CATEGORY ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}>All items</button>{categories.map((category) => <button key={category} role="tab" aria-selected={currentCategory === category} onClick={() => setSelectedCategory(category)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${currentCategory === category ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}>{category}</button>)}</div>}
          </div>
          {categoryItems.length > 0 ? <div className="mt-7 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">{categoryItems.map((item) => <article key={item.id} className="flex min-h-32 items-center justify-between gap-4 border-b border-border py-5"><div className="min-w-0"><h3 className="font-display text-lg font-semibold">{item.name}</h3><p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{item.description}</p><p className="mt-2 text-sm font-semibold">₹{item.price.toFixed(2)}</p></div><div className="flex shrink-0 items-center gap-2">{(cart[item.id] ?? 0) > 0 && <><Button size="icon" variant="outline" aria-label={`Remove one ${item.name}`} onClick={() => changeQuantity(item.id, -1)}><Minus /></Button><span className="min-w-5 text-center text-sm font-semibold">{cart[item.id]}</span></>}<Button size="icon" variant={(cart[item.id] ?? 0) > 0 ? "secondary" : "default"} aria-label={`Add ${item.name} to basket`} onClick={() => changeQuantity(item.id, 1)}><Plus /></Button></div></article>)}</div> : <div className="py-14 text-center text-muted-foreground">The menu is being prepared. Check back soon.</div>}
        </section>
      </div>

      {itemCount > 0 && <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 p-4 backdrop-blur-sm"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-1 sm:px-7"><div><p className="text-sm font-semibold">{itemCount} {itemCount === 1 ? "item" : "items"}</p><p className="text-sm text-muted-foreground">₹{subtotal.toFixed(2)}</p></div><Button onClick={() => setCheckoutOpen(true)} className="min-w-40">Checkout <ArrowRight /></Button></div></div>}

      {checkoutOpen && <div className="fixed inset-0 z-30 flex items-end justify-center bg-foreground/35 sm:items-center sm:p-4" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setCheckoutOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="checkout-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-background p-6 sm:rounded-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Almost there</p><h2 id="checkout-title" className="mt-1 font-display text-2xl font-bold">Your order</h2></div><Button variant="ghost" size="sm" onClick={() => setCheckoutOpen(false)}>Close</Button></div>
        {cartItems.length === 0 ? <p className="py-10 text-center text-muted-foreground">Your basket is empty.</p> : <><div className="mt-4 divide-y divide-border">{cartItems.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 py-3"><div><p className="font-medium">{item.name}</p><p className="text-sm text-muted-foreground">₹{item.price.toFixed(2)} each</p></div><div className="flex items-center gap-2"><Button size="icon" variant="outline" aria-label={`Remove one ${item.name}`} onClick={() => changeQuantity(item.id, -1)}><Minus /></Button><span className="min-w-5 text-center">{cart[item.id]}</span><Button size="icon" variant="outline" aria-label={`Add one ${item.name}`} onClick={() => changeQuantity(item.id, 1)}><Plus /></Button></div><span className="w-20 text-right font-semibold">₹{(item.price * (cart[item.id] ?? 0)).toFixed(2)}</span></div>)}</div>
          <label className="mt-4 block text-sm font-medium">Your name (optional)<input maxLength={80} value={customerName} onChange={(event) => setCustomerName(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-base outline-none focus-visible:ring-1 focus-visible:ring-ring" /></label>
          <label className="mt-4 block text-sm font-medium">Order note (optional)<textarea maxLength={240} value={orderNote} onChange={(event) => setOrderNote(event.target.value)} rows={2} className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus-visible:ring-1 focus-visible:ring-ring" /></label>
          <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-lg font-bold"><span>Total</span><span>₹{subtotal.toFixed(2)}</span></div>
          <Button className="mt-4 w-full" disabled={!whatsappNumber || cartItems.length === 0} onClick={placeOrder}>Continue on WhatsApp <ArrowRight /></Button>{!whatsappNumber && <p className="mt-2 text-center text-sm text-muted-foreground">WhatsApp ordering is not set up yet.</p>}
        </>}
        </section></div>}
      <footer className="border-t border-border py-7"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 text-sm text-muted-foreground sm:px-8"><span>© Online Kosamba</span><a href="/manager" className="transition-colors hover:text-foreground">Manager</a></div></footer>
    </main>
  );
}
