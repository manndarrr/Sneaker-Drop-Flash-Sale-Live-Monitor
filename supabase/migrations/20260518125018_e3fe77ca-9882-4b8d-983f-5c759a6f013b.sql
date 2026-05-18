
-- Replace the public read policy on orders with an owner-scoped one
DROP POLICY IF EXISTS "Public read orders" ON public.orders;

CREATE POLICY "Users can view their own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Realtime authorization: only allow users to subscribe to their own order topic
-- Topic convention used by clients: postgres_changes filter user_id=eq.<uid>
-- We restrict realtime.messages so authenticated users can only read messages
-- on topics that match their own user id.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read own realtime topic" ON realtime.messages;
CREATE POLICY "Authenticated can read own realtime topic"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE '%user_id=eq.' || auth.uid()::text || '%'
  OR realtime.topic() LIKE 'products-orders-feed-' || auth.uid()::text
);
