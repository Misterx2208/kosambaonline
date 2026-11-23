DROP POLICY "Anyone can view store contact settings" ON public.store_settings;
CREATE POLICY "Public can view main store contact settings"
ON public.store_settings
FOR SELECT
TO anon, authenticated
USING (id = 'main');