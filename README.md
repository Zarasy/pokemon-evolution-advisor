# Pokémon Evolution Advisor

A small static website that helps answer:

> **Should I evolve this Pokémon?**

The user searches for a Pokémon and enters its current level. The app retrieves Pokémon, species, sprite, and evolution-chain data from [PokéAPI](https://pokeapi.co/) and returns one of four outcomes:

- **Yes — you can evolve** for satisfied level-based evolutions.
- **Not yet** when the next level requirement has not been reached.
- **It depends** for item, trade, friendship, time/location, or other special conditions.
- **No evolution available** when the Pokémon is already at the end of its evolution line.

When image data is available, official Pokémon artwork is displayed both in the result and evolution path.

## Tech

- HTML
- CSS
- Vanilla JavaScript
- PokéAPI
- GitHub Pages compatible (no build step)

## Run locally

Open `index.html` in a browser, or serve the folder with any simple static web server.

Example:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Publish on GitHub Pages

1. Create a new **public** GitHub repository.
2. Add `index.html`, `styles.css`, `app.js`, and `README.md` to the repository root.
3. In GitHub, go to **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select `main` and `/ (root)`, then save.
6. GitHub will provide the live Pages URL after deployment.

## Submission text

**Live website:** `ADD_GITHUB_PAGES_URL_HERE`

**Public repository:** `ADD_PUBLIC_REPOSITORY_URL_HERE`

**Time spent:** `REPLACE_WITH_YOUR_ACTUAL_TIME` — include the time you personally spent reviewing, testing, and submitting the case as well as any implementation time you want to count.

**Cost:** No hosting or API cost: GitHub Pages and PokéAPI can both be used for free. AI assistance from ChatGPT was used for implementation and documentation. `REPLACE_WITH_YOUR_CHATGPT_PLAN_AND_APPROXIMATE_USAGE` so the AI-usage statement accurately reflects your account and usage.

## Notes

Pokémon evolution mechanics can vary between game titles and generations. PokéAPI provides normalized evolution-chain data, so this app is intended as a practical high-level advisor rather than a title-specific competitive guide.
