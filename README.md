# Lost in Translation

Lost in Translation is a browser-based language practice game for two players. Its first minigame, Lost Instructions, gives the host clues in their learning language and gives the partner a shape puzzle to solve together. The React client uses Firebase Authentication for accounts and Firestore listeners for friends and invitations. An authenticated Colyseus server manages rooms, private instructions, text chat, and WebRTC signaling.

## Run locally

Use Node.js 24.12 or newer and Java 21 for the Firebase emulators.

If `node` is not recognized in VS Code, install the current Node.js LTS release from [nodejs.org](https://nodejs.org/), then close and reopen VS Code. Verify the installation with `node --version` and `npm --version` before running the commands below.

```powershell
npm ci
Copy-Item .env.example .env
npm run emulators
```

In another terminal:

```powershell
npm run dev
```

## Run in VS Code

Open this folder in VS Code, then run **Terminal → Run Task → Install dependencies** once. After that, run **Terminal → Run Task → Start language game** and open [http://localhost:5173](http://localhost:5173).

The workspace uses Command Prompt for its integrated terminal so Windows PowerShell execution-policy settings do not block npm. You can also run `npm.cmd run dev` manually from the project folder.

## Deploy to GitHub Pages

Pushing to `main` runs the GitHub Pages workflow and publishes the built Vite app to [anyacodes13.github.io/langue](https://anyacodes13.github.io/langue/). In the repository settings, open **Pages** and set **Source** to **GitHub Actions** once. The workflow then builds `dist` and deploys it automatically after each push.

Open [Lost in Translation on localhost](http://localhost:5173). Use separate browser profiles or a regular and a private window to play as two people. Create profiles, search for a friend by their full username, accept the request, and send a game invitation. You can also join from Play using a room code or invitation link. Each player selects **Join Voice** to start audio.
Open [Lost in Translation on localhost](http://localhost:5173). Use separate browser profiles or a regular and a private window to play as two people. Create profiles, search for a friend by their full username, accept the request, and send a game invitation. Each player selects **Join Voice** to start audio.
### Play with two browsers

Run `npx playwright install chromium` once, then `npm run dev:players` to open two isolated browser windows. You can also use two separate browser profiles or a private window. Optionally add `VITE_QUICK_GUEST=true` to `.env` and restart Vite. Select **Quick test guest** in each window to create independent Firebase emulator accounts and profiles.

1. Set the first profile to fluent English and learning French. Set the other to fluent French and learning English. Select **Play** and **Quick Play** in both windows. Both should enter the same lobby and see **Reciprocal match**.
2. Join voice or use the room chat. The host selects **Start Game**.
3. After the countdown, the Instructor reads their private clue. The Operator drags shapes to swap them or selects one shape and then its destination. Select **Check arrangement** to submit.
4. Solve three puzzles within 90 seconds. The host can select **Play Again** from the shared results screen while both players stay in the same room.

The countdown and timer continue during disconnects. Moves are blocked until both players are back. A reconnect restores the seat, clue or board, and score. If the match times out during the grace period, the returning player sees the results.

### Check matchmaking

- For a shared-learning match, use English → French and Spanish → French. Both players become eligible after 10 seconds.
- For an incompatible pair, use English → French and English → Spanish. Both stay in search even after 10 seconds. Select **Cancel** on both devices.
- To play with a friend, add and accept a friend request first. Open **Play With Friends**, choose a **Minigame**, then select **Invite to Play**. After your friend joins, you can change the minigame in the lobby before selecting **Start Game**.

The server keeps one in-memory queue and room-ownership map per deployment. A heartbeat expires after 15 seconds, a matched pair has up to 25 seconds to join, and a joined player keeps their seat during the existing 30-second reconnect window. Restarting the server clears the queue and active rooms. Run a single instance until the matchmaking and room ownership state is coordinated across instances. Set `MATCH_RECIPROCAL_PRIORITY_MS` on the server to adjust the default 10-second window. Reciprocal pairs take precedence among currently queued players, and shared-learning pairs become eligible after both have waited through the window.

### Automated tests

- `npm test` runs the minigame logic tests.
- `npm run smoke` tests the Firebase and Colyseus integration, including role privacy, gameplay, reconnection, and replay. Run it with the emulators and game server running.
- Set `IDLE_TEST_TIMEOUT=true` before running `npm run smoke` to also test the live 90-second deadline and shared defeat screen.
- `npm run test:browser` uses Playwright Chromium against the running Vite app with the Firebase emulators. It exercises mouse and emulated touch at 320 px, gameplay chat, results, and persistent WebRTC audio with fake microphones. Set `IDLE_CHROMIUM_PATH` to an installed Chrome executable to use it instead of the Playwright download.

The smoke tests create example documents in the local emulator. Chromium tests do not verify iOS Safari or real-world TURN relay.

See the [minigame developer guide](MINIGAMES.md) for configuration, asset replacement, and the server/client integration points.

## Test across devices with cloud Firebase

The [Lost in Translation Firebase project](https://console.firebase.google.com/project/lost-in-translation-langue/overview) stores profiles, friendships, and invitations in Cloud Firestore. Each profile saves its fluent and learning languages. Use the same email/password or Google account on another device to load the same profile.

On the Windows host, `.env.cloud` holds the Firebase web app configuration and tells the server to listen on loopback port 2568. To rebuild and restart the cloud-connected test server, run `npm run build:cloud` and then `npm run start:cloud`. The server uses Google Application Default Credentials. The emulator workflow still uses `.env`.

Connect both test devices to the same Tailscale network and enable **Use Tailscale DNS** on each. Open the [private playtest URL](https://coco.tail4285d5.ts.net:8443/) on both devices. Keep the Windows host online while testing. Use a different account on each device and select Quick Play, or send an invitation from Play With Friends. Tailscale Serve forwards the HTTPS and WebSocket traffic to the local game server.

## Deploy

The [public playtest](https://lost-in-translation-langue.web.app/) uses Firebase Hosting for the browser build and Tailscale Funnel for the game server on the Windows host. Players can open the Firebase link in a browser. Keep the host and `npm run start:cloud` running during a playtest.

To publish a new public browser build, use the cloud Firebase settings in `.env.cloud` and run:

```powershell
$env:VITE_GAME_SERVER = 'https://coco.tail4285d5.ts.net:10000'
npx vite build --mode cloud --outDir dist-public
npx --yes firebase-tools@15.36.0 deploy --only hosting --project lost-in-translation-langue
Remove-Item Env:VITE_GAME_SERVER
```

The game server's `CLIENT_ORIGIN` setting includes the Firebase Hosting domains. The Funnel forwards port 10000 to loopback port 2568. For a server that can stay available when the PC is off, deploy the backend to a WebSocket-capable host. Cloud Run requires a billing account on the Firebase project.

1. Create a Firebase project and a Cloud Firestore database. Enable Google, Email/Password, and Anonymous sign-in, and authorize your frontend domain in Firebase Authentication.
2. Set the public `VITE_FIREBASE_*` web app settings, set `VITE_USE_EMULATORS=false`, and set the server's `FIREBASE_PROJECT_ID` to the same project. Remove both emulator host variables. Give the backend Firebase Admin access through Application Default Credentials.
3. Deploy the Firestore rules with `npx --yes firebase-tools@14.17.0 deploy --only firestore:rules --project YOUR_PROJECT_ID`.
4. Run `npm run build` followed by `npm start`. Point your HTTPS reverse proxy at the server and forward WebSocket upgrades. The server serves the built frontend from `dist` and expects same-origin API requests. Run one server instance, since active rooms live in its memory.
5. Set `TURN_URLS` and the backend-only `TURN_SECRET` for a TURN server that supports shared-secret authentication, such as coturn. The game server issues short-lived relay credentials to signed-in players. Test voice between devices on different networks, including a restrictive network. Browsers require HTTPS or localhost for microphone access.

`INVITE_SECONDS` controls invitation lifetime and defaults to 300 seconds. Rooms waiting for a partner expire after 30 minutes. A disconnected player's spot is held for 30 seconds. Chat lives in room memory until the session ends. The game and results screens share the same chat and voice controls as the lobby.
