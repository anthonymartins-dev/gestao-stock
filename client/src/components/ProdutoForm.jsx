import { useState } from 'react';
import { UNIDADES } from '../format.js';
import { BotaoPrimario, BotaoSecundario, Campo, Erro, Modal, Selecao } from './ui.jsx';

export default function ProdutoForm({ produto, categorias, fornecedores, aoGuardar, aoFechar }) {
  const [dados, setDados] = useState({
    sku: produto?.sku ?? '',
    nome: produto?.nome ?? '',
    categoria_id: String(produto?.categoria_id ?? ''),
    fornecedor_id: String(produto?.fornecedor_id ?? ''),
    unidade: produto?.unidade ?? 'un',
    preco_custo: String(produto?.preco_custo ?? ''),
    preco_venda: String(produto?.preco_venda ?? ''),
    stock_minimo: String(produto?.stock_minimo ?? ''),
    stock_inicial: '',
  });
  const [erro, setErro] = useState('');
  const [aGuardar, setAGuardar] = useState(false);

  const mudar = (campo) => (e) => setDados({ ...dados, [campo]: e.target.value });

  const custo = Number(dados.preco_custo);
  const venda = Number(dados.preco_venda);
  const margem = venda > 0 && custo >= 0 ? ((venda - custo) / venda) * 100 : null;

  async function submeter(e) {
    e.preventDefault();
    setAGuardar(true);
    setErro('');
    try {
      await aoGuardar({
        ...dados,
        preco_custo: Number(dados.preco_custo || 0),
        preco_venda: Number(dados.preco_venda || 0),
        stock_minimo: Number(dados.stock_minimo || 0),
        stock_inicial: Number(dados.stock_inicial || 0),
      });
    } catch (err) {
      setErro(err.message);
      setAGuardar(false);
    }
  }

  return (
    <Modal
      titulo={produto ? 'Editar produto' : 'Novo produto'}
      largura="max-w-xl"
      aoFechar={aoFechar}
    >
      <form onSubmit={submeter} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
          <Campo rotulo="Código (SKU)" obrigatorio value={dados.sku} onChange={mudar('sku')} autoFocus />
          <Campo rotulo="Nome" obrigatorio value={dados.nome} onChange={mudar('nome')} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Selecao rotulo="Categoria" value={dados.categoria_id} onChange={mudar('categoria_id')}>
            <option value="">Sem categoria</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Selecao>
          <Selecao rotulo="Fornecedor" value={dados.fornecedor_id} onChange={mudar('fornecedor_id')}>
            <option value="">Sem fornecedor</option>
            {fornecedores.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </Selecao>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <Selecao rotulo="Unidade" value={dados.unidade} onChange={mudar('unidade')}>
            {UNIDADES.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Selecao>
          <Campo
            rotulo="Custo (€)"
            type="number"
            min="0"
            step="0.01"
            value={dados.preco_custo}
            onChange={mudar('preco_custo')}
            className="num"
          />
          <Campo
            rotulo="Preço venda (€)"
            type="number"
            min="0"
            step="0.01"
            value={dados.preco_venda}
            onChange={mudar('preco_venda')}
            className="num"
          />
          <Campo
            rotulo="Stock mínimo"
            type="number"
            min="0"
            step="any"
            value={dados.stock_minimo}
            onChange={mudar('stock_minimo')}
            className="num"
          />
        </div>

        {margem !== null && (
          <p className="text-sm text-muted">
            Margem: <span className="num font-medium text-ink">{margem.toFixed(0)}%</span>
          </p>
        )}

        {!produto && (
          <Campo
            rotulo="Stock inicial"
            type="number"
            min="0"
            step="any"
            value={dados.stock_inicial}
            onChange={mudar('stock_inicial')}
            ajuda="Opcional. Fica registado como a primeira entrada."
            className="num sm:max-w-48"
          />
        )}

        <Erro>{erro}</Erro>

        <div className="flex justify-end gap-2">
          <BotaoSecundario type="button" onClick={aoFechar}>
            Cancelar
          </BotaoSecundario>
          <BotaoPrimario type="submit" disabled={aGuardar}>
            {aGuardar ? 'A guardar…' : 'Guardar'}
          </BotaoPrimario>
        </div>
      </form>
    </Modal>
  );
}
