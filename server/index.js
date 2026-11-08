require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool, types } = require('pg');

types.setTypeParser(1082, (v) => v);
types.setTypeParser(1114, (v) => v.replace(' ', 'T'));
types.setTypeParser(1700, parseFloat);

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const MOTIVOS = {
  entrada: ['compra', 'devolucao', 'outro'],
  saida: ['venda', 'perda', 'consumo', 'outro'],
  ajuste: ['inventario'],
};
const UNIDADES = ['un', 'kg', 'l', 'cx', 'm'];

const rota = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (erro) {
    if (erro.code === '23514' && /Stock insuficiente/.test(erro.message)) {
      const disponivel = parseFloat(erro.message.match(/disponível ([\d.-]+)/)?.[1] ?? '0');
      return res.status(409).json({
        erro: `Stock insuficiente: só há ${String(disponivel).replace('.', ',')} em stock`,
      });
    }
    if (erro.code === '23505') {
      return res.status(409).json({ erro: 'Já existe um registo com esse valor' });
    }
    console.error(erro);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
};

const texto = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const arredondar = (n, casas = 3) => Math.round((n + Number.EPSILON) * 10 ** casas) / 10 ** casas;

/* ---------- categorias ---------- */

app.get('/categorias', rota(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT c.*, COUNT(p.id) FILTER (WHERE p.ativo)::int AS produtos
    FROM categorias c LEFT JOIN produtos p ON p.categoria_id = c.id
    GROUP BY c.id ORDER BY c.nome`);
  res.json(rows);
}));

app.post('/categorias', rota(async (req, res) => {
  const nome = texto(req.body.nome);
  if (!nome) return res.status(400).json({ erro: 'O nome é obrigatório' });
  const { rows } = await pool.query('INSERT INTO categorias (nome) VALUES ($1) RETURNING *', [nome]);
  res.status(201).json(rows[0]);
}));

app.put('/categorias/:id', rota(async (req, res) => {
  const nome = texto(req.body.nome);
  if (!nome) return res.status(400).json({ erro: 'O nome é obrigatório' });
  const { rows } = await pool.query('UPDATE categorias SET nome = $1 WHERE id = $2 RETURNING *', [
    nome,
    req.params.id,
  ]);
  if (rows.length === 0) return res.status(404).json({ erro: 'Categoria não encontrada' });
  res.json(rows[0]);
}));

app.delete('/categorias/:id', rota(async (req, res) => {
  const uso = await pool.query('SELECT 1 FROM produtos WHERE categoria_id = $1 LIMIT 1', [req.params.id]);
  if (uso.rows.length > 0) {
    return res.status(409).json({ erro: 'Há produtos nesta categoria. Muda-os de categoria primeiro.' });
  }
  const { rowCount } = await pool.query('DELETE FROM categorias WHERE id = $1', [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ erro: 'Categoria não encontrada' });
  res.status(204).send();
}));

/* ---------- fornecedores ---------- */

function lerFornecedor(corpo) {
  const dados = { nome: texto(corpo.nome), contacto: texto(corpo.contacto), telefone: texto(corpo.telefone) };
  return { dados, erro: dados.nome ? null : 'O nome é obrigatório' };
}

app.get('/fornecedores', rota(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT f.*, COUNT(p.id) FILTER (WHERE p.ativo)::int AS produtos
    FROM fornecedores f LEFT JOIN produtos p ON p.fornecedor_id = f.id
    GROUP BY f.id ORDER BY f.nome`);
  res.json(rows);
}));

app.post('/fornecedores', rota(async (req, res) => {
  const { dados, erro } = lerFornecedor(req.body);
  if (erro) return res.status(400).json({ erro });
  const { rows } = await pool.query(
    'INSERT INTO fornecedores (nome, contacto, telefone) VALUES ($1, $2, $3) RETURNING *',
    [dados.nome, dados.contacto, dados.telefone]
  );
  res.status(201).json(rows[0]);
}));

