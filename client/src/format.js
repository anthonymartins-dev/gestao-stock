const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const p2 = (n) => String(n).padStart(2, '0');

export function moeda(valor) {
  const n = Number(valor) || 0;
  const [inteiro, decimal] = Math.abs(n).toFixed(2).split('.');
  const agrupado = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${n < 0 ? '-' : ''}${agrupado},${decimal} €`;
}

/* Quantidades: sem zeros inúteis (44, 6,5). */
export function qtd(valor) {
  const n = Number(valor) || 0;
  return String(Math.round(n * 1000) / 1000).replace('.', ',');
}

export const comUnidade = (valor, unidade) => `${qtd(valor)} ${unidade}`;

const isoLocal = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;

/* "Hoje, 14:30", "Ontem, 09:10", "5 nov, 16:00" */
export function quando(ts) {
  const dia = ts.slice(0, 10);
  const hora = ts.slice(11, 16);
  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(hoje.getDate() - 1);

  if (dia === isoLocal(hoje)) return `Hoje, ${hora}`;
  if (dia === isoLocal(ontem)) return `Ontem, ${hora}`;
  const [, m, d] = dia.split('-').map(Number);
  return `${d} ${MESES[m - 1]}, ${hora}`;
}

export function diaCurto(dia) {
  const [, m, d] = dia.slice(0, 10).split('-').map(Number);
  return `${d} ${MESES[m - 1]}`;
}

export const ESTADOS_STOCK = {
  ok: { texto: 'Em stock', classe: 'bg-brand-soft text-brand', barra: 'bg-brand' },
  baixo: { texto: 'Stock baixo', classe: 'bg-warn-soft text-warn', barra: 'bg-[#c9922f]' },
  sem_stock: { texto: 'Sem stock', classe: 'bg-danger-soft text-danger', barra: 'bg-danger' },
};

export const TIPOS = {
  entrada: { texto: 'Entrada', sinal: '+', classe: 'text-brand' },
  saida: { texto: 'Saída', sinal: '', classe: 'text-ink' },
  ajuste: { texto: 'Ajuste', sinal: '', classe: 'text-warn' },
};

export const MOTIVOS = {
  entrada: [
    ['compra', 'Compra'],
    ['devolucao', 'Devolução de cliente'],
    ['outro', 'Outro'],
  ],
  saida: [
    ['venda', 'Venda'],
    ['perda', 'Perda ou quebra'],
    ['consumo', 'Consumo interno'],
    ['outro', 'Outro'],
  ],
  ajuste: [['inventario', 'Contagem de inventário']],
};

export const UNIDADES = ['un', 'kg', 'l', 'cx', 'm'];
