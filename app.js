const API = 'https://pokeapi.co/api/v2';
const form = document.querySelector('#pokemon-form');
const pokemonInput = document.querySelector('#pokemon-input');
const levelInput = document.querySelector('#level-input');
const statusEl = document.querySelector('#status');
const resultEl = document.querySelector('#result');
const chainSection = document.querySelector('#chain-section');
const chainEl = document.querySelector('#evolution-chain');
const suggestionsEl = document.querySelector('#suggestions');

let pokemonNames = [];

init();

async function init() {
  try {
    const response = await fetch(`${API}/pokemon?limit=2000`);
    const data = await response.json();
    pokemonNames = data.results.map(p => p.name);
  } catch (_) {
    // Search still works by exact name or Pokédex number if suggestions fail.
  }
}

pokemonInput.addEventListener('input', () => {
  const value = pokemonInput.value.trim().toLowerCase();
  if (!value || value.length < 2 || /^\d+$/.test(value) || !pokemonNames.length) {
    suggestionsEl.hidden = true;
    return;
  }

  const matches = pokemonNames.filter(name => name.startsWith(value)).slice(0, 6);
  if (!matches.length) {
    suggestionsEl.hidden = true;
    return;
  }

  suggestionsEl.innerHTML = matches.map(name => `<button class="suggestion" type="button" data-name="${name}">${pretty(name)}</button>`).join('');
  suggestionsEl.hidden = false;
});

suggestionsEl.addEventListener('click', (event) => {
  const button = event.target.closest('[data-name]');
  if (!button) return;
  pokemonInput.value = button.dataset.name;
  suggestionsEl.hidden = true;
  levelInput.focus();
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.input-wrap')) suggestionsEl.hidden = true;
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const query = pokemonInput.value.trim().toLowerCase().replace(/\s+/g, '-');
  const level = Number(levelInput.value);
  if (!query || !level) return;

  setStatus('Checking Pokédex and evolution data…');
  resultEl.hidden = true;
  chainSection.hidden = true;

  try {
    const pokemon = await getJSON(`${API}/pokemon/${encodeURIComponent(query)}`);
    const species = await getJSON(pokemon.species.url);
    const evolution = await getJSON(species.evolution_chain.url);
    const flatChain = flattenChain(evolution.chain);
    const currentIndex = flatChain.findIndex(node => node.name === pokemon.species.name);
    const directNext = getDirectEvolutions(evolution.chain, pokemon.species.name);

    renderPokemon(pokemon);
    renderDecision(pokemon, level, directNext, currentIndex, flatChain);
    await renderChain(flatChain, pokemon.species.name);

    resultEl.hidden = false;
    chainSection.hidden = false;
    setStatus('');
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    console.error(error);
    setStatus('Couldn’t find that Pokémon. Check the spelling or try a Pokédex number.', true);
  }
});

function renderPokemon(pokemon) {
  document.querySelector('#pokemon-number').textContent = `#${String(pokemon.id).padStart(4, '0')}`;
  document.querySelector('#pokemon-name').textContent = pretty(pokemon.name);
  document.querySelector('#types').innerHTML = pokemon.types.map(t => `<span class="type-pill">${t.type.name}</span>`).join('');

  const image = document.querySelector('#pokemon-image');
  const fallback = document.querySelector('#image-fallback');
  const src = pokemon.sprites.other?.['official-artwork']?.front_default || pokemon.sprites.front_default;
  if (src) {
    image.src = src;
    image.alt = `${pretty(pokemon.name)} official artwork`;
    image.hidden = false;
    fallback.hidden = true;
  } else {
    image.hidden = true;
    fallback.hidden = false;
  }
}

function renderDecision(pokemon, level, directNext, currentIndex, flatChain) {
  const verdict = document.querySelector('#verdict');
  const title = document.querySelector('#decision-title');
  const copy = document.querySelector('#decision-copy');
  const requirements = document.querySelector('#requirements');
  requirements.innerHTML = '';

  if (!directNext.length) {
    setVerdict(verdict, 'no', 'No evolution available');
    title.textContent = `${pretty(pokemon.name)} is at the end of its line.`;
    copy.textContent = 'There is no further evolution listed for this Pokémon, so there is nothing to evolve into.';
    return;
  }

  const evaluations = directNext.map(next => evaluateEvolution(next, level));
  const hasReady = evaluations.some(e => e.state === 'ready');
  const hasWait = evaluations.some(e => e.state === 'wait');

  if (hasReady) {
    setVerdict(verdict, 'yes', 'Yes — you can evolve');
    title.textContent = 'Evolution is available now.';
    copy.textContent = 'Based on the evolution requirement and the level you entered, at least one evolution path is currently available.';
  } else if (hasWait && evaluations.every(e => e.state === 'wait')) {
    setVerdict(verdict, 'wait', 'Not yet');
    const levels = evaluations.map(e => e.minLevel).filter(Boolean);
    const nearest = Math.min(...levels);
    title.textContent = `Hold until level ${nearest}.`;
    copy.textContent = `At level ${level}, this Pokémon has not reached its next level-based evolution requirement yet.`;
  } else {
    setVerdict(verdict, 'depends', 'It depends');
    title.textContent = 'Check the special requirement.';
    copy.textContent = 'This evolution is not determined by level alone. Confirm the item, trade, friendship, time, location or other condition shown below.';
  }

  evaluations.forEach(e => {
    const row = document.createElement('div');
    row.className = 'requirement';
    row.innerHTML = `<span class="req-icon">${e.state === 'ready' ? '✓' : e.state === 'wait' ? '↑' : '?'}</span><span><strong>${pretty(e.name)}</strong> — ${e.description}</span>`;
    requirements.appendChild(row);
  });
}

