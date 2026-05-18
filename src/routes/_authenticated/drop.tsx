import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { statusClass, timeAgo } from "@/lib/format";

type Order = {
  id: number;
  customer_name: string;
  product_id: string | null;
  product_name: string;
  size: string;
  status: "pending" | "shipped" | "delivered";
  updated_at: string;
  created_at: string;
};

type Product = { id: string; name: string; brand: string; image_path: string };

export const Route = createFileRoute("/_authenticated/drop")({
  head: () => ({
    meta: [
      { title: "Live Drop Monitor — Sneaker Drop" },
      { name: "description", content: "Watch sneaker raffle orders flip from pending to shipped to delivered in real time via Supabase Realtime." },
    ],
  }),
  component: DropPage,
});

const STATUSES = ["all", "pending", "shipped", "delivered"] as const;

function DropPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [filter, setFilter] = useState<(typeof STATUSES)[number]>("all");
  const [connected, setConnected] = useState(false);
  const [flashIds, setFlashIds] = useState<Set<number>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  

  // Initial fetch + realtime subscription scoped to current user
  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;
      setUserId(user.id);

      const [{ data: o }, { data: p }] = await Promise.all([
        supabase.from("orders").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(100),
        supabase.from("products").select("id,name,brand,image_path"),
      ]);
      if (!mounted) return;
      if (o) setOrders(o as Order[]);
      if (p) {
        const map: Record<string, Product> = {};
        for (const row of p as Product[]) map[row.id] = row;
        setProducts(map);
      }

      channel = supabase
        .channel(`orders-feed-${user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` },
          (payload) => {
            setOrders((prev) => {
              const next = [...prev];
              if (payload.eventType === "INSERT") {
                const row = payload.new as Order;
                next.unshift(row);
                flash(row.id);
              } else if (payload.eventType === "UPDATE") {
                const row = payload.new as Order;
                const idx = next.findIndex((r) => r.id === row.id);
                if (idx >= 0) next[idx] = row; else next.unshift(row);
                const i = next.findIndex((r) => r.id === row.id);
                if (i > 0) { const [r] = next.splice(i, 1); next.unshift(r); }
                flash(row.id);
              } else if (payload.eventType === "DELETE") {
                const old = payload.old as { id: number };
                return next.filter((r) => r.id !== old.id);
              }
              return next.slice(0, 200);
            });
          }
        )
        .subscribe((status) => setConnected(status === "SUBSCRIBED"));
    })();

    return () => { mounted = false; if (channel) supabase.removeChannel(channel); };
  }, []);

  const flash = (id: number) => {
    setFlashIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setFlashIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }, 1700);
  };

  // Status updates are driven only by database changes (no client-side auto-advance).

  const filtered = useMemo(
    () => filter === "all" ? orders : orders.filter((o) => o.status === filter),
    [orders, filter]
  );

  const counts = useMemo(() => ({
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    shipped: orders.filter((o) => o.status === "shipped").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
  }), [orders]);

  return (
    <main className="mx-auto max-w-7xl px-6 pt-12 pb-24">
      <div className="flex items-end justify-between flex-wrap gap-6">
        <div>
          <p className="text-sm uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-accent animate-pulse" : "bg-muted-foreground"}`} />
            {connected ? "Live · subscribed" : "Connecting…"}
          </p>
          <h1 className="mt-2 text-5xl font-display font-sans">Drop Monitor</h1>
          <p className="mt-2 text-muted-foreground">Every order insert and status change is in real time.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total orders", value: counts.total, tone: "bg-card" },
          { label: "Pending", value: counts.pending, tone: "bg-pending text-pending-foreground" },
          { label: "Shipped", value: counts.shipped, tone: "bg-shipped text-shipped-foreground" },
          { label: "Delivered", value: counts.delivered, tone: "bg-delivered text-delivered-foreground" },
        ].map((s) => (
          <div key={s.label} className={`rounded-3xl p-5 ${s.tone}`}>
            <p className="text-xs uppercase tracking-widest opacity-70">{s.label}</p>
            <p className="mt-1 font-display text-4xl font-sans">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mt-8 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-1.5 text-sm capitalize border transition-colors ${filter === s ? "bg-ink text-ink-foreground border-ink" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}
          >{s}</button>
        ))}
      </div>

      {/* Feed */}
      <div className="mt-6 rounded-3xl border border-border overflow-hidden bg-card">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            No orders yet. <Link to="/products" className="underline">Place one</Link> to kick things off.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((o) => {
              const product = o.product_id ? products[o.product_id] : undefined;
              const flashing = flashIds.has(o.id);
              return (
                <li key={o.id} className={`flex items-center gap-4 p-4 ${flashing ? "row-flash" : ""}`}>
                  <div className="h-14 w-14 rounded-2xl bg-muted overflow-hidden shrink-0">
                    {product && <img src={product.image_path} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{o.product_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{o.customer_name} · #{o.id}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs capitalize ${statusClass(o.status)}`}>{o.status}</span>
                  <span className="hidden md:block text-xs text-muted-foreground w-20 text-right tabular-nums">{timeAgo(o.updated_at)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        {"\n"}
      </p>
    </main>
  );
}
