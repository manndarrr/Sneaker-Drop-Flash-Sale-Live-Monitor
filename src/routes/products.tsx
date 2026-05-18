import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/format";

type Product = {
  id: string;
  name: string;
  brand: string;
  colorway: string;
  price_cents: number;
  image_path: string;
};

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Catalog — Sneaker Drop" },
      { name: "description", content: "Every silhouette in the drop. Adidas Samba, Nike Dunk, Yeezy 350, Jordan 1 and more." },
    ],
  }),
  component: ProductsPage,
});


function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [brand, setBrand] = useState<string>("All");
  const [ordering, setOrdering] = useState<string | null>(null);
  const [liveCount, setLiveCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("products").select("*").order("brand").then(({ data }) => {
      if (data) setProducts(data as Product[]);
    });

    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async (uid: string | null) => {
      setUserId(uid);
      if (channel) { supabase.removeChannel(channel); channel = null; }
      if (!uid) { setLiveCount(0); return; }

      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid);
      if (count != null) setLiveCount(count);

      channel = supabase
        .channel(`products-orders-feed-${uid}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders", filter: `user_id=eq.${uid}` }, (payload) => {
          setLiveCount((c) => c + 1);
          const row = payload.new as { product_name: string };
          toast.success("New order placed", { description: row.product_name });
        })
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "orders", filter: `user_id=eq.${uid}` }, () => {
          setLiveCount((c) => Math.max(0, c - 1));
        })
        .subscribe();
    };

    supabase.auth.getSession().then(({ data }) => init(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => init(session?.user.id ?? null));

    return () => { sub.subscription.unsubscribe(); if (channel) supabase.removeChannel(channel); };
  }, []);

  const navigate = useNavigate();

  const placeOrder = async (p: Product) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sign in required", { description: "Create an account to place an order." });
      navigate({ to: "/login" });
      return;
    }
    setOrdering(p.id);
    const size = 9 + Math.floor(Math.random() * 3);
    const { data: prof } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
    const handle = prof?.display_name || user.email?.split("@")[0] || "customer";
    const { error } = await supabase.from("orders").insert({
      customer_name: handle,
      product_id: p.id,
      product_name: `${p.brand} ${p.name} (Size ${size})`,
      size: String(size),
      status: "pending",
      user_id: user.id,
    });
    setOrdering(null);
    if (error) toast.error("Order failed", { description: error.message });
    else toast.success(`Ordered ${p.brand} ${p.name}`, { description: "Track it in your profile." });
  };

  const brands = ["All", ...Array.from(new Set(products.map((p) => p.brand)))];
  const filtered = brand === "All" ? products : products.filter((p) => p.brand === brand);

  return (
    <main className="mx-auto max-w-7xl px-6 pt-16 pb-24">
      <div className="flex items-end justify-between flex-wrap gap-6">
        <div>
          {userId && (
            <p className="text-sm uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              Live · {liveCount} orders
            </p>
          )}
          <h1 className="mt-2 text-5xl font-display">Catalog</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {brands.map((b) => (
            <button
              key={b}
              onClick={() => setBrand(b)}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${brand === b ? "bg-ink text-ink-foreground border-ink" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}
            >{b}</button>
          ))}
        </div>
      </div>

      <div className="mt-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filtered.map((p) => (
          <div key={p.id} className="group">
            <Link to="/products/$id" params={{ id: p.id }}>
              <div className="aspect-square overflow-hidden rounded-3xl bg-card">
                <img src={p.image_path} alt={`${p.brand} ${p.name}`} loading="lazy" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700" />
              </div>
            </Link>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{p.brand}</p>
                <p className="text-sm truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground truncate">{p.colorway}</p>
              </div>
              <span className="text-sm font-medium shrink-0">{money(p.price_cents)}</span>
            </div>
            <button
              onClick={() => placeOrder(p)}
              disabled={ordering === p.id}
              className="mt-3 w-full rounded-full bg-ink text-ink-foreground py-2.5 text-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {ordering === p.id ? "Ordering…" : "Order"}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
