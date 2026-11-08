CREATE TABLE IF NOT EXISTS categorias (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS fornecedores (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  contacto VARCHAR(150),
  telefone VARCHAR(30)
);

CREATE TABLE IF NOT EXISTS produtos (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(30) NOT NULL UNIQUE,
  nome VARCHAR(120) NOT NULL,
  categoria_id INT REFERENCES categorias(id),
  fornecedor_id INT REFERENCES fornecedores(id),
  unidade VARCHAR(10) NOT NULL DEFAULT 'un',
  preco_custo NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (preco_custo >= 0),
  preco_venda NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (preco_venda >= 0),
  stock_minimo NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- O stock não é guardado: é a soma dos movimentos. Assim nunca fica dessincronizado.
CREATE TABLE IF NOT EXISTS movimentos (
  id SERIAL PRIMARY KEY,
  produto_id INT NOT NULL REFERENCES produtos(id),
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste')),
  quantidade NUMERIC(12,3) NOT NULL CHECK (quantidade <> 0),
  motivo VARCHAR(20) NOT NULL,
  custo_unitario NUMERIC(10,2) CHECK (custo_unitario >= 0),
  nota VARCHAR(250),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  CHECK (
    (tipo = 'entrada' AND quantidade > 0) OR
    (tipo = 'saida' AND quantidade < 0) OR
    tipo = 'ajuste'
  )
);

CREATE INDEX IF NOT EXISTS idx_movimentos_produto ON movimentos (produto_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_movimentos_data ON movimentos (criado_em DESC);

-- Impede que o stock fique negativo, mesmo com pedidos em simultâneo:
-- bloqueia o produto e confere a soma antes de aceitar o movimento.
CREATE OR REPLACE FUNCTION validar_stock() RETURNS TRIGGER AS $$
DECLARE
  atual NUMERIC;
BEGIN
  PERFORM 1 FROM produtos WHERE id = NEW.produto_id FOR UPDATE;
  SELECT COALESCE(SUM(quantidade), 0) INTO atual FROM movimentos WHERE produto_id = NEW.produto_id;
  IF atual + NEW.quantidade < 0 THEN
    RAISE EXCEPTION 'Stock insuficiente: disponível %', atual USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validar_stock ON movimentos;
CREATE TRIGGER trg_validar_stock
  BEFORE INSERT ON movimentos
  FOR EACH ROW EXECUTE FUNCTION validar_stock();

CREATE OR REPLACE VIEW produtos_stock AS
SELECT p.*,
       c.nome AS categoria_nome,
       f.nome AS fornecedor_nome,
       COALESCE(m.stock, 0) AS stock,
       COALESCE(m.stock, 0) * p.preco_custo AS valor_stock,
       CASE
         WHEN COALESCE(m.stock, 0) <= 0 THEN 'sem_stock'
         WHEN COALESCE(m.stock, 0) < p.stock_minimo THEN 'baixo'
         ELSE 'ok'
       END AS estado
FROM produtos p
LEFT JOIN categorias c ON c.id = p.categoria_id
LEFT JOIN fornecedores f ON f.id = p.fornecedor_id
LEFT JOIN (SELECT produto_id, SUM(quantidade) AS stock FROM movimentos GROUP BY produto_id) m
       ON m.produto_id = p.id;
