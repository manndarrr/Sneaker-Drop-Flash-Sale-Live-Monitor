<div align="center">
  <h1>Sneaker Drop — Flash-Sale Live Monitor</h1>
  <p><strong>Real-Time Hypebeast Order Tracker | Supabase Realtime (WebSockets) | TanStack Start</strong></p>
</div>

---

## Project Overview
**Sneaker Drop** is a high-performance, live-monitoring web application built to simulate flash-sale traffic and raffle completions during limited-edition sneaker releases. 

Instead of relying on heavy client-side polling or manual browser refreshes, the platform uses **Supabase Realtime over WebSockets (via Postgres Change streams)** to instantly push state changes (placing orders, fulfillment status advances) directly to all active clients. The frontend is built using a raw, content-first aesthetic mimicking high-end streetwear editorial platforms like *StyleUps*, featuring a clean, minimalist off-white palette.

### Dashboard Preview
<p align="center">
  <img src="dashboard.png" width="850" title="Admin Portal Overview"> 
</p>



---

## Architectural Choice & Technical Approach

### 1. Eliminating Client Polling (The Realtime Engine)
To capture the rapid pace of an online flash sale, traditional HTTP polling introduces unnecessary server load and unacceptable data lag. This solution utilizes a **Postgres LISTEN/NOTIFY pipeline** exposed securely via Supabase WebSockets. 
* The `orders` database table is added directly to the `supabase_realtime` publication channel.
* By setting `REPLICA IDENTITY FULL`, Supabase broadcasts not just the row ID, but the entire mutated data payload on `INSERT`, `UPDATE`, and `DELETE` hooks.

### 2. The Hybrid Server Infrastructure (TanStack Start)
The project utilizes **TanStack Start**, combining React with a high-performance Node.js-based server runtime. 
* **Frontend:** Kept intentionally lightweight, semantic, and CSS-driven using Tailwind tokens. It completely avoids over-engineered component libraries to preserve rendering speeds during heavy live streams.
* **Backend State Simulation:** A background server-side ticker acts as a "hypebeast simulator." Controlled via client tab visibility, it randomly advances raffle orders from `pending` ➔ `shipped` ➔ `delivered`. This creates a living data system without polluting the client with artificial read logic.

---

## Database Schema & Migrations

The backend schema utilizes two core tables built inside the Cloud environment:

```sql
-- Products Catalog
CREATE TABLE products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    brand text NOT NULL,
    colorway text NOT NULL,
    price_cents integer NOT NULL,
    image_path text NOT NULL,
    sizes jsonb NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Real-Time Raffle Orders
CREATE TABLE orders (
    id bigserial PRIMARY KEY, -- Using bigserial to provide rapid, human-readable integer sequences
    customer_name text NOT NULL,
    product_id uuid REFERENCES products(id) ON DELETE CASCADE,
    product_name text NOT NULL, -- Snapshot field to prevent downstream JOIN latency during spikes
    size text NOT NULL,
    status text CHECK (status IN ('pending', 'shipped', 'delivered')) DEFAULT 'pending',
    updated_at timestamptz DEFAULT now()
);

-- Enable Realtime Broadcast
ALTER TABLE orders REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
