import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../api.js';
import { BotaoPrimario, BotaoSecundario, Campo, Cartao, Erro, Modal } from './ui.jsx';

function IconeBotao({ rotulo, perigo, children, ...props }) {
  return (
    <button
      aria-label={rotulo}
      title={rotulo}
      className={`rounded-lg p-2 text-muted transition ${
        perigo ? 'hover:bg-danger-soft hover:text-danger' : 'hover:bg-line/70 hover:text-ink'
      }`}
      {...props}
    >
      {children}
    </button>
  );
}

function FormSimples({ titulo, campos, inicial, aoGuardar, aoFechar }) {
  const [dados, setDados] = useState(inicial);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function submeter(e) {
    e.preventDefault();
    setOcupado(true);
    setErro('');
    try {
      await aoGuardar(dados);
    } catch (err) {
      setErro(err.message);
      setOcupado(false);
    }
  }

  return (
    <Modal titulo={titulo} aoFechar={aoFechar}>
      <form onSubmit={submeter} className="space-y-4">
        {campos.map(({ chave, rotulo, obrigatorio, tipo }, i) => (
          <Campo
            key={chave}
            rotulo={rotulo}
            obrigatorio={obrigatorio}
            type={tipo}
            value={dados[chave] ?? ''}
            onChange={(e) => setDados({ ...dados, [chave]: e.target.value })}
            autoFocus={i === 0}
          />
        ))}
        <Erro>{erro}</Erro>
        <div className="flex justify-end gap-2">
          <BotaoSecundario type="button" onClick={aoFechar}>
            Cancelar
          </BotaoSecundario>
          <BotaoPrimario type="submit" disabled={ocupado}>
            Guardar
          </BotaoPrimario>
        </div>
      </form>
    </Modal>
  );
}

export default function Definicoes({ categorias, fornecedores, aoMudar, avisar }) {
  const [formCategoria, setFormCategoria] = useState(null);
  const [formFornecedor, setFormFornecedor] = useState(null);

  async function guardarCategoria(dados) {
    if (formCategoria.id) await api.editarCategoria(formCategoria.id, dados);
    else await api.criarCategoria(dados);
    setFormCategoria(null);
    avisar('Categoria guardada');
    await aoMudar();
  }

  async function guardarFornecedor(dados) {
    if (formFornecedor.id) await api.editarFornecedor(formFornecedor.id, dados);
    else await api.criarFornecedor(dados);
    setFormFornecedor(null);
    avisar('Fornecedor guardado');
    await aoMudar();
  }

  async function apagar(fn, id, mensagem) {
    try {
      await fn(id);
      avisar(mensagem);
      await aoMudar();
    } catch (e) {
      avisar(e.message);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Cartao
        titulo="Categorias"
        texto="Agrupam os produtos nas listas e no painel."
        acao={
          <BotaoSecundario onClick={() => setFormCategoria({})}>
            <Plus size={16} /> Nova
          </BotaoSecundario>
        }
      >
        <ul className="divide-y divide-line">
          {categorias.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-5 py-3">
              <span className="flex-1 font-medium">{c.nome}</span>
              <span className="num text-sm text-muted">{c.produtos} produtos</span>
              <div className="flex">
                <IconeBotao rotulo="Editar" onClick={() => setFormCategoria(c)}>
                  <Pencil size={15} />
                </IconeBotao>
                <IconeBotao
                  rotulo="Apagar"
                  perigo
                  onClick={() => apagar(api.apagarCategoria, c.id, 'Categoria apagada')}
                >
                  <Trash2 size={15} />
                </IconeBotao>
              </div>
            </li>
          ))}
        </ul>
      </Cartao>

      <Cartao
        titulo="Fornecedores"
        texto="Usados na lista de encomenda do painel."
        acao={
          <BotaoSecundario onClick={() => setFormFornecedor({})}>
            <Plus size={16} /> Novo
          </BotaoSecundario>
        }
      >
        <ul className="divide-y divide-line">
          {fornecedores.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{f.nome}</p>
                <p className="truncate text-xs text-muted">
                  {[f.telefone, f.contacto].filter(Boolean).join(' · ') || 'Sem contacto'}
                </p>
              </div>
              <span className="num hidden text-sm text-muted sm:block">{f.produtos} produtos</span>
              <div className="flex">
                <IconeBotao rotulo="Editar" onClick={() => setFormFornecedor(f)}>
                  <Pencil size={15} />
                </IconeBotao>
                <IconeBotao
                  rotulo="Apagar"
                  perigo
                  onClick={() => apagar(api.apagarFornecedor, f.id, 'Fornecedor apagado')}
                >
                  <Trash2 size={15} />
                </IconeBotao>
              </div>
            </li>
          ))}
        </ul>
      </Cartao>

      {formCategoria && (
        <FormSimples
          titulo={formCategoria.id ? 'Editar categoria' : 'Nova categoria'}
          campos={[{ chave: 'nome', rotulo: 'Nome', obrigatorio: true }]}
          inicial={{ nome: formCategoria.nome ?? '' }}
          aoGuardar={guardarCategoria}
          aoFechar={() => setFormCategoria(null)}
        />
      )}
      {formFornecedor && (
        <FormSimples
          titulo={formFornecedor.id ? 'Editar fornecedor' : 'Novo fornecedor'}
          campos={[
            { chave: 'nome', rotulo: 'Nome', obrigatorio: true },
            { chave: 'telefone', rotulo: 'Telefone' },
            { chave: 'contacto', rotulo: 'Email ou contacto' },
          ]}
          inicial={{
            nome: formFornecedor.nome ?? '',
            telefone: formFornecedor.telefone ?? '',
            contacto: formFornecedor.contacto ?? '',
          }}
          aoGuardar={guardarFornecedor}
          aoFechar={() => setFormFornecedor(null)}
        />
      )}
    </div>
  );
}
