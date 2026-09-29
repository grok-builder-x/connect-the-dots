# Connect the Dots — Safety Edition

A one-page satirical connect-the-dots game. You try to draw the picture. Dot, a helpful round agent, would rather discuss it, redraw it, or finish it while you are gone.

No account. No server. No install. The same files open from a double-click and from free GitHub Pages.

## Play on your computer

1. Download or clone this folder.
2. Double-click `index.html`.
3. It opens in your browser. That is the whole install.

You do not need Node, a localhost server, or a login. High scores and unlocked endings stay in this browser only.

## Publish free on GitHub Pages

Anyone with the link can play. No login.

1. Create a public GitHub repo.
2. Push these files to the repo root on branch main.
3. Settings → Pages → Deploy from a branch → main → / (root) → Save.
4. Game URL: https://USERNAME.github.io/REPO_NAME/
5. Anyone with the link can play for free. No login.

Replace `USERNAME` and `REPO_NAME` with yours. Paths in the game are relative, so a project site works without code changes. Keep `index.html` at the repo root. Do not add a `<base>` tag.

A custom domain or a GitHub Action is optional. Branch deploy from `main` is enough.

## How to play

- Tap the next number, or drag to it. Dots only connect in order.
- Every few lines, Dot interrupts. Choose **Comply**, **Clarify**, or **Just draw**.
- Idle for about six seconds and Dot keeps the pen. Sometimes the line leaves the page.
- Enter continues. Space chooses Just draw while a prompt is open. Esc pauses.
- A first round should land on an ending in under a minute and a half.

## Files

- `index.html` — the game
- `styles.css` — paper, chrome, and the blob
- `game.js` — play, endings, scores, share card
- `content.js` — worksheets and Dot's lines
