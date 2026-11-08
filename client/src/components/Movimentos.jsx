import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../api.js';
import { qtd, quando, TIPOS } from '../format.js';
import MovimentoForm from './MovimentoForm.jsx';
import { BotaoPrimario, BotaoSecundario, Vazio } from './ui.jsx';

const FILTROS = [
  ['', 'Todos'],
  ['entrada', 'Entradas'],
  ['saida', 'Saídas'],
  ['ajuste', 'Ajustes'],
];

export default function Movimentos({ aoMudar, avisar }) {
  const [tipo, setTipo] = useState('');
  const [movimentos, setMovimentos] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [aCarregar, setACarregar] = useState(true);
  const [erro, setErro] = useState('');
  const [formulario, setFormulario] = useState(false);

  const carregar = useCallback(async () => {
    setErro('');
    try {
      const [m, p] = await Promise.all([api.movimentos(tipo), api.produtos()]);
      setMovimentos(m);
      setProdutos(p);
    } catch {
      setErro('Não foi possível carregar os movimentos.');
    } finally {
      setACarregar(false);
    }
  }, [tipo]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function registar(dados) {
    await api.criarMovimento(dados);
    setFormulario(false);
    avisar('Movimento registado');
    await Promise.all([carregar(), aoMudar()]);
  }

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {FILTROS.map(([chave, texto]) => (
            <button
              key={chave}
              onClick={() => setTipo(chave)}
              className={`rounded-full px-3.5 py-1.5 text-sm transition ${
                tipo === chave ? 'bg-ink text-white' : 'text-muted hover:bg-line/60 hover:text-ink'
              }`}
            >
              {texto}
            </button>
          ))}
        </div>
        <BotaoPrimario onClick={() => setFormulario(true)} disabled={produtos.length === 0}>
          <Plus size={17} /> Novo movimento
        </BotaoPrimario>
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
        ) : movimentos.length === 0 ? (
          <Vazio titulo="Sem movimentos" texto="Os movimentos de stock aparecem aqui." />
        ) : (
          <ul className="animar divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
            {movimentos.map((m) => (
              <li
                key={m.id}
                className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-0.5 px-5 py-3.5 sm:grid-cols-[120px_1fr_130px_100px]"
              >
                <span className="num col-start-1 row-start-2 text-xs text-muted sm:col-start-auto sm:row-start-auto sm:text-sm">
                  {quando(m.criado_em)}
                </span>
                <span className="col-start-1 row-start-1 min-w-0 sm:col-start-auto sm:row-start-auto">
                  <span className="block truncate font-medium">{m.produto_nome}</span>
                  <span className="hidden truncate text-xs text-muted sm:block">{m.nota}</span>
                </span>
                <span className="col-start-2 row-start-2 text-right text-xs text-muted sm:col-start-auto sm:row-start-auto sm:text-left sm:text-sm">
                  {TIPOS[m.tipo].texto} · {m.motivo}
                </span>
                <span
                  className={`num col-start-2 row-start-1 text-right font-medium sm:col-start-auto sm:row-start-auto ${
                    m.quantidade > 0 ? 'text-brand' : ''
                  }`}
                >
                  {m.quantidade > 0 ? '+' : ''}
                  {qtd(m.quantidade)} {m.unidade}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {formulario && (
        <MovimentoForm produtos={produtos} aoGuardar={registar} aoFechar={() => setFormulario(false)} />
      )}
    </section>
  );
}
