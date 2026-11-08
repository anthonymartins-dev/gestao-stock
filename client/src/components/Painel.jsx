import { useEffect, useMemo, useState } from 'react';
import { ClipboardCopy } from 'lucide-react';
import { api } from '../api.js';
import { comUnidade, diaCurto, moeda, qtd, quando, TIPOS } from '../format.js';
import { Barra, BotaoSecundario, Cartao, EstadoBadge, Vazio } from './ui.jsx';

function Indicador({ rotulo, valor, nota, tom }) {
  const cor = tom === 'warn' ? 'text-warn' : tom === 'danger' ? 'text-danger' : '';
  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <p className="text-sm text-muted">{rotulo}</p>
      <p className={`num mt-1.5 font-serif text-3xl font-semibold tracking-tight ${cor}`}>{valor}</p>
      {nota && <p className="mt-1 text-xs text-muted">{nota}</p>}
    </div>
  );
}

function GraficoAtividade({ dados }) {
  const maximo = Math.max(...dados.flatMap((d) => [d.entradas, d.saidas]), 1);
  const ALTURA = 128;

  return (
    <div>
      <div className="mb-3 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-brand" /> Entradas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-[#c9922f]" /> Saídas (ao custo)
        </span>
      </div>
      <div className="flex items-end gap-1.5" style={{ height: ALTURA }}>
        {dados.map((d) => (
          <div
            key={d.dia}
            className="flex h-full flex-1 items-end justify-center gap-0.5"
            title={`${diaCurto(d.dia)} · entradas ${moeda(d.entradas)} · saídas ${moeda(d.saidas)}`}
          >
            <div
              className="w-full max-w-3 rounded-t-sm bg-brand"
              style={{ height: Math.max((d.entradas / maximo) * ALTURA, d.entradas > 0 ? 2 : 0) }}
            />
            <div
              className="w-full max-w-3 rounded-t-sm bg-[#c9922f]"
              style={{ height: Math.max((d.saidas / maximo) * ALTURA, d.saidas > 0 ? 2 : 0) }}
            />
          </div>
        ))}
      </div>
      <div className="num mt-2 flex justify-between border-t border-line pt-2 text-[11px] text-muted">
        <span>{diaCurto(dados[0].dia)}</span>
        <span>{diaCurto(dados[Math.floor(dados.length / 2)].dia)}</span>
        <span>{diaCurto(dados[dados.length - 1].dia)}</span>
      </div>
    </div>
  );
}

export default function Painel({ versao, avisar }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api
      .painel()
      .then(setDados)
      .catch(() => setErro('Não foi possível carregar o painel.'));
  }, [versao]);

  const porFornecedor = useMemo(() => {
    const grupos = {};
    (dados?.a_repor ?? []).forEach((p) => {
      (grupos[p.fornecedor_nome ?? 'Sem fornecedor'] ??= []).push(p);
    });
    return Object.entries(grupos);
  }, [dados]);

  async function copiarEncomenda() {
    const texto = porFornecedor
      .map(
        ([forn, itens]) =>
          `${forn}\n` + itens.map((p) => `- ${p.nome}: ${qtd(p.sugestao)} ${p.unidade}`).join('\n')
      )
      .join('\n\n');
    try {
      await navigator.clipboard.writeText(texto);
      avisar('Lista de encomenda copiada');
    } catch {
      avisar('Não foi possível copiar');
    }
  }

  if (erro) {
    return <div className="rounded-2xl border border-line bg-card p-10 text-center text-danger">{erro}</div>;
  }
  if (!dados) return <div className="h-96 animate-pulse rounded-2xl border border-line bg-line/40" />;

  const maxCategoria = Math.max(...dados.por_categoria.map((c) => c.valor), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Valor em stock" valor={moeda(dados.valor_stock)} nota="ao preço de custo" />
        <Indicador rotulo="Valor de venda" valor={moeda(dados.valor_venda)} nota="se tudo for vendido" />
        <Indicador
          rotulo="Stock baixo"
          valor={dados.baixo}
          nota={dados.baixo === 1 ? 'produto abaixo do mínimo' : 'produtos abaixo do mínimo'}
          tom={dados.baixo > 0 ? 'warn' : undefined}
        />
        <Indicador
          rotulo="Sem stock"
          valor={dados.sem_stock}
          nota={`de ${dados.produtos} produtos`}
          tom={dados.sem_stock > 0 ? 'danger' : undefined}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Cartao
          titulo="A repor"
          texto="Sugestão: encomendar até ao dobro do stock mínimo."
          acao={
            porFornecedor.length > 0 && (
              <BotaoSecundario onClick={copiarEncomenda}>
                <ClipboardCopy size={15} /> Copiar lista
              </BotaoSecundario>
            )
          }
        >
          {porFornecedor.length === 0 ? (
            <div className="p-5">
              <Vazio titulo="Tudo em ordem" texto="Nenhum produto abaixo do stock mínimo." />
            </div>
          ) : (
            <div className="divide-y divide-line">
              {porFornecedor.map(([fornecedor, itens]) => (
                <div key={fornecedor} className="px-5 py-4">
                  <p className="mb-2.5 text-xs font-semibold tracking-wide text-muted uppercase">
                    {fornecedor}
                  </p>
                  <ul className="space-y-3">
                    {itens.map((p) => (
                      <li key={p.id} className="flex items-center gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 text-sm font-medium">
                            <span className="truncate">{p.nome}</span>
                            <EstadoBadge estado={p.estado} />
                          </p>
                          <p className="num mt-1 text-xs text-muted">
                            {comUnidade(p.stock, p.unidade)} de {qtd(p.stock_minimo)} mínimo
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted">Encomendar</p>
                          <p className="num text-sm font-semibold">{comUnidade(p.sugestao, p.unidade)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Cartao>

        <div className="space-y-6">
          <Cartao titulo="Atividade" texto="Últimos 14 dias, em valor.">
            <div className="p-5">
              <GraficoAtividade dados={dados.atividade} />
            </div>
          </Cartao>

          <Cartao titulo="Stock por categoria" texto="Valor ao preço de custo.">
            <ul className="space-y-3.5 p-5">
              {dados.por_categoria.map((c) => (
                <li key={c.nome}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span>{c.nome}</span>
                    <span className="num font-medium">{moeda(c.valor)}</span>
                  </div>
                  <Barra valor={c.valor} maximo={maxCategoria} />
                </li>
              ))}
            </ul>
          </Cartao>
        </div>
      </div>

      <Cartao titulo="Movimentos recentes">
        <ul className="divide-y divide-line">
          {dados.recentes.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{m.produto_nome}</p>
                <p className="text-xs text-muted">
                  {TIPOS[m.tipo].texto} · {m.motivo} · {quando(m.criado_em)}
                </p>
              </div>
              <span className={`num font-medium whitespace-nowrap ${m.quantidade > 0 ? 'text-brand' : ''}`}>
                {m.quantidade > 0 ? '+' : ''}
                {qtd(m.quantidade)} {m.unidade}
              </span>
            </li>
          ))}
        </ul>
      </Cartao>
    </div>
  );
}
