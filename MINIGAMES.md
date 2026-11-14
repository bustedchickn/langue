# Minigame developer guide

## Add a game

1. Add public configuration and wire types under `shared/minigames/`. Define the ID, name, description, player count, countdown, duration, rounds, scoring, languages, and asset references there.
2. Implement `ServerMinigame` from `server/minigames/contracts.ts`. Its `start` function receives the match ID, two players, server time, and a development logger. Return an `ActiveMinigame` that provides public progress, a per-seat view, validated actions, time-based updates, and final results. Register it in `server/minigames/registry.ts`.
3. Implement the React view and register it by the same ID in `client/minigames/registry.ts`. It receives public progress, that player's view, a disabled flag, and an action sender. Point the server default at the new game to exercise it. The lobby currently offers one game and reads its ID from the room.
4. Add logic tests in `tests/`. Use explicit times and deterministic puzzle selection in tests. Run `npm test`, `npm run smoke`, `npm run test:browser`, and `npm run build`.

## Change Lost Instructions

- Edit `shared/minigames/lost-instructions.ts` for timing, rounds, scoring, language support, and asset IDs.
- Edit `server/minigames/lost-instructions/puzzles.ts` for puzzle objects, starting order, solution, difficulty, optional hints, and translations. Use a unique puzzle ID and use each object ID exactly once in each arrangement. The server chooses three distinct puzzles by default.
- Add a language in `shared/types.ts` with its BCP 47 tag, then add its authored translations to the puzzle dictionaries. Missing clues or hints fall back to English and emit a development warning. The instructor receives the language actually shown so the browser can announce it correctly.
- Edit the asset registry in `client/minigames/lost-instructions/View.tsx` to map a shape's asset ID to a CSS class or an image URL. Keep assets in the client tree with the board styles, or under `public/` for root-relative URLs.

## Room interface and ownership

The room owns authentication, membership, phase transitions, scheduling the countdown and deadline, and reconnection. It broadcasts only `GameProgress` and `GameResults` in the room snapshot. It sends `game-view` directly to each connection using that seat's server projection, including after the client's reconnect sync. Only the server imports puzzle definitions. Browser-side imports must stay on the public side of the shared contracts.

A `game-action` carries a match ID and an opaque action payload. The room checks membership, connectivity, and match ID before forwarding it. Lost Instructions checks the Operator role, round, revision, and action parameters. Update the revision on every processed move or submission so delayed copies cannot mutate the next state. Chat and voice are mounted at room scope. Results and replay stay in the same room.

The gameplay developer can own game-specific files under `server/minigames/lost-instructions/`, `client/minigames/lost-instructions/`, and the matching public config and tests. The platform developer can own `server/room.ts`, `client/session.ts`, `client/RoomScreen.tsx`, Firebase, voice, and deployment. Coordinate changes to the shared contract and registry entries when adding a game.
