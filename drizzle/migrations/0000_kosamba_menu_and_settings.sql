CREATE TABLE public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 240),
  category text NOT NULL DEFAULT 'Breakfast' CHECK (char_length(category) BETWEEN 1 AND 60),
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.menu_items TO anon, authenticated;
GRANT ALL ON public.menu_items TO service_role;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view enabled menu items" ON public.menu_items FOR SELECT TO anon, authenticated USING (enabled = true);

CREATE TABLE public.store_settings (
  id text PRIMARY KEY DEFAULT 'main' CHECK (id = 'main'),
  whatsapp_number text NOT NULL DEFAULT '' CHECK (char_length(whatsapp_number) <= 20),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_settings TO anon, authenticated;
GRANT ALL ON public.store_settings TO service_role;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view store contact settings" ON public.store_settings FOR SELECT TO anon, authenticated USING (true);