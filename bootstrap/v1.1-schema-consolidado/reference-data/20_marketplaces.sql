INSERT INTO public.marketplaces (nome, slug)
VALUES
  ('Mercado Livre', 'mercado_livre'),
  ('Shopee', 'shopee'),
  ('Amazon', 'amazon'),
  ('Magalu', 'magalu')
ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome;