app.put('/fornecedores/:id', rota(async (req, res) => {
  const { dados, erro } = lerFornecedor(req.body);
  if (erro) return res.status(400).json({ erro });
  const { rows } = await pool.query(
    'UPDATE fornecedores SET nome = $1, contacto = $2, telefone = $3 WHERE id = $4 RETURNING *',
    [dados.nome, dados.contacto, dados.telefone, req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ erro: 'Fornecedor não encontrado' });
  res.json(rows[0]);
}));

app.delete('/fornecedores/:id', rota(async (req, res) => {
  const uso = await pool.query('SELECT 1 FROM produtos WHERE fornecedor_id = $1 LIMIT 1', [req.params.id]);
  if (uso.rows.length > 0) {
    return res.status(409).json({ erro: 'Há produtos deste fornecedor. Muda-os de fornecedor primeiro.' });
  }
  const { rowCount } = await pool.query('DELETE FROM fornecedores WHERE id = $1', [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ erro: 'Fornecedor não encontrado' });
  res.status(204).send();
}));

/* ---------- produtos ---------- */

function lerProduto(corpo) {
  const id = (v) => (v === '' || v == null ? null : Number(v));
  const dados = {
    sku: texto(corpo.sku)?.toUpperCase(),
    nome: texto(corpo.nome),
    categoria_id: id(corpo.categoria_id),
    fornecedor_id: id(corpo.fornecedor_id),
    unidade: corpo.unidade || 'un',
    preco_custo: Number(corpo.preco_custo ?? 0),
    preco_venda: Number(corpo.preco_venda ?? 0),
    stock_minimo: Number(corpo.stock_minimo ?? 0),
  };

  let erro = null;
  if (!dados.sku) erro = 'O código (SKU) é obrigatório';
  else if (!dados.nome) erro = 'O nome é obrigatório';
  else if (!UNIDADES.includes(dados.unidade)) erro = 'Unidade inválida';
  else if (!(dados.preco_custo >= 0) || !(dados.preco_venda >= 0)) erro = 'Os preços não podem ser negativos';
  else if (!(dados.stock_minimo >= 0)) erro = 'O stock mínimo não pode ser negativo';
  return { dados, erro };
}

app.get('/produtos', rota(async (req, res) => {
  const { q, categoria_id, estado, arquivados } = req.query;
  const { rows } = await pool.query(
    `SELECT * FROM produtos_stock
     WHERE ($1::boolean OR ativo)
       AND ($2::text IS NULL OR nome ILIKE '%' || $2 || '%' OR sku ILIKE '%' || $2 || '%')
       AND ($3::int IS NULL OR categoria_id = $3::int)
       AND ($4::text IS NULL OR estado = $4)
     ORDER BY nome`,
    [arquivados === 'true', texto(q), categoria_id || null, texto(estado)]
  );
  res.json(rows);
}));

app.get('/produtos/:id', rota(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM produtos_stock WHERE id = $1', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ erro: 'Produto não encontrado' });
  const movimentos = await pool.query(
    'SELECT * FROM movimentos WHERE produto_id = $1 ORDER BY criado_em DESC, id DESC LIMIT 40',
    [req.params.id]
  );
  res.json({ ...rows[0], movimentos: movimentos.rows });
}));

