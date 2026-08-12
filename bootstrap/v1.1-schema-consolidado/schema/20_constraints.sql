ALTER TABLE public.categorias
  ADD CONSTRAINT categorias_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;

ALTER TABLE public.categorias
  ADD CONSTRAINT categorias_marketplace_id_fkey
  FOREIGN KEY (marketplace_id) REFERENCES public.marketplaces(id) ON DELETE SET NULL;

ALTER TABLE public.produtos
  ADD CONSTRAINT produtos_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;

ALTER TABLE public.produtos
  ADD CONSTRAINT produtos_categoria_id_fkey
  FOREIGN KEY (categoria_id) REFERENCES public.categorias(id) ON DELETE SET NULL;

ALTER TABLE public.contatos
  ADD CONSTRAINT contatos_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;

ALTER TABLE public.contato_tipos
  ADD CONSTRAINT contato_tipos_contato_id_fkey
  FOREIGN KEY (contato_id) REFERENCES public.contatos(id) ON DELETE CASCADE;

ALTER TABLE public.contato_tipos
  ADD CONSTRAINT contato_tipos_tipo_id_fkey
  FOREIGN KEY (tipo_id) REFERENCES public.tipos_contato(id) ON DELETE CASCADE;

ALTER TABLE public.historico_produtos
  ADD CONSTRAINT historico_produtos_produto_id_fkey
  FOREIGN KEY (produto_id) REFERENCES public.produtos(id) ON DELETE CASCADE;

ALTER TABLE public.historico_produtos
  ADD CONSTRAINT historico_produtos_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;

ALTER TABLE public.compras
  ADD CONSTRAINT compras_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;

ALTER TABLE public.compras
  ADD CONSTRAINT compras_fornecedor_id_fkey
  FOREIGN KEY (fornecedor_id) REFERENCES public.contatos(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.compras.fornecedor_id IS 'Fornecedor associado à compra; compras antigas podem não ter fornecedor definido.';

ALTER TABLE public.compras_itens
  ADD CONSTRAINT compras_itens_compra_id_fkey
  FOREIGN KEY (compra_id) REFERENCES public.compras(id) ON DELETE CASCADE;

ALTER TABLE public.compras_itens
  ADD CONSTRAINT compras_itens_produto_id_fkey
  FOREIGN KEY (produto_id) REFERENCES public.produtos(id) ON DELETE RESTRICT;

ALTER TABLE public.produto_fornecedor
  ADD CONSTRAINT produto_fornecedor_produto_id_fkey
  FOREIGN KEY (produto_id) REFERENCES public.produtos(id) ON DELETE CASCADE;

ALTER TABLE public.produto_fornecedor
  ADD CONSTRAINT produto_fornecedor_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;

ALTER TABLE public.produtos_marketplaces
  ADD CONSTRAINT produtos_marketplaces_produto_id_fkey
  FOREIGN KEY (produto_id) REFERENCES public.produtos(id) ON DELETE CASCADE;

ALTER TABLE public.produtos_marketplaces
  ADD CONSTRAINT produtos_marketplaces_marketplace_id_fkey
  FOREIGN KEY (marketplace_id) REFERENCES public.marketplaces(id) ON DELETE RESTRICT;

ALTER TABLE public.produtos_marketplaces
  ADD CONSTRAINT produtos_marketplaces_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;

ALTER TABLE public.taxas_marketplace
  ADD CONSTRAINT taxas_marketplace_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;

ALTER TABLE public.taxas_marketplace
  ADD CONSTRAINT taxas_marketplace_marketplace_id_fkey
  FOREIGN KEY (marketplace_id) REFERENCES public.marketplaces(id) ON DELETE RESTRICT;
