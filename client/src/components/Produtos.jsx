import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Plus, Search } from 'lucide-react';
import { api } from '../api.js';
import { comUnidade, ESTADOS_STOCK, moeda, qtd } from '../format.js';
import MovimentoForm from './MovimentoForm.jsx';
import ProdutoDetalhe from './ProdutoDetalhe.jsx';
import ProdutoForm from './ProdutoForm.jsx';
import { Barra, BotaoPrimario, BotaoSecundario, EstadoBadge, Vazio } from './ui.jsx';

const FILTROS = [
  ['todos', 'Todos'],
  ['baixo', 'Stock baixo'],
  ['sem_stock', 'Sem stock'],
];

function exportarCsv(produtos) {
  const pt = (n) => String(n).replace('.', ',');
  const cabecalho = [
    'SKU', 'Produto', 'Categoria', 'Fornecedor', 'Unidade', 'Stock',
    'Stock mínimo', 'Custo', 'Preço de venda', 'Valor em stock', 'Estado',
  ];
  const linhas = produtos.map((p) => [
    p.sku, p.nome, p.categoria_nome ?? '', p.fornecedor_nome ?? '', p.unidade, pt(p.stock),
    pt(p.stock_minimo), pt(p.preco_custo), pt(p.preco_venda), pt(p.valor_stock.toFixed(2)),
    ESTADOS_STOCK[p.estado].texto,
  ]);
  const csv = [cabecalho, ...linhas]
    .map((l) => l.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(';'))
    .join('\r\n');

  // BOM para o Excel abrir os acentos corretamente.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const ligacao = document.createElement('a');
  ligacao.href = URL.createObjectURL(blob);
  ligacao.download = `produtos-${new Date().toISOString().slice(0, 10)}.csv`;
  ligacao.click();
  URL.revokeObjectURL(ligacao.href);
}

