ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users"
  ON public.exchange_rates
  FOR SELECT
  TO public
  USING (true);