app.post('/produtos', rota(async (req, res) => {
  const { dados, erro } = lerProduto(req.body);
  if (erro) return res.status(400).json({ erro });

  const { rows } = await pool.query(
    `INSERT INTO produtos (sku, nome, categoria_id, fornecedor_id, unidade, preco_custo, preco_venda, stock_minimo)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [dados.sku, dados.nome, dados.categoria_id, dados.fornecedor_id, dados.unidade,
     dados.preco_custo, dados.preco_venda, dados.stock_minimo]
  );

  // Stock inicial opcional: fica registado como a primeira entrada.
  const inicial = Number(req.body.stock_inicial);
  if (inicial > 0) {
    await pool.query(
      `INSERT INTO movimentos (produto_id, tipo, quantidade, motivo, custo_unitario, nota)
       VALUES ($1, 'entrada', $2, 'compra', $3, 'Stock inicial')`,
      [rows[0].id, inicial, dados.preco_custo]
    );
  }
  const novo = await pool.query('SELECT * FROM produtos_stock WHERE id = $1', [rows[0].id]);
  res.status(201).json(novo.rows[0]);
}));

app.put('/produtos/:id', rota(async (req, res) => {
  const { dados, erro } = lerProduto(req.body);
  if (erro) return res.status(400).json({ erro });

  const { rowCount } = await pool.query(
    `UPDATE produtos SET sku = $1, nome = $2, categoria_id = $3, fornecedor_id = $4, unidade = $5,
       preco_custo = $6, preco_venda = $7, stock_minimo = $8, ativo = COALESCE($9, ativo)
     WHERE id = $10`,
    [dados.sku, dados.nome, dados.categoria_id, dados.fornecedor_id, dados.unidade,
     dados.preco_custo, dados.preco_venda, dados.stock_minimo,
     typeof req.body.ativo === 'boolean' ? req.body.ativo : null, req.params.id]
  );
  if (rowCount === 0) return res.status(404).json({ erro: 'Produto não encontrado' });
  const { rows } = await pool.query('SELECT * FROM produtos_stock WHERE id = $1', [req.params.id]);
  res.json(rows[0]);
}));

// Arquivar em vez de apagar: o histórico de movimentos fica intacto.
app.delete('/produtos/:id', rota(async (req, res) => {
  const { rowCount } = await pool.query('UPDATE produtos SET ativo = FALSE WHERE id = $1', [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ erro: 'Produto não encontrado' });
  res.status(204).send();
}));

/* ---------- movimentos ---------- */

app.get('/movimentos', rota(async (req, res) => {
  const { produto_id, tipo, limite } = req.query;
  const { rows } = await pool.query(
    `SELECT m.*, p.nome AS produto_nome, p.sku, p.unidade
     FROM movimentos m JOIN produtos p ON p.id = m.produto_id
     WHERE ($1::int IS NULL OR m.produto_id = $1::int)
       AND ($2::text IS NULL OR m.tipo = $2)
     ORDER BY m.criado_em DESC, m.id DESC
     LIMIT $3`,
    [produto_id || null, texto(tipo), Math.min(Number(limite) || 100, 500)]
  );
  res.json(rows);
}));

app.post('/movimentos', rota(async (req, res) => {
  const { produto_id, tipo, motivo, nota } = req.body;

  if (!MOTIVOS[tipo]) return res.status(400).json({ erro: 'Tipo de movimento inválido' });
  const motivoFinal = motivo || MOTIVOS[tipo][0];
  if (!MOTIVOS[tipo].includes(motivoFinal)) return res.status(400).json({ erro: 'Motivo inválido' });

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    const produto = (
      await cliente.query('SELECT * FROM produtos WHERE id = $1 AND ativo FOR UPDATE', [produto_id])
    ).rows[0];
    if (!produto) {
      await cliente.query('ROLLBACK');
      return res.status(404).json({ erro: 'Produto não encontrado' });
    }

    let quantidade;
    if (tipo === 'ajuste') {
      // Contagem real: o movimento é a diferença para o stock calculado.
      const novo = Number(req.body.novo_stock);
      if (!(novo >= 0)) {
        await cliente.query('ROLLBACK');
        return res.status(400).json({ erro: 'Indica o stock contado (0 ou mais)' });
      }
      const atual = (
        await cliente.query('SELECT COALESCE(SUM(quantidade), 0) AS s FROM movimentos WHERE produto_id = $1', [produto.id])
      ).rows[0].s;
      quantidade = arredondar(novo - atual);
      if (quantidade === 0) {
        await cliente.query('ROLLBACK');
        return res.status(400).json({ erro: 'O stock contado é igual ao registado' });
      }
    } else {
      const qtd = Number(req.body.quantidade);
      if (!(qtd > 0)) {
        await cliente.query('ROLLBACK');
        return res.status(400).json({ erro: 'A quantidade tem de ser maior que zero' });
      }
      quantidade = tipo === 'entrada' ? arredondar(qtd) : -arredondar(qtd);
    }

    const custo =
      tipo === 'entrada' && req.body.custo_unitario !== '' && req.body.custo_unitario != null
        ? Number(req.body.custo_unitario)
        : null;
    if (custo !== null && !(custo >= 0)) {
      await cliente.query('ROLLBACK');
      return res.status(400).json({ erro: 'O custo não pode ser negativo' });
    }

    const { rows } = await cliente.query(
      `INSERT INTO movimentos (produto_id, tipo, quantidade, motivo, custo_unitario, nota)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [produto.id, tipo, quantidade, motivoFinal, custo, texto(nota)]
    );
    // O último custo de compra passa a ser o custo do produto.
    if (custo !== null) {
      await cliente.query('UPDATE produtos SET preco_custo = $1 WHERE id = $2', [custo, produto.id]);
    }
    await cliente.query('COMMIT');

    const atualizado = await pool.query('SELECT * FROM produtos_stock WHERE id = $1', [produto.id]);
    res.status(201).json({ movimento: rows[0], produto: atualizado.rows[0] });
  } catch (e) {
    await cliente.query('ROLLBACK');
    throw e;
  } finally {
    cliente.release();
  }
}));

