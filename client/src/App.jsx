import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import Definicoes from './components/Definicoes.jsx';
import Movimentos from './components/Movimentos.jsx';
import Painel from './components/Painel.jsx';
import Produtos from './components/Produtos.jsx';
import { BotaoSecundario } from './components/ui.jsx';

const SEPARADORES = [
  ['painel', 'Painel'],
  ['produtos', 'Produtos'],
  ['movimentos', 'Movimentos'],
  ['definicoes', 'Definições'],
];

export default function App() {
  const [separador, setSeparador] = useState('painel');
  const [base, setBase] = useState(null);
  const [versao, setVersao] = useState(0);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  // Categorias e fornecedores servem os formulários; `versao` obriga o painel a recarregar.
  const carregarBase = useCallback(async () => {
    setErro('');
    try {
      const [categorias, fornecedores] = await Promise.all([api.categorias(), api.fornecedores()]);
      setBase({ categorias, fornecedores });
      setVersao((v) => v + 1);
    } catch {
      setErro('Não foi possível ligar ao servidor. Confirma que a API está a correr.');
    }
  }, []);

  useEffect(() => {
    carregarBase();
  }, [carregarBase]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(''), 2800);
    return () => clearTimeout(t);
  }, [aviso]);

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium tracking-wide text-brand uppercase">Mercearia do Bairro</p>
          <h1 className="mt-1 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
            Gestão de stock
          </h1>
        </div>
        <nav className="flex gap-6 overflow-x-auto border-b border-line sm:border-0">
          {SEPARADORES.map(([chave, texto]) => (
            <button
              key={chave}
              onClick={() => setSeparador(chave)}
              className={`-mb-px border-b-2 pb-3 text-sm font-medium whitespace-nowrap transition sm:mb-0 ${
                separador === chave
                  ? 'border-brand text-ink'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {texto}
            </button>
          ))}
        </nav>
      </header>

      <main className="mt-8">
        {erro ? (
          <div className="rounded-2xl border border-line bg-card p-10 text-center">
            <p className="text-danger">{erro}</p>
            <BotaoSecundario className="mt-4" onClick={carregarBase}>
              Tentar de novo
            </BotaoSecundario>
          </div>
        ) : !base ? (
          <div className="h-96 animate-pulse rounded-2xl border border-line bg-line/40" />
        ) : separador === 'painel' ? (
          <Painel versao={versao} avisar={setAviso} />
        ) : separador === 'produtos' ? (
          <Produtos
            categorias={base.categorias}
            fornecedores={base.fornecedores}
            aoMudar={carregarBase}
            avisar={setAviso}
          />
        ) : separador === 'movimentos' ? (
          <Movimentos aoMudar={carregarBase} avisar={setAviso} />
        ) : (
          <Definicoes
            categorias={base.categorias}
            fornecedores={base.fornecedores}
            aoMudar={carregarBase}
            avisar={setAviso}
          />
        )}
      </main>

      {aviso && (
        <div className="animar fixed right-4 bottom-4 z-50 rounded-lg bg-ink px-4 py-2.5 text-sm text-white shadow-lg">
          {aviso}
        </div>
      )}
    </div>
  );
}
