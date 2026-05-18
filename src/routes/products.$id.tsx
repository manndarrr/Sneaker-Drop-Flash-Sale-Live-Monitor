import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
  sizes: number[];
};

export const Route = createFileRoute("/products/$id")({
  component: ProductDetail,
});

const randomHandle = () => {
  const adj = ["hyped", "iced", "stealth", "rare", "kicks", "drip", "vault", "raw"];
  const n = Math.floor(Math.random() * 9999).toString().padStart(4, "0");
  return `@${adj[Math.floor(Math.random() * adj.length)]}_${n}`;
};

function ProductDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [size, setSize] = useState<number>(10);
  const [handle, setHandle] = useState(randomHandle());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.from("products").select("*").eq("id", id).single().then(({ data }) => {
      if (data) setProduct(data as Product);
    });
  }, [id]);

  const enter = async () => {
    if (!product) return;
    setSubmitting(true);
    const { error } = await supabase.from("orders").insert({
      customer_name: handle,
      product_id: product.id,
      product_name: `${product.brand} ${product.name} (Size ${size})`,
      size: String(size),
      status: "pending",
    });
    setSubmitting(false);
    if (!error) navigate({ to: "/drop" });
  };

  if (!product) return <main className="mx-auto max-w-7xl px-6 pt-16">Loading…</main>;

  return (
    <main className="mx-auto max-w-7xl px-6 pt-12 pb-24">
      <Link to="/products" className="text-sm text-muted-foreground hover:text-foreground">← Back to catalog</Link>
      <div className="mt-6 grid md:grid-cols-2 gap-12">
        <div className="aspect-square rounded-3xl bg-card overflow-hidden">
          <img src={product.image_path} alt={`${product.brand} ${product.name}`} className="h-full w-full object-cover" />
        </div>
        <div>
          <p className="text-sm uppercase tracking-widest text-muted-foreground">{product.brand}</p>
          <h1 className="mt-2 text-5xl font-display">{product.name}</h1>
          <p className="mt-2 text-muted-foreground">{product.colorway}</p>
          <p className="mt-6 text-3xl font-display">{money(product.price_cents)}</p>

          <div className="mt-8">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Size (US)</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[7, 8, 9, 10, 11, 12].map((s) => (
                <button key={s} onClick={() => setSize(s)}
                  className={`h-12 w-12 rounded-full border text-sm transition-colors ${size === s ? "bg-ink text-ink-foreground border-ink" : "bg-card border-border hover:border-ink"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Your handle</label>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className="mt-2 w-full rounded-full border border-border bg-card px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <button
            onClick={enter}
            disabled={submitting || !handle.trim()}
            className="mt-8 w-full rounded-full bg-ink text-ink-foreground py-4 text-sm disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Enter the raffle →"}
          </button>
          <p className="mt-3 text-xs text-muted-foreground text-center">
            Your order lands as <span className="font-medium">pending</span> and pushes live to every viewer of /drop.
          </p>
        </div>
      </div>
    </main>
  );
}
