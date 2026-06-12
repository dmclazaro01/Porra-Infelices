import { getState } from './state.js';

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, val] of Object.entries(attrs)) {
    if (val == null) continue;
    if (key === 'class') {
      node.className = val;
    } else if (key === 'text') {
      node.textContent = val;
    } else if (key.startsWith('on')) {
      node.addEventListener(key.slice(2).toLowerCase(), val);
    } else if (key === 'checked' || key === 'disabled' || key === 'readOnly') {
      node[key] = val;
    } else {
      node.setAttribute(key, val);
    }
  }
  const flat = Array.isArray(children) ? children : [children];
  for (const child of flat) {
    if (child == null || child === false) continue;
    if (typeof child === 'string' || typeof child === 'number') {
      node.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof Node) {
      node.appendChild(child);
    }
  }
  return node;
}

export function field(labelText, control) {
  const label = el('label', { class: 'field' }, [
    el('span', {}, [labelText]),
    control,
  ]);
  return label;
}

export function teamName(teamId) {
  const state = getState();
  if (!state) return 'TBD';
  const team = state.teams.find(t => t.id === teamId);
  return team ? team.name : 'TBD';
}

export function teamFlag(teamId) {
  const state = getState();
  if (!state) return '';
  const team = state.teams.find(t => t.id === teamId);
  return team ? (team.flag || '') : '';
}

function getFlagImg(team) {
  const code = team.code ? team.code.toLowerCase() : '';
  if (!code) return null;
  const codeMap = {
    'kor': 'kr', 'cze': 'cz', 'rsa': 'za', 'bih': 'ba', 'qat': 'qa',
    'sui': 'ch', 'hai': 'ht', 'sco': 'gb-sct', 'usa': 'us', 'par': 'py',
    'aus': 'au', 'tur': 'tr', 'cuw': 'cw', 'civ': 'ci', 'ecu': 'ec',
    'ned': 'nl', 'jpn': 'jp', 'swe': 'se', 'tun': 'tn', 'egy': 'eg',
    'irn': 'ir', 'nzl': 'nz', 'cpv': 'cv', 'ksa': 'sa', 'uru': 'uy',
    'fra': 'fr', 'sen': 'sn', 'irq': 'iq', 'nor': 'no', 'arg': 'ar',
    'alg': 'dz', 'aut': 'at', 'jor': 'jo', 'por': 'pt', 'cod': 'cd',
    'uzb': 'uz', 'col': 'co', 'eng': 'gb-eng', 'cro': 'hr', 'gha': 'gh',
    'pan': 'pa', 'ger': 'de', 'esp': 'es', 'bra': 'br', 'mex': 'mx',
    'bel': 'be', 'mar': 'ma', 'can': 'ca',
  };
  const isoCode = codeMap[code] || code;
  return el('img', {
    class: 'team-flag-img',
    src: `https://flagcdn.com/24x18/${isoCode}.png`,
    alt: team.name,
    loading: 'lazy',
  });
}

export function teamInline(teamId, fallback = '', options = {}) {
  const state = getState();
  if (!state) {
    return el('span', { class: 'team-inline' }, [fallback || 'TBD']);
  }
  const team = state.teams.find(t => t.id === teamId);
  if (!team) {
    return el('span', { class: 'team-inline' }, [fallback || 'TBD']);
  }
  const name = options.full ? team.name : (team.code || team.name);
  const flag = getFlagImg(team);
  const children = [];
  if (flag) children.push(flag, ' ');
  children.push(name);
  return el('span', { class: 'team-inline' }, children);
}

export function teamBlock(teamId, side) {
  const state = getState();
  const team = state ? state.teams.find(t => t.id === teamId) : null;
  if (!team) {
    return el('div', { class: `team-block ${side}` }, [
      el('span', { class: 'team-flag' }, ['']),
      el('span', { class: 'team-name' }, ['TBD']),
    ]);
  }
  const flag = getFlagImg(team);
  return el('div', { class: `team-block ${side}` }, [
    flag || el('span', { class: 'team-flag' }, ['']),
    el('span', { class: 'team-name' }, [team.name]),
  ]);
}

const SPANISH_MONTHS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
];

export function formatDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const day = d.getDate();
  const month = SPANISH_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year} · ${hours}:${minutes}`;
}

export function formatMoney(cents) {
  const euros = cents / 100;
  return euros.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' €';
}

export function formatPoints(n) {
  const rounded = Math.round(n * 10) / 10;
  const str = String(rounded);
  if (str.includes('.')) {
    return str.replace(/\.?0+$/, '') || '0';
  }
  return str;
}

const GROUP_COLORS = ['navy', 'purple', 'teal', 'red', 'green', 'orange'];

export function groupChip(groupName) {
  if (!groupName) {
    return el('span', { class: 'group-chip muted' }, ['Sin grupo']);
  }
  const index = groupName.charCodeAt(0) - 65;
  const colorClass = GROUP_COLORS[index % GROUP_COLORS.length];
  return el('span', { class: `group-chip ${colorClass}` }, [groupName]);
}

export function paymentPill(player) {
  if (player.has_paid) {
    return el('span', { class: 'pill green' }, ['Pagado']);
  }
  return el('span', { class: 'pill yellow' }, ['Pendiente']);
}

export function debounce(fn, ms) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, ms);
  };
}

export function groupMatches(state, letter) {
  if (!state || !state.matches) return [];
  return state.matches
    .filter(m => m.group === letter || m.group_letter === letter)
    .sort((a, b) => {
      if (a.kickoff_at && b.kickoff_at) return new Date(a.kickoff_at) - new Date(b.kickoff_at);
      if (a.kickoff_at) return -1;
      if (b.kickoff_at) return 1;
      return 0;
    });
}

export function roundLabel(round) {
  const labels = {
    R32: 'Dieciseisavos',
    R16: 'Octavos',
    QF: 'Cuartos',
    SF: 'Semifinales',
    THIRD: '3er puesto',
    FINAL: 'Final',
  };
  return labels[round] || round || '';
}