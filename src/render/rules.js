import { el, formatDate, formatDate as fmtMoney } from '../utils.js';
import { getState, isAdmin } from '../state.js';

const RULES = [
  {
    icon: '⚽', title: 'Clasificación de grupos', color: 'navy',
    lines: [
      'Por cada país acertado como clasificado (1º o 2º): +1 punto.',
      'Si aciertas dentro de que está clasificado, su posición exacta: +1 punto extra.',
      'Si aciertas que ha clasificado como tercera (solo 8 terceros clasifican): +1 punto más.',
      'Máximo 4 puntos por grupo · 12 grupos en juego.',
    ],
  },
  {
    icon: '🏆', title: 'Eliminatorias', color: 'red',
    lines: [
      'Cada ganador de partido de eliminatoria acertado: +1 punto (fijo, sin importar la ronda).',
      'Dieciseisavos a final, todas las rondas valen lo mismo: 1 punto por acierto.',
      'Total: 26 partidos de eliminatoria = 26 puntos máximo.',
    ],
  },
  {
    icon: '🏅', title: 'Bonus estrella', color: 'gold',
    lines: [
      'Pichichi (máximo goleador) acertado: +5 puntos.',
      'Mejor jugador del torneo acertado: +5 puntos.',
      'Se rellenan en la pestaña Bonus antes del cierre.',
    ],
  },
  {
    icon: '⚠️', title: 'Empates a puntos', color: 'orange',
    lines: [
      'Si en tu clasificación dos equipos empatan a puntos, decides TÚ el orden con ▲▼.',
      'Ese orden cuenta para la clasificación y los cruces de tu eliminatoria.',
    ],
  },
  {
    icon: '💶', title: 'Bote y reparto', color: 'purple',
    lines: [
      'Entrada: 2€ por persona.',
      'Reparto: 2º se lleva su apuesta (2€), 1º se lleva el resto del bote.',
      'El premio exacto siempre visible en la pestaña Clasificación.',
    ],
  },
];

export function renderRules() {
  const wrap = el('section', { class: 'phase-section rules-section' });
  wrap.append(el('div', { class: 'section-heading' }, [
    el('div', {}, [
      el('h2', { text: '¿Cómo se puntúa?' }),
      el('p', { text: 'Transparencia total: esto es exactamente lo que suma cada acierto.' }),
    ]),
  ]));

  const grid = el('div', { class: 'rules-grid' });
  RULES.forEach(block => {
    const card = el('article', { class: `panel rules-card rules-${block.color}` });
    card.append(el('div', { class: 'rules-head' }, [
      el('span', { class: 'rules-icon', text: block.icon }),
      el('span', { class: 'rules-title', text: block.title }),
    ]));
    const list = el('ul', { class: 'rules-list' });
    block.lines.forEach(line => list.append(el('li', { text: line })));
    card.append(list);
    grid.append(card);
  });
  wrap.append(grid);
  wrap.append(el('p', { class: 'rules-footer', text: 'Puntuación máxima: 92 puntos (56 grupos + 26 eliminatorias + 10 bonus).' }));
  return wrap;
}