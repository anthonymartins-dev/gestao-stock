import { useState } from 'react';
import { MOTIVOS, comUnidade, qtd, TIPOS } from '../format.js';
import { BotaoPrimario, BotaoSecundario, Campo, Erro, Modal, Selecao } from './ui.jsx';

export default function MovimentoForm({ produto: fixo, produtos, tipoInicial = 'entrada', aoGuardar, aoFechar }) {
  const [produtoId, setProdutoId] = useState(String(fixo?.id ?? ''));
  const [tipo, setTipo] = useState(tipoInicial);
  const [quantidade, setQuantidade] = useState('');
  const [novoStock, setNovoStock] = useState('');
  const [motivo, setMotivo] = useState(MOTIVOS[tipoInicial][0][0]);
  const [custo, setCusto] = useState('');
  const [nota, setNota] = useState('');
  const [erro, setErro] = useState('');
  const [aGuardar, setAGuardar] = useState(false);

  const produto = fixo ?? produtos?.find((p) => String(p.id) === produtoId);

  function mudarTipo(novo) {
    setTipo(novo);
    setMotivo(MOTIVOS[novo][0][0]);
    setErro('');
  }

  const delta =
    !produto
      ? null
      : tipo === 'ajuste'
        ? novoStock === ''
          ? null
          : Number(novoStock) - produto.stock
        : quantidade === ''
          ? null
          : tipo === 'entrada'
            ? Number(quantidade)
            : -Number(quantidade);
  const resultado = produto && delta !== null ? produto.stock + delta : null;

  async function submeter(e) {
    e.preventDefault();
    if (!produto) return setErro('Escolhe um produto');
    setAGuardar(true);
    setErro('');
    try {
      await aoGuardar({
        produto_id: produto.id,
        tipo,
        motivo,
        nota,
        ...(tipo === 'ajuste'
          ? { novo_stock: Number(novoStock) }
          : { quantidade: Number(quantidade) }),
        ...(tipo === 'entrada' && custo !== '' ? { custo_unitario: Number(custo) } : {}),
      });
    } catch (err) {
      setErro(err.message);
      setAGuardar(false);
    }
  }

  return (
    <Modal
      titulo="Novo movimento"
      subtitulo={fixo ? `${fixo.nome} · stock atual ${comUnidade(fixo.stock, fixo.unidade)}` : undefined}
      aoFechar={aoFechar}
    >
      <form onSubmit={submeter} className="space-y-4">
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-line/50 p-0.5 text-sm">
          {Object.entries(TIPOS).map(([chave, { texto }]) => (
            <button
              key={chave}
              type="button"
              onClick={() => mudarTipo(chave)}
              className={`rounded-md py-1.5 transition ${
                tipo === chave ? 'bg-card font-medium shadow-sm' : 'text-muted hover:text-ink'
              }`}
            >
              {chave === 'ajuste' ? 'Contagem' : texto}
            </button>
          ))}
        </div>

        {!fixo && (
          <Selecao rotulo="Produto" value={produtoId} onChange={(e) => setProdutoId(e.target.value)}>
            <option value="">Escolhe um produto…</option>
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} ({comUnidade(p.stock, p.unidade)})
              </option>
            ))}
          </Selecao>
        )}

        {tipo === 'ajuste' ? (
          <Campo
            rotulo={`Stock contado${produto ? ` (${produto.unidade})` : ''}`}
            type="number"
            min="0"
            step="any"
            value={novoStock}
            onChange={(e) => setNovoStock(e.target.value)}
            ajuda="Regista o que contaste na prateleira. A diferença fica registada como ajuste."
            autoFocus
            className="num"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              rotulo={`Quantidade${produto ? ` (${produto.unidade})` : ''}`}
              type="number"
              min="0"
              step="any"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              autoFocus
              className="num"
            />
            {tipo === 'entrada' && (
              <Campo
                rotulo="Custo unitário (€)"
                type="number"
                min="0"
                step="0.01"
                value={custo}
                onChange={(e) => setCusto(e.target.value)}
                placeholder={produto ? String(produto.preco_custo) : ''}
                className="num"
              />
            )}
          </div>
        )}

        {tipo !== 'ajuste' && (
          <Selecao rotulo="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
            {MOTIVOS[tipo].map(([valor, texto]) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </Selecao>
        )}

        <Campo
          rotulo="Nota"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Opcional (nº de fatura, observações…)"
        />

        {produto && resultado !== null && (
          <p
            className={`rounded-lg px-3 py-2 text-sm ${
              resultado < 0 ? 'bg-danger-soft text-danger' : 'bg-paper text-muted'
            }`}
          >
            Stock depois: <strong className="num font-semibold text-ink">{comUnidade(resultado, produto.unidade)}</strong>
            {delta !== 0 && (
              <span className="num">
                {' '}
                ({delta > 0 ? '+' : ''}
                {qtd(delta)})
              </span>
            )}
            {resultado < 0 && ' · não há stock suficiente'}
          </p>
        )}

        <Erro>{erro}</Erro>

        <div className="flex justify-end gap-2">
          <BotaoSecundario type="button" onClick={aoFechar}>
            Cancelar
          </BotaoSecundario>
          <BotaoPrimario type="submit" disabled={aGuardar}>
            {aGuardar ? 'A registar…' : 'Registar'}
          </BotaoPrimario>
        </div>
      </form>
    </Modal>
  );
}
