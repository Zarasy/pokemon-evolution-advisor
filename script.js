
let pokemonData = [];

function capitalize(name) {
    return name.charAt(0).toUpperCase() + name.slice(1);
}

function parseCSV(text) {
    const rows = [];
    let row = [];
    let value = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (char === '"') {
            if (inQuotes && text[i + 1] === '"') {
                value += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === "," && !inQuotes) {
            row.push(value);
            value = "";
        } else if ((char === "\n" || char === "\r") && !inQuotes) {
            if (char === "\r" && text[i + 1] === "\n") i++;
            row.push(value);
            rows.push(row);
            row = [];
            value = "";
        } else {
            value += char;
        }
    }

    if (value || row.length) {
        row.push(value);
        rows.push(row);
    }

    const headers = rows.shift().map(h => h.trim());

    return rows
        .filter(row => row.some(value => value.trim()))
        .map(row => {
            const pokemon = {};

            headers.forEach((header, index) => {
                pokemon[header] = row[index] || "";
            });

            return pokemon;
        });
}

async function loadPokemon() {
    const status = document.getElementById("status");

    try {
        const response = await fetch("./pokemon.csv");

        if (!response.ok) {
            throw new Error("Could not load pokemon.csv");
        }

        const csvText = await response.text();
        pokemonData = parseCSV(csvText);

        status.textContent =
            `${pokemonData.length} Pokémon loaded successfully!`;

        const bulbasaur = pokemonData.find(
            p => p.pokemon.toLowerCase() === "bulbasaur"
        );

        if (bulbasaur) displayPokemon(bulbasaur);

    } catch (error) {
        status.textContent = "Error loading Pokémon data.";
        console.error(error);
    }
}

function findEvolution(pokemon) {
    return pokemonData.find(p =>
        p.evolves_from_species_id === pokemon.species_id
    );
}

const statKeys = [
    "hp",
    "attack",
    "defense",
    "special_attack",
    "special_defense",
    "speed"
];

function calculateTotal(pokemon) {
    if (!pokemon) return 0;

    return statKeys.reduce(
        (total, key) => total + Number(pokemon[key] || 0),
        0
    );
}

function getPokemonImage(pokemon) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.species_id}.png`;
}

function setPokemonImage(elementId, pokemon) {
    const image = document.getElementById(elementId);

    image.style.display = "block";
    image.alt = capitalize(pokemon.pokemon);

    image.onerror = () => {
        image.style.display = "none";
    };

    image.src = getPokemonImage(pokemon);
}

function displayPokemon(pokemon) {
    const evolution = findEvolution(pokemon);

    document.getElementById("pokemon-section")
        .classList.remove("hidden");

    document.getElementById("current-name").textContent =
        capitalize(pokemon.pokemon);

    document.getElementById("current-type").textContent =
        [pokemon.type_1, pokemon.type_2]
            .filter(type => type && type !== "NA")
            .join(" / ");

    document.getElementById("current-total").textContent =
        calculateTotal(pokemon);

    setPokemonImage("current-image", pokemon);

    if (evolution) {
        document.getElementById("evolution-name").textContent =
            capitalize(evolution.pokemon);

        document.getElementById("evolution-type").textContent =
            [evolution.type_1, evolution.type_2]
                .filter(type => type && type !== "NA")
                .join(" / ");

        document.getElementById("evolution-total").textContent =
            calculateTotal(evolution);

        setPokemonImage("evolution-image", evolution);

        displayStats(pokemon, evolution);
        displayRecommendation(pokemon, evolution);

    } else {
        document.getElementById("evolution-name").textContent =
            "No evolution found";

        document.getElementById("evolution-type").textContent = "";
        document.getElementById("evolution-total").textContent = "—";

        document.getElementById("evolution-image")
            .style.display = "none";

        document.getElementById("stats-comparison")
            .innerHTML = "<p>No next evolution in this dataset.</p>";

        document.getElementById("recommendation-title")
            .textContent = "NO EVOLUTION AVAILABLE";

        document.getElementById("recommendation-text")
            .textContent =
            `${capitalize(pokemon.pokemon)} has no next evolution recorded in this dataset.`;
    }
}

function displayStats(pokemon, evolution) {
    const stats = [
        ["HP", "hp"],
        ["Attack", "attack"],
        ["Defense", "defense"],
        ["Special Attack", "special_attack"],
        ["Special Defense", "special_defense"],
        ["Speed", "speed"]
    ];

    const container = document.getElementById("stats-comparison");
    container.innerHTML = "";

    stats.forEach(([label, key]) => {
        const current = Number(pokemon[key] || 0);
        const evolved = Number(evolution[key] || 0);

        const row = document.createElement("div");
        row.className = "stat-row";

        const heading = document.createElement("div");
        heading.className = "stat-heading";

        const name = document.createElement("span");
        name.textContent = label;

        const values = document.createElement("span");
        values.textContent = `${current} → ${evolved}`;

        heading.append(name, values);

        const bar = document.createElement("div");
        bar.className = "stat-bar";

        const fill = document.createElement("div");
        fill.className = "stat-fill";
        fill.style.width = `${Math.min(100, evolved / 255 * 100)}%`;

        bar.appendChild(fill);
        row.append(heading, bar);
        container.appendChild(row);
    });
}

// DECISION MODEL
function displayRecommendation(pokemon, evolution) {
    const currentTotal = calculateTotal(pokemon);
    const evolutionTotal = calculateTotal(evolution);

    const difference = evolutionTotal - currentTotal;
    const percentage = currentTotal > 0
        ? (difference / currentTotal * 100).toFixed(1)
        : 0;

    const currentName = capitalize(pokemon.pokemon);
    const evolutionName = capitalize(evolution.pokemon);

    const improvedStats = statKeys.filter(
        key => Number(evolution[key]) > Number(pokemon[key])
    ).length;

    const title = document.getElementById("recommendation-title");
    const text = document.getElementById("recommendation-text");

    if (difference > 0) {
        title.textContent = `YES — Evolve ${currentName}!`;

        text.textContent =
            `Based on base stats, evolving ${currentName} into ${evolutionName} is recommended. ` +
            `Total base stats increase from ${currentTotal} to ${evolutionTotal}, ` +
            `a gain of ${difference} points (${percentage}%). ` +
            `${improvedStats} out of 6 stats improve. ` +
            `This recommendation considers base stats only, not moves, abilities, ` +
            `evolution requirements or battle strategy.`;

    } else {
        title.textContent = `NOT RECOMMENDED — ${currentName}`;

        text.textContent =
            `Based on total base stats, evolution does not provide an overall improvement. ` +
            `Current total: ${currentTotal}. Evolution total: ${evolutionTotal}. ` +
            `Other gameplay factors may still make evolution useful.`;
    }
}

document.getElementById("pokemon-search")
    .addEventListener("input", function () {

        const query = this.value.toLowerCase().trim();
        const results = document.getElementById("search-results");

        results.innerHTML = "";

        if (!query) return;

        const matches = pokemonData
            .filter(p => p.pokemon.toLowerCase().includes(query))
            .slice(0, 12);

        matches.forEach(pokemon => {
            const button = document.createElement("button");
            button.textContent = capitalize(pokemon.pokemon);

            button.addEventListener("click", () => {
                displayPokemon(pokemon);
                document.getElementById("pokemon-search").value =
                    capitalize(pokemon.pokemon);
                results.innerHTML = "";
            });

            results.appendChild(button);
        });

        if (!matches.length) {
            results.textContent = "No Pokémon found.";
        }
    });

loadPokemon();
