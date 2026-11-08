-- Dados de demonstração (uma mercearia de bairro). Só corre se a base estiver vazia.
-- Simula 30 dias de movimentos: cada saída só é feita se houver stock, e há reposições.
DO $$
DECLARE
  r RECORD;
  s NUMERIC;
  q NUMERIC;
  d INT;
  dia TIMESTAMP;
  alvo NUMERIC;
BEGIN
  IF EXISTS (SELECT 1 FROM produtos) THEN
    RETURN;
  END IF;

  INSERT INTO categorias (id, nome) VALUES
    (1, 'Bebidas'), (2, 'Mercearia'), (3, 'Laticínios'),
    (4, 'Higiene e limpeza'), (5, 'Snacks'), (6, 'Frescos');

  INSERT INTO fornecedores (id, nome, contacto, telefone) VALUES
    (1, 'Distribuidora Central', 'encomendas@distcentral.pt', '210 100 200'),
    (2, 'Mercearia & Cia Grossista', 'vendas@merceariacia.pt', '220 300 400'),
    (3, 'Lacticínios do Vale', 'geral@lacvale.pt', '259 500 600'),
    (4, 'Higiene Total', 'comercial@higienetotal.pt', '213 700 800'),
    (5, 'Snack Express', 'pedidos@snackexpress.pt', '218 900 100');

  PERFORM setval('categorias_id_seq', 6);
  PERFORM setval('fornecedores_id_seq', 5);

  FOR r IN
    SELECT * FROM (VALUES
      (1,  'BEB-001', 'Água 1,5L',               1, 1, 'un', 0.35, 0.69, 48,  14),
      (2,  'BEB-002', 'Sumo de laranja 1L',      1, 1, 'un', 0.95, 1.79, 24,   5),
      (3,  'BEB-003', 'Cerveja lager 33cl',      1, 1, 'un', 0.45, 0.99, 72,  20),
      (4,  'BEB-004', 'Refrigerante cola 1,5L',  1, 1, 'un', 0.85, 1.59, 24,   6),
      (5,  'BEB-005', 'Vinho tinto 75cl',        1, 1, 'un', 3.20, 6.90, 12,   2),
      (6,  'MER-001', 'Arroz carolino 1kg',      2, 2, 'un', 0.89, 1.49, 20,   3),
      (7,  'MER-002', 'Esparguete 500g',         2, 2, 'un', 0.55, 0.99, 30,   4),
      (8,  'MER-003', 'Azeite virgem extra 750ml', 2, 2, 'un', 4.90, 7.99, 12, 1),
      (9,  'MER-004', 'Atum em lata',            2, 2, 'un', 0.90, 1.69, 36,   5),
      (10, 'MER-005', 'Açúcar 1kg',              2, 2, 'un', 0.70, 1.19, 18,   2),
      (11, 'MER-006', 'Café moído 250g',         2, 2, 'un', 1.90, 3.49, 20,   3),
      (12, 'MER-007', 'Bolachas Maria',          2, 2, 'un', 0.60, 1.09, 30,   4),
      (13, 'LAT-001', 'Leite meio-gordo 1L',     3, 3, 'un', 0.62, 0.99, 48,  12),
      (14, 'LAT-002', 'Iogurte natural',         3, 3, 'un', 0.28, 0.55, 60,  10),
      (15, 'LAT-003', 'Queijo flamengo fatiado', 3, 3, 'un', 1.80, 3.20, 12,   2),
      (16, 'LAT-004', 'Manteiga 250g',           3, 3, 'un', 1.50, 2.59, 12,   2),
      (17, 'HIG-001', 'Detergente loiça 750ml',  4, 4, 'un', 1.10, 1.99, 12,   2),
      (18, 'HIG-002', 'Papel higiénico 8 rolos', 4, 4, 'un', 2.40, 3.99, 15,   2),
      (19, 'HIG-003', 'Lixívia 2L',              4, 4, 'un', 0.80, 1.49, 10,   1),
      (20, 'HIG-004', 'Sabonete',                4, 4, 'un', 0.45, 0.89, 24,   3),
      (21, 'SNK-001', 'Batatas fritas 150g',     5, 5, 'un', 0.90, 1.69, 24,   4),
      (22, 'SNK-002', 'Chocolate de leite 100g', 5, 5, 'un', 0.70, 1.29, 36,   5),
      (23, 'SNK-003', 'Frutos secos 200g',       5, 5, 'un', 1.60, 2.89, 12,   1),
      (24, 'SNK-004', 'Pastilhas elásticas',     5, 5, 'un', 0.40, 0.79, 30,   3),
      (25, 'FRE-001', 'Maçã Gala',               6, 2, 'kg', 1.10, 1.99, 15,   4),
      (26, 'FRE-002', 'Banana',                  6, 2, 'kg', 0.90, 1.59, 15,   4)
    ) AS t(id, sku, nome, cat, forn, un, custo, venda, minimo, consumo)
  LOOP
    INSERT INTO produtos (id, sku, nome, categoria_id, fornecedor_id, unidade, preco_custo,
                          preco_venda, stock_minimo)
    VALUES (r.id, r.sku, r.nome, r.cat, r.forn, r.un, r.custo, r.venda, r.minimo);

    s := 0;
    dia := date_trunc('day', NOW()) - INTERVAL '30 days' + INTERVAL '8 hours';

    -- Stock inicial
    INSERT INTO movimentos (produto_id, tipo, quantidade, motivo, custo_unitario, nota, criado_em)
    VALUES (r.id, 'entrada', r.minimo * 3, 'compra', r.custo, 'Stock inicial', dia);
    s := r.minimo * 3;

    FOR d IN 1..29 LOOP
      dia := date_trunc('day', NOW()) - ((30 - d) || ' days')::INTERVAL;
      q := ROUND(r.consumo * (0.5 + ((r.id * 13 + d * 7) % 10) / 10.0), CASE WHEN r.un = 'kg' THEN 1 ELSE 0 END);

      -- Reposição quando o stock desce abaixo do mínimo ou não chega para a venda do dia.
      IF s < r.minimo OR s < q THEN
        INSERT INTO movimentos (produto_id, tipo, quantidade, motivo, custo_unitario, criado_em)
        VALUES (r.id, 'entrada', r.minimo * 3, 'compra', r.custo, dia + INTERVAL '8 hours 30 minutes');
        s := s + r.minimo * 3;
      END IF;

      IF q > 0 AND s >= q THEN
        INSERT INTO movimentos (produto_id, tipo, quantidade, motivo, criado_em)
        VALUES (r.id, 'saida', -q, 'venda', dia + ((9 + (r.id + d) % 9) || ' hours')::INTERVAL);
        s := s - q;
      END IF;

      -- Algumas perdas e ajustes de inventário pontuais.
      IF d = 12 AND r.id % 6 = 0 AND s >= 1 THEN
        INSERT INTO movimentos (produto_id, tipo, quantidade, motivo, nota, criado_em)
        VALUES (r.id, 'saida', -1, 'perda', 'Embalagem danificada', dia + INTERVAL '15 hours');
        s := s - 1;
      END IF;
      IF d = 20 AND r.id % 7 = 0 AND s >= 2 THEN
        INSERT INTO movimentos (produto_id, tipo, quantidade, motivo, nota, criado_em)
        VALUES (r.id, 'ajuste', -2, 'inventario', 'Contagem de inventário', dia + INTERVAL '19 hours');
        s := s - 2;
      END IF;
    END LOOP;

    -- Deixa alguns produtos abaixo do mínimo, e dois sem stock, para a demonstração.
    alvo := NULL;
    IF r.id IN (3, 6, 13, 18, 22, 25) THEN
      alvo := ROUND(r.minimo * 0.4, CASE WHEN r.un = 'kg' THEN 1 ELSE 0 END);
    ELSIF r.id IN (5, 23) THEN
      alvo := 0;
    END IF;
    IF alvo IS NOT NULL AND s > alvo THEN
      -- A descida reparte-se pelos últimos 3 dias, para não criar um pico artificial.
      FOR d IN 1..3 LOOP
        q := CASE WHEN d = 3 THEN s - alvo
                  ELSE ROUND((s - alvo) / (4 - d), CASE WHEN r.un = 'kg' THEN 1 ELSE 0 END) END;
        IF q > 0 THEN
          INSERT INTO movimentos (produto_id, tipo, quantidade, motivo, criado_em)
          VALUES (r.id, 'saida', -q, 'venda',
                  date_trunc('day', NOW()) - ((3 - d) || ' days')::INTERVAL + INTERVAL '1 minute');
          s := s - q;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  PERFORM setval('produtos_id_seq', 26);
END $$;