export default function Produtos({ categorias, fornecedores, aoMudar, avisar }) {
  const [produtos, setProdutos] = useState([]);
  const [aCarregar, setACarregar] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [arquivados, setArquivados] = useState(false);

  const [detalhe, setDetalhe] = useState(null);
  const [formulario, setFormulario] = useState(null);
  const [movimento, setMovimento] = useState(null);

  const carregar = useCallback(async () => {
    setErro('');
    try {
      setProdutos(await api.produtos(arquivados));
    } catch {
      setErro('Não foi possível carregar os produtos.');
    } finally {
      setACarregar(false);
    }
  }, [arquivados]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return produtos.filter(
      (p) =>
        (filtro === 'todos' || p.estado === filtro) &&
        (!categoria || String(p.categoria_id) === categoria) &&
        (!termo || `${p.nome} ${p.sku}`.toLowerCase().includes(termo))
    );
  }, [produtos, busca, categoria, filtro]);

  async function abrir(id) {
    setDetalhe(await api.produto(id));
  }

  async function refrescar(id) {
    await Promise.all([carregar(), aoMudar(), id ? abrir(id) : null]);
  }

  async function guardarProduto(dados) {
    const editar = Boolean(formulario.id);
    const guardado = editar
      ? await api.editarProduto(formulario.id, dados)
      : await api.criarProduto(dados);
    setFormulario(null);
    avisar(editar ? 'Produto atualizado' : 'Produto criado');
    await refrescar(guardado.id);
  }

  async function registarMovimento(dados) {
    await api.criarMovimento(dados);
    setMovimento(null);
    avisar('Movimento registado');
    await refrescar(dados.produto_id);
  }

  async function alternarArquivo() {
    if (detalhe.ativo) await api.arquivarProduto(detalhe.id);
    else await api.editarProduto(detalhe.id, { ...detalhe, ativo: true });
    avisar(detalhe.ativo ? 'Produto arquivado' : 'Produto restaurado');
    setDetalhe(null);
    await Promise.all([carregar(), aoMudar()]);
  }

  return (
    <section>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <div className="relative sm:w-72">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
            />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Nome ou código"
              className="w-full rounded-lg border border-line bg-card py-2.5 pr-3 pl-9 text-sm outline-none transition focus:border-brand focus:ring-3 focus:ring-brand/15"
            />
          </div>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            aria-label="Categoria"
            className="rounded-lg border border-line bg-card px-3 py-2.5 text-sm outline-none focus:border-brand"
          >
            <option value="">Todas as categorias</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <BotaoSecundario onClick={() => exportarCsv(filtrados)} disabled={filtrados.length === 0}>
            <Download size={16} /> CSV
          </BotaoSecundario>
          <BotaoPrimario onClick={() => setFormulario({})}>
            <Plus size={17} /> Novo produto
          </BotaoPrimario>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTROS.map(([chave, texto]) => (
            <button
              key={chave}
              onClick={() => setFiltro(chave)}
              className={`rounded-full px-3.5 py-1.5 text-sm transition ${
                filtro === chave ? 'bg-ink text-white' : 'text-muted hover:bg-line/60 hover:text-ink'
              }`}
            >
              {texto}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={arquivados}
            onChange={(e) => setArquivados(e.target.checked)}
            className="size-4 accent-[var(--color-brand)]"
          />
          Mostrar arquivados
        </label>
      </div>

      <div className="mt-4">
        {erro ? (
          <div className="rounded-2xl border border-line bg-card p-10 text-center">
            <p className="text-danger">{erro}</p>
            <BotaoSecundario className="mt-4" onClick={carregar}>
              Tentar de novo
            </BotaoSecundario>
          </div>
        ) : aCarregar ? (
          <div className="h-80 animate-pulse rounded-2xl border border-line bg-line/40" />
        ) : filtrados.length === 0 ? (
          <Vazio
            titulo={produtos.length === 0 ? 'Ainda não há produtos' : 'Nenhum resultado'}
            texto={
              produtos.length === 0
                ? 'Adiciona o primeiro produto para começar.'
                : 'Experimenta outro filtro ou pesquisa.'
            }
          />
        ) : (
          <div className="animar overflow-hidden rounded-2xl border border-line bg-card">
            <div className="hidden grid-cols-[1fr_130px_150px_90px_110px] gap-4 border-b border-line px-5 py-2.5 text-xs text-muted sm:grid">
              <span>Produto</span>
              <span>Categoria</span>
              <span>Stock</span>
              <span className="text-right">Custo</span>
              <span className="text-right">Valor em stock</span>
            </div>
            <ul className="divide-y divide-line">
              {filtrados.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => abrir(p.id)}
                    className={`grid w-full items-center gap-x-4 gap-y-2 px-5 py-3.5 text-left transition hover:bg-paper/70 sm:grid-cols-[1fr_130px_150px_90px_110px] ${
                      p.ativo ? '' : 'opacity-55'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{p.nome}</span>
                      <span className="num block text-xs text-muted">{p.sku}</span>
                    </span>
                    <span className="hidden truncate text-sm text-muted sm:block">
                      {p.categoria_nome ?? '—'}
                    </span>
                    <span className="block">
                      <span className="flex items-center justify-between gap-2 text-sm">
                        <span className="num font-medium">{comUnidade(p.stock, p.unidade)}</span>
                        {p.estado !== 'ok' && <EstadoBadge estado={p.estado} />}
                      </span>
                      <span className="mt-1.5 block">
                        <Barra
                          valor={p.stock}
                          maximo={Math.max(p.stock_minimo * 2, 1)}
                          classe={ESTADOS_STOCK[p.estado].barra}
                        />
                      </span>
                    </span>
                    <span className="num hidden text-right text-sm text-muted sm:block">
                      {moeda(p.preco_custo)}
                    </span>
                    <span className="num hidden text-right text-sm font-medium sm:block">
                      {moeda(p.valor_stock)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="num border-t border-line px-5 py-2.5 text-xs text-muted">
              {filtrados.length} {filtrados.length === 1 ? 'produto' : 'produtos'} ·{' '}
              {qtd(filtrados.reduce((s, p) => s + p.valor_stock, 0).toFixed(2))} € em stock
            </p>
          </div>
        )}
      </div>

      {detalhe && (
        <ProdutoDetalhe
          produto={detalhe}
          aoMovimento={(tipo) => setMovimento({ tipo })}
          aoEditar={() => setFormulario(detalhe)}
          aoArquivar={alternarArquivo}
          aoFechar={() => setDetalhe(null)}
        />
      )}

      {formulario && (
        <ProdutoForm
          produto={formulario.id ? formulario : null}
          categorias={categorias}
          fornecedores={fornecedores}
          aoGuardar={guardarProduto}
          aoFechar={() => setFormulario(null)}
        />
      )}

      {movimento && detalhe && (
        <MovimentoForm
          produto={detalhe}
          tipoInicial={movimento.tipo}
          aoGuardar={registarMovimento}
          aoFechar={() => setMovimento(null)}
        />
      )}
    </section>
  );
}
