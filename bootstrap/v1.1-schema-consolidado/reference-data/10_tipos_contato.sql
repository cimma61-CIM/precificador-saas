INSERT INTO public.tipos_contato (nome)
VALUES ('Cliente'), ('Fornecedor'), ('Vendedor')
ON CONFLICT (nome) DO NOTHING;
