# Minigame developer guide

## Add a game

1. Add public configuration and wire types under `shared/minigames/`. Define the ID, name, description, player count, countdown, duration, rounds, scoring, languages, and asset references there.
2. Implement `ServerMinigame` from `server/minigames/contracts.ts`. Its `start` function receives the match ID, two players, server time, and a development logger. Return an `ActiveMinigame` that provides public progress, a per-seat view, validated actions, time-based updates, and final results. Register it in `server/minigames/registry.ts`.
3. Implement the React view and register it by the same ID in `client/minigames/registry.ts`. It receives public progress, that player's view, a disabled flag, and an action sender. Point the server default at the new game to exercise it. The lobby currently offers one game and reads its ID from the room.
4. Add logic tests in `tests/`. Use explicit times and deterministic puzzle selection in tests. Run `npm test`, `npm run smoke`, `npm run test:browser`, and `npm run build`.

## Change Lost Instructions

- Edit `shared/minigames/lost-instructions.ts` for timing, rounds, scoring, language support, and asset IDs.
- Edit `server/minigames/lost-instructions/puzzles.ts` for generated puzzle objects, randomized starting and solution orders, and prompt templates. Each match generates three fresh boards by sampling three unique shape/color pairs from the full catalog. A shape or color may repeat; the complete pair may not repeat on one board. Every initial arrangement is unsolved.
- Define shapes, color swatches, and complete English/French/Spanish pair vocabulary in `shared/minigames/lost-instructions.ts`. The server composes the left/middle/right prompt and hint from the actual solution, including gender agreement for translated color names. Prompts must cover every supported pair in every position.
- Add a language in `shared/types.ts` with its BCP 47 tag, then add its authored translations to the puzzle dictionaries. Missing clues or hints fall back to English and emit a development warning. The instructor receives the language actually shown so the browser can announce it correctly.
- Edit the asset registry in `client/minigames/lost-instructions/View.tsx` to map a shape's asset ID to a CSS class or an image URL. Keep assets in the client tree with the board styles, or under `public/` for root-relative URLs.

## Room interface and ownership

For instructions, hints, or a vocabulary entry with a known language, render `<PronunciationButton text={entry.text} language={entry.language} />` from `client/pronunciation/PronunciationButton.tsx`. Pass the language of the displayed text, including any translation fallback. Give individual vocabulary buttons a distinct `label`, such as `Pronounce cercle in French`. The component uses installed, local browser voices and starts only when activated. The player can replay it during room voice chat.

The room owns authentication, membership, phase transitions, scheduling the countdown and deadline, and reconnection. It broadcasts only `GameProgress` and `GameResults` in the room snapshot. It sends `game-view` directly to each connection using that seat's server projection, including after the client's reconnect sync. Only the server imports puzzle definitions. Browser-side imports must stay on the public side of the shared contracts.

A `game-action` carries a match ID and an opaque action payload. The room checks membership, connectivity, and match ID before forwarding it. Lost Instructions checks the Operator role, round, revision, and action parameters. Update the revision on every processed move or submission so delayed copies cannot mutate the next state. Chat and voice are mounted at room scope. Results and replay stay in the same room.

The gameplay developer can own game-specific files under `server/minigames/lost-instructions/`, `client/minigames/lost-instructions/`, and the matching public config and tests. The platform developer can own `server/room.ts`, `client/session.ts`, `client/RoomScreen.tsx`, Firebase, voice, and deployment. Coordinate changes to the shared contract and registry entries when adding a game.

## Customize Map Navigator

Choose **Map Navigator** from the host's **Minigame** menu. The host is the Navigator and sees the private destination plus the outlined route; the guest is the Traveler and moves with a swipe on the map, directional controls, or arrow keys. Each deliberate swipe moves one tile in the swipe direction. Taps, small/ambiguous diagonal drags, and cancelled gestures do not move. All tiles use the same background, including landmarks and route tiles; private route outlines and checkpoint/destination markers distinguish the Navigator's view. The server validates every move, tracks wrong turns, and keeps the destination private until the route is completed.

The public configuration lives in `shared/minigames/map-navigator.ts`. Update the route, landmarks, translations, timer, and scoring there. The server state is in `server/minigames/map-navigator/game.ts`; the responsive map, translated prompts, vocabulary, and pronunciation controls are in `client/minigames/map-navigator/`.

## Customize Icon Communication

Choose **Icon Communication** from the host’s **Minigame** menu, then select **Start Game**. The host is the Selector and their learning language is the suggested language for descriptions. Both players review vocabulary in their own learning languages after the game.

The shared configuration in `shared/minigames/icon-communication.ts` controls the grid size, reveal delay, timers, penalty, scoring, and repeat guesses. `firstRoundDurationMs` is 20000; `roundDurationMs` is 10000 for later rounds. Each timer starts after the icon reveal, following a 1–3 second preparation delay. Change vocabulary or an asset reference in `shared/minigames/icons.ts`. Replace an SVG in `public/icons/` while keeping its path, or change `assetPath` to use a different file. Keep at least as many unique icons as grid cells.

The server keeps the existing round and deadline during a temporary disconnect. The timer keeps running, guesses resume when both players are back, and a player returning after the deadline sees results. The waiting period has no visible countdown. Total time includes the preparation periods.

## Player instructions

`client/minigames/instructions.tsx` provides each game's goal, assigned role, numbered controls, timing, and scoring. The guide opens before play and can be expanded during the game. Keep it consistent with server rules when changing a game. Codenames also has role guidance in each player's fluent language in `client/minigames/codenames/copy.ts`.

Set `IDLE_TEST_GAME_UPDATES=true` before `npm run test:browser` to check all six pregame guides, randomized shape puzzles with mouse and touch, map swipes and uniform tile backgrounds, and Icon's first-round timer. This uses the Firebase emulators and the installed Chromium/Chrome configuration described in README.