/* ---------- painel ---------- */

app.get('/painel', rota(async (req, res) => {
  const [totais, repor, atividade, categorias, recentes] = await Promise.all([
    pool.query(`
      SELECT COUNT(*)::int AS produtos,
             COALESCE(SUM(valor_stock), 0) AS valor_stock,
             COALESCE(SUM(stock * preco_venda), 0) AS valor_venda,
             COUNT(*) FILTER (WHERE estado = 'baixo')::int AS baixo,
             COUNT(*) FILTER (WHERE estado = 'sem_stock')::int AS sem_stock
      FROM produtos_stock WHERE ativo`),
    pool.query(`
      SELECT id, sku, nome, unidade, stock, stock_minimo, estado, fornecedor_nome,
             CEIL(GREATEST(stock_minimo * 2 - stock, 0))::numeric AS sugestao
      FROM produtos_stock WHERE ativo AND estado <> 'ok'
      ORDER BY (estado = 'sem_stock') DESC, (stock / NULLIF(stock_minimo, 0)) NULLS FIRST, nome`),
    pool.query(`
      SELECT d::date AS dia,
        COALESCE(SUM(ABS(m.quantidade) * COALESCE(m.custo_unitario, p.preco_custo)) FILTER (WHERE m.tipo = 'entrada'), 0) AS entradas,
        COALESCE(SUM(ABS(m.quantidade) * p.preco_custo) FILTER (WHERE m.tipo = 'saida'), 0) AS saidas
      FROM generate_series(CURRENT_DATE - 13, CURRENT_DATE, INTERVAL '1 day') d
      LEFT JOIN movimentos m ON m.criado_em::date = d::date
      LEFT JOIN produtos p ON p.id = m.produto_id
      GROUP BY d ORDER BY d`),
    pool.query(`
      SELECT COALESCE(categoria_nome, 'Sem categoria') AS nome, SUM(valor_stock) AS valor
      FROM produtos_stock WHERE ativo GROUP BY 1 ORDER BY valor DESC`),
    pool.query(`
      SELECT m.*, p.nome AS produto_nome, p.unidade
      FROM movimentos m JOIN produtos p ON p.id = m.produto_id
      ORDER BY m.criado_em DESC, m.id DESC LIMIT 8`),
  ]);

  res.json({
    ...totais.rows[0],
    a_repor: repor.rows,
    atividade: atividade.rows,
    por_categoria: categorias.rows,
    recentes: recentes.rows,
  });
}));

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => console.log(`Servidor a correr em http://localhost:${PORT}`));
