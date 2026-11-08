const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3004';

async function pedir(caminho, opcoes = {}) {
  const resposta = await fetch(`${BASE}${caminho}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opcoes,
  });

  if (resposta.status === 204) return null;

  const dados = await resposta.json();
  if (!resposta.ok) throw new Error(dados.erro || 'Algo correu mal');
  return dados;
}

const enviar = (metodo, corpo) => ({ method: metodo, body: JSON.stringify(corpo) });

export const api = {
  painel: () => pedir('/painel'),

  produtos: (arquivados = false) => pedir(`/produtos?arquivados=${arquivados}`),
  produto: (id) => pedir(`/produtos/${id}`),
  criarProduto: (d) => pedir('/produtos', enviar('POST', d)),
  editarProduto: (id, d) => pedir(`/produtos/${id}`, enviar('PUT', d)),
  arquivarProduto: (id) => pedir(`/produtos/${id}`, { method: 'DELETE' }),

  movimentos: (tipo = '') => pedir(`/movimentos?limite=200${tipo ? `&tipo=${tipo}` : ''}`),
  criarMovimento: (d) => pedir('/movimentos', enviar('POST', d)),

  categorias: () => pedir('/categorias'),
  criarCategoria: (d) => pedir('/categorias', enviar('POST', d)),
  editarCategoria: (id, d) => pedir(`/categorias/${id}`, enviar('PUT', d)),
  apagarCategoria: (id) => pedir(`/categorias/${id}`, { method: 'DELETE' }),

  fornecedores: () => pedir('/fornecedores'),
  criarFornecedor: (d) => pedir('/fornecedores', enviar('POST', d)),
  editarFornecedor: (id, d) => pedir(`/fornecedores/${id}`, enviar('PUT', d)),
  apagarFornecedor: (id) => pedir(`/fornecedores/${id}`, { method: 'DELETE' }),
};
