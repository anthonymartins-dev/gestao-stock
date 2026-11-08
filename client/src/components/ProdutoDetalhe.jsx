import { ArrowDownToLine, ArrowUpFromLine, Archive, ClipboardCheck, Pencil, RotateCcw, X } from 'lucide-react';
import { comUnidade, moeda, qtd, quando, TIPOS } from '../format.js';
import { Barra, BotaoSecundario, EstadoBadge, useEscape } from './ui.jsx';
import { ESTADOS_STOCK } from '../format.js';

function Dado({ rotulo, children }) {
  return (
    <div>
      <dt className="text-xs text-muted">{rotulo}</dt>
      <dd className="num mt-0.5 text-sm font-medium">{children}</dd>
    </div>
  );
}

export default function ProdutoDetalhe({ produto: p, aoMovimento, aoEditar, aoArquivar, aoFechar }) {
  useEscape(aoFechar);
  const margem = p.preco_venda > 0 ? ((p.preco_venda - p.preco_custo) / p.preco_venda) * 100 : null;

  return (
    <div
      className="fixed inset-0 z-30 flex justify-end bg-ink/30"
      onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}
    >
      <aside className="painel flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-line bg-card shadow-2xl shadow-ink/10">
        <div className="flex items-start justify-between gap-4 border-b border-line p-6">
          <div>
            <p className="num text-sm text-muted">{p.sku}</p>
            <h2 className="mt-0.5 font-serif text-2xl font-semibold">{p.nome}</h2>
            <p className="mt-1 text-sm text-muted">
              {[p.categoria_nome, p.fornecedor_nome].filter(Boolean).join(' · ') || 'Sem categoria'}
              {!p.ativo && ' · arquivado'}
            </p>
          </div>
          <button
            onClick={aoFechar}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-muted transition hover:bg-line/60 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-7 p-6">
          <section className="rounded-xl bg-paper p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs text-muted">Stock atual</p>
                <p className="num font-serif text-4xl font-semibold tracking-tight">
                  {qtd(p.stock)} <span className="text-xl text-muted">{p.unidade}</span>
                </p>
              </div>
              <EstadoBadge estado={p.estado} />
            </div>
            <div className="mt-4">
              <Barra
                valor={p.stock}
                maximo={Math.max(p.stock_minimo * 2, p.stock, 1)}
                classe={ESTADOS_STOCK[p.estado].barra}
              />
              <p className="num mt-1.5 text-xs text-muted">Mínimo: {comUnidade(p.stock_minimo, p.unidade)}</p>
            </div>
          </section>

          {p.ativo && (
            <div className="grid grid-cols-3 gap-2">
              <BotaoSecundario onClick={() => aoMovimento('entrada')}>
                <ArrowDownToLine size={15} /> Entrada
              </BotaoSecundario>
              <BotaoSecundario onClick={() => aoMovimento('saida')}>
                <ArrowUpFromLine size={15} /> Saída
              </BotaoSecundario>
              <BotaoSecundario onClick={() => aoMovimento('ajuste')}>
                <ClipboardCheck size={15} /> Contagem
              </BotaoSecundario>
            </div>
          )}

          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            <Dado rotulo="Custo">{moeda(p.preco_custo)}</Dado>
            <Dado rotulo="Preço de venda">{moeda(p.preco_venda)}</Dado>
            <Dado rotulo="Margem">{margem === null ? '—' : `${margem.toFixed(0)}%`}</Dado>
            <Dado rotulo="Valor em stock">{moeda(p.valor_stock)}</Dado>
          </dl>

          <section>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
              Últimos movimentos
            </h3>
            {p.movimentos.length === 0 ? (
              <p className="text-sm text-muted">Ainda não há movimentos.</p>
            ) : (
              <ul className="divide-y divide-line rounded-xl border border-line">
                {p.movimentos.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {TIPOS[m.tipo].texto}
                        <span className="font-normal text-muted"> · {m.motivo}</span>
                      </p>
                      <p className="truncate text-xs text-muted">
                        {quando(m.criado_em)}
                        {m.nota && ` · ${m.nota}`}
                      </p>
                    </div>
                    <span
                      className={`num font-medium whitespace-nowrap ${m.quantidade > 0 ? 'text-brand' : 'text-ink'}`}
                    >
                      {m.quantidade > 0 ? '+' : ''}
                      {qtd(m.quantidade)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="flex justify-between border-t border-line p-4">
          <BotaoSecundario onClick={aoEditar}>
            <Pencil size={15} /> Editar
          </BotaoSecundario>
          <button
            onClick={aoArquivar}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-line/60 hover:text-ink"
          >
            {p.ativo ? <Archive size={15} /> : <RotateCcw size={15} />}
            {p.ativo ? 'Arquivar' : 'Restaurar'}
          </button>
        </div>
      </aside>
    </div>
  );
}