function evaluateEvolution(next, level) {
  const detail = next.details[0] || {};
  const minLevel = detail.min_level;

  if (minLevel) {
    return {
      name: next.name,
      minLevel,
      state: level >= minLevel ? 'ready' : 'wait',
      description: level >= minLevel ? `level ${minLevel} requirement reached` : `reaches the requirement at level ${minLevel}`
    };
  }

  const description = describeDetail(detail);
  return { name: next.name, minLevel: null, state: 'special', description };
}

function describeDetail(d) {
  const parts = [];
  if (d.trigger?.name === 'trade') parts.push('trade');
  if (d.trigger?.name === 'use-item') parts.push(`use ${pretty(d.item?.name || 'the required item')}`);
  if (d.item && d.trigger?.name !== 'use-item') parts.push(`use ${pretty(d.item.name)}`);
  if (d.held_item) parts.push(`hold ${pretty(d.held_item.name)}`);
  if (d.min_happiness) parts.push(`friendship ≥ ${d.min_happiness}`);
  if (d.min_affection) parts.push(`affection ≥ ${d.min_affection}`);
  if (d.min_beauty) parts.push(`beauty ≥ ${d.min_beauty}`);
  if (d.known_move) parts.push(`know ${pretty(d.known_move.name)}`);
  if (d.known_move_type) parts.push(`know a ${pretty(d.known_move_type.name)}-type move`);
  if (d.location) parts.push(`at ${pretty(d.location.name)}`);
  if (d.time_of_day) parts.push(`during ${d.time_of_day}`);
  if (d.needs_overworld_rain) parts.push('while it is raining');
  if (d.turn_upside_down) parts.push('with the device turned upside down');
  if (d.trade_species) parts.push(`trade for ${pretty(d.trade_species.name)}`);
  if (d.party_species) parts.push(`with ${pretty(d.party_species.name)} in the party`);
  if (d.party_type) parts.push(`with a ${pretty(d.party_type.name)}-type Pokémon in the party`);
  if (d.relative_physical_stats === 1) parts.push('Attack > Defense');
  if (d.relative_physical_stats === 0) parts.push('Attack = Defense');
  if (d.relative_physical_stats === -1) parts.push('Attack < Defense');
  if (d.gender === 1) parts.push('female');
  if (d.gender === 2) parts.push('male');
  return parts.length ? parts.join(' + ') : 'special evolution condition';
}

async function renderChain(flatChain, currentName) {
  chainEl.innerHTML = '';
  const cards = await Promise.all(flatChain.map(async node => {
    try {
      const data = await getJSON(`${API}/pokemon/${node.name}`);
      return { ...node, image: data.sprites.other?.['official-artwork']?.front_default || data.sprites.front_default };
    } catch (_) {
      return { ...node, image: null };
    }
  }));

  cards.forEach((node, index) => {
    if (index > 0) {
      const arrow = document.createElement('div');
      arrow.className = 'arrow-card';
      arrow.textContent = '→';
      chainEl.appendChild(arrow);
    }
    const card = document.createElement('article');
    card.className = `chain-card ${node.name === currentName ? 'current' : ''}`;
    card.innerHTML = `
      ${node.name === currentName ? '<span class="current-tag">CURRENT</span>' : ''}
      ${node.image ? `<img src="${node.image}" alt="${pretty(node.name)}">` : '<div class="image-fallback">?</div>'}
      <h3>${pretty(node.name)}</h3>
      <p>${node.fromDetail ? describeDetail(node.fromDetail) : 'Base form'}</p>
    `;
    chainEl.appendChild(card);
  });

  document.querySelector('#chain-note').textContent = flatChain.some(n => n.branch) ? 'Some Pokémon have branching evolution paths; all known branches are shown.' : 'Evolution chain from base form to final form.';
}

function flattenChain(chain) {
  const result = [];
  function walk(node, fromDetail = null, depth = 0, branch = false) {
    result.push({ name: node.species.name, fromDetail, depth, branch });
    node.evolves_to.forEach((child, i) => walk(child, child.evolution_details?.[0] || null, depth + 1, node.evolves_to.length > 1 || branch || i > 0));
  }
  walk(chain);
  return result;
}

function getDirectEvolutions(chain, targetName) {
  let found = [];
  function walk(node) {
    if (node.species.name === targetName) {
      found = node.evolves_to.map(child => ({ name: child.species.name, details: child.evolution_details || [] }));
      return true;
    }
    return node.evolves_to.some(walk);
  }
  walk(chain);
  return found;
}

function setVerdict(el, kind, text) {
  el.className = `verdict ${kind}`;
  el.textContent = text;
}

function setStatus(message, error = false) {
  statusEl.textContent = message;
  statusEl.className = `status${error ? ' error' : ''}`;
}

function pretty(value = '') {
  return value.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

async function getJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}
