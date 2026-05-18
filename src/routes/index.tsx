import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sneaker Drop — Live Sneaker Drops" },
      { name: "description", content: "Watch limited sneaker raffle orders move from pending to shipped to delivered in real time." },
    ],
  }),
  component: Index,
});

function Index() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.from("products").select("*").limit(4).then(({ data }) => {
      if (data) setFeatured(data as Product[]);
    });
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setAuthed(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <main className="mx-auto max-w-7xl px-6">
      {/* Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center pt-16 pb-24">
        <div>
          {authed && (
            <span className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 text-xs uppercase tracking-widest">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              Drop is live
            </span>
          )}
          <h1 className="mt-6 text-6xl md:text-7xl font-brand leading-[0.95]">
            Your seat at the<br/>
            <em className="text-accent not-italic font-brand italic">sneaker drop.</em>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-md">
            Enter the raffle, then watch your checkout status flip from pending to shipped to delivered — pushed live from the database the moment it happens. No refresh required.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {authed ? (
              <Link to="/drop" className="rounded-full bg-ink text-ink-foreground px-6 py-3 text-sm inline-flex items-center gap-2">
                Watch the Live Feed →
              </Link>
            ) : (
              <Link to="/login" className="rounded-full bg-ink text-ink-foreground px-6 py-3 text-sm inline-flex items-center gap-2">
                Sign in →
              </Link>
            )}
            <Link to="/products" className="rounded-full border border-border bg-card px-6 py-3 text-sm">
              Browse the Drop
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {featured.map((p, i) => (
            <Link
              key={p.id}
              to="/products/$id"
              params={{ id: p.id }}
              className={`group relative overflow-hidden rounded-3xl bg-card aspect-square ${i % 2 === 0 ? "translate-y-6" : ""}`}
            >
              <img src={p.image_path} alt={`${p.brand} ${p.name}`} loading="lazy" className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute bottom-3 left-3 right-3 bg-background/85 backdrop-blur rounded-2xl px-3 py-2 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{p.brand}</p>
                  <p className="text-sm truncate">{p.name}</p>
                </div>
                <span className="text-sm font-medium shrink-0">{money(p.price_cents)}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

    </main>
  );
}
