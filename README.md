# Lost in Translation

Lost in Translation is a browser-based language practice game for two players. Its first minigame, In Good Shape, gives the host clues in their learning language and gives the partner a shape puzzle to solve together. Boards draw from eight shapes and eight colors; shapes and colors may repeat, but each pair on the board is unique. The React client uses Firebase Authentication for accounts and Firestore listeners for friends and invitations. An authenticated Colyseus server manages rooms, private instructions, text chat, and WebRTC signaling.

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

### Play with two browsers

Run `npx playwright install chromium` once, then `npm run dev:players` to open two isolated browser windows. You can also use two separate browser profiles or a private window. Optionally add `VITE_QUICK_GUEST=true` to `.env` and restart Vite. Select **Quick test guest** in each window to create independent Firebase emulator accounts and profiles.

1. Set the first profile to fluent English and learning French. Set the other to fluent French and learning English. Select **Play** in both windows. Both should see **You found a partner!** and **Reciprocal match**.
2. Both players select **I’m ready!**. On **Meet your partner!**, use **Test mic**, then join voice or use chat to say hello. Both players select **I’m ready to play!** to start.
3. After the countdown, the Instructor reads their private clue and target picture. The Operator drags shapes to swap them or selects one shape and then its destination. Select **Check arrangement** to submit; both players see a check-mark celebration for a correct puzzle.
4. Solve three puzzles before the shared timer ends. The base allowance is 90 seconds, with extra practice time for lower language levels. Select **Play Again** on both devices to stay together, or **Back to home** to leave.

All six games include illustrated steps alongside their written instructions, with a pointing hand and tap rings for interactive steps. In Tandem Drive, hold **Space**, the driving area, or your thruster button to drive your side; release to stop. Typing in chat does not activate a thruster. In Spot the Difference, an object's **i** icon shows its word in your own learning language and does not count as a guess.

Every game has **End early** and **Quit** at the bottom. End early asks for confirmation, then shows both players their current results while keeping voice, chat, and replay available. Either player can end early, including while their partner is reconnecting. Quit asks for confirmation during play and returns both players home. The results screen also has **Quit** below **Play Again**.

Timed games use the longer allowance needed by the two players in their selected learning languages: **Just Starting 2×**, **Beginner 1.5×**, **Conversational 1.25×**, **Comfortable 1.1×**, and **Fluent 1×**. Checking **I consider myself fluent** also uses 1×. Unassessed profiles retain the base timing. The allowance is fixed when each game starts and remains in force on reconnect; countdowns and incorrect-guess penalties keep their base values. Codenames remains untimed.

The countdown and timer continue during disconnects. Moves are blocked until both players are back. A reconnect or refresh in the same tab restores the seat, clue or board, and score within the reconnect window. If the match times out during the grace period, the returning player sees the results.

### Check matchmaking

- For a shared-learning match, use English → French and Spanish → French. Both players become eligible after 10 seconds.
- For an incompatible pair, use English → French and English → Spanish. Both stay in search even after 10 seconds. Select **Cancel** on both devices.
- To play with a friend, add and accept a friend request first. Open **Play With Friends**, choose a **Minigame**, then select **Invite to Play**. Your friend can accept from **Play With Friends**. The inviter can change the minigame until either player confirms the match.

The server keeps one in-memory queue and room-ownership map per deployment. A heartbeat expires after 15 seconds, a matched pair has up to 25 seconds to join, and a joined player keeps their seat during the existing 30-second reconnect window. Restarting the server clears the queue and active rooms. Run a single instance until the matchmaking and room ownership state is coordinated across instances. Set `MATCH_RECIPROCAL_PRIORITY_MS` on the server to adjust the default 10-second window. Reciprocal pairs take precedence among currently queued players, and shared-learning pairs become eligible after both have waited through the window.

### Automated tests

- `npm test` runs minigame logic and voice configuration/signaling tests.
- `npm run smoke` tests the Firebase and Colyseus integration, including role privacy, gameplay, reconnection, and replay. Run it with the emulators and game server running.
- Set `IDLE_TEST_TIMEOUT=true` before running `npm run smoke` to also test the live 90-second deadline and shared defeat screen.
- `npm run test:browser` uses Playwright Chromium against the running Vite app with the Firebase emulators. It exercises mouse and emulated touch at 320 px, gameplay chat, results, and persistent WebRTC audio with fake microphones. Set `IDLE_CHROMIUM_PATH` to an installed Chrome executable to use it instead of the Playwright download.
- Set `IDLE_TEST_POLISH=true` for illustrated guides, a mixed Beginner/Fluent timer, private shape target images and success checks, responsive Codenames word fitting, learning-word popovers, and driving with Space and pointer holds. Browser fixtures explicitly select Fluent for baseline timing unless exercising beginner time.
- Set `IDLE_TEST_EXIT=true` to exercise End early and Quit in all six games, including cancellation, shared results, replay, continued voice/chat, and returning both players home.
- Set `IDLE_TEST_VOICE=true` for the focused voice regression: guest-first joining, temporary-credential refresh, ICE recovery from both seats, room reconnection, mute/unmute, leaving/rejoining, retry, and text chat during voice failure. It uses two isolated browser contexts and fake microphones. With the emulators and `npm run dev` running, use PowerShell:

  ```powershell
  $env:IDLE_TEST_VOICE = 'true'
  # Optional when Playwright's Chromium is not installed:
  $env:IDLE_CHROMIUM_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
  npm.cmd run test:browser
  Remove-Item Env:IDLE_TEST_VOICE
  Remove-Item Env:IDLE_CHROMIUM_PATH -ErrorAction SilentlyContinue
  ```

The smoke tests create example documents in the local emulator. These browser tests verify local WebRTC behavior and audio packet flow, with simulated failure events and expiry metadata; they do not verify physical devices, iOS Safari, or real UDP/TCP/TLS TURN paths across separate networks. Complete the [real-device acceptance checks](deploy/turn/README.md#real-device-acceptance-record) against a running relay before claiming production connectivity.

See the [minigame developer guide](MINIGAMES.md) for configuration, asset replacement, and the server/client integration points.

## Test across devices with cloud Firebase

The [Lost in Translation Firebase project](https://console.firebase.google.com/project/lost-in-translation-langue/overview) stores profiles, friendships, and invitations in Cloud Firestore. Each profile saves its fluent and learning languages. Use the same email/password or Google account on another device to load the same profile.

On the Windows host, `.env.cloud` holds the Firebase web app configuration and tells the server to listen on loopback port 2568. To rebuild and restart the cloud-connected test server, run `npm run build:cloud` and then `npm run start:cloud`. The server uses Google Application Default Credentials. The emulator workflow still uses `.env`.

Connect both test devices to the same Tailscale network and enable **Use Tailscale DNS** on each. Open the [private playtest URL](https://coco.tail4285d5.ts.net:8443/) on both devices. Keep the Windows host online while testing. Use a different account on each device and select **Play**, or send an invitation from **Play With Friends**. Tailscale Serve forwards the HTTPS and WebSocket traffic to the local game server.

## Deploy

The [public playtest](https://lost-in-translation-langue.web.app/) uses Firebase Hosting for the browser build and Tailscale Funnel for the game server on the Windows host. Players can open the Firebase link in a browser. Keep the host and `npm run start:cloud` running during a playtest.

To publish a new public browser build, use the cloud Firebase settings in `.env.cloud` and run:

```powershell
$env:VITE_GAME_SERVER = 'https://coco.tail4285d5.ts.net:10000'
npx vite build --mode cloud --outDir dist-public
npx --yes firebase-tools@15.36.0 deploy --only hosting --project lost-in-translation-langue
Remove-Item Env:VITE_GAME_SERVER
```

The game server's `CLIENT_ORIGIN` setting includes the Firebase Hosting domains. The Funnel forwards port 10000 to loopback port 2568.

### Run the game server on Render

In the [Render dashboard](https://dashboard.render.com/), sign in with GitHub, create a Blueprint, and connect `bustedchickn/langue`. Grant Render access to that repository. Select the branch containing `render.yaml`. The Blueprint creates a single Free Docker web service named `langue-game`.

In Google Cloud IAM for `lost-in-translation-langue`, create a dedicated service account for Render with `roles/datastore.user` and `roles/firebaseauth.viewer`. Add a JSON key for that account as a Render Secret File named `firebase-admin.json`. The Blueprint points Firebase Admin at `/etc/secrets/firebase-admin.json`.

After Render deploys, verify `/healthz` on the Render URL returns `200`, `/api/profile` returns `401` without a token, and two Firebase accounts can join a game. Build the public client with `VITE_GAME_SERVER` set to the service's HTTPS URL, then run the Firebase Hosting deploy command above. Verify matchmaking from the public site before switching off the Windows server.

Render's Free service sleeps after 15 minutes without inbound traffic and can take about a minute to wake. Restarts clear active rooms. Voice still requires a configured TURN relay.

### Run the game server on Cloud Run

Cloud Run can serve the Colyseus HTTP API and WebSockets directly while Firebase Hosting continues to serve the browser app at the same URL. Linking a Cloud Billing account upgrades the Firebase project to Blaze. Sign in with `gcloud auth login` using an account with deployment access to the project.

For the first deployment, enable the deployment APIs and create the runtime identity:

```powershell
$project = 'lost-in-translation-langue'
$runtime = "langue-game@$project.iam.gserviceaccount.com"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com --project $project
gcloud iam service-accounts create langue-game --project $project
foreach ($role in 'roles/datastore.user', 'roles/firebaseauth.viewer') {
  gcloud projects add-iam-policy-binding $project --member "serviceAccount:$runtime" --role $role
}
```

The deployer needs permission to use that runtime account. The Cloud Build service account needs the [Cloud Run Builder role](https://docs.cloud.google.com/run/docs/configuring/services/build-service-account). Deploy from the repository root:

```powershell
$region = 'us-central1'
$service = 'langue-game'
gcloud run deploy $service --project $project --region $region --source . `
  --service-account $runtime --no-invoker-iam-check --max 1 --min 0 --timeout 3600 `
  --update-env-vars '^|^FIREBASE_PROJECT_ID=lost-in-translation-langue|CLIENT_ORIGIN=https://lost-in-translation-langue.web.app,https://lost-in-translation-langue.firebaseapp.com'
```

The app continues to require Firebase ID tokens for its API and room entry. The single-instance limit keeps room and matchmaking state in one process. A restart can clear active rooms, and Cloud Run WebSockets time out after at most one hour. For voice, configure the TURN service below and inject `TURN_SECRET` from Secret Manager.

Check that the service's `/api/profile` returns `401` without a token. Then set `VITE_GAME_SERVER` to its HTTPS URL and run the existing Firebase Hosting build and deploy commands:

```powershell
$env:VITE_GAME_SERVER = gcloud run services describe $service --project $project --region $region --format 'value(status.url)'
if ($LASTEXITCODE -ne 0 -or !$env:VITE_GAME_SERVER) { throw 'Cloud Run service URL unavailable.' }
npx vite build --mode cloud --outDir dist-public
if ($LASTEXITCODE -ne 0) { throw 'Public build failed.' }
npx --yes firebase-tools@15.36.0 deploy --only hosting --project $project
Remove-Item Env:VITE_GAME_SERVER
```

From the hosted site, sign in with two accounts and verify matchmaking and game actions before shutting down the Windows server.

### Set up another Firebase project

1. Create a Firebase project and a Cloud Firestore database. Enable Google, Email/Password, and Anonymous sign-in, and authorize your frontend domain in Firebase Authentication.
2. Set the public `VITE_FIREBASE_*` web app settings, set `VITE_USE_EMULATORS=false`, and set the server's `FIREBASE_PROJECT_ID` to the same project. Remove both emulator host variables. Give the backend Firebase Admin access through Application Default Credentials.
3. Deploy the Firestore rules with `npx --yes firebase-tools@14.17.0 deploy --only firestore:rules --project YOUR_PROJECT_ID`.
4. Run `npm run build` followed by `npm start`. Point your HTTPS reverse proxy at the server and forward WebSocket upgrades. The server serves the built frontend from `dist` and expects same-origin API requests. Run one server instance, since active rooms live in its memory.
5. Deploy the [production TURN relay](deploy/turn/README.md) on a dedicated public Linux host. The included coturn configuration exposes UDP/TCP 3478, TLS 5349, TLS on TCP 443, and a fixed UDP relay range. Configure `TURN_URLS`, the backend-only `TURN_SECRET`, and `TURN_CREDENTIAL_TTL_SECONDS`; production reports missing relay transports as voice unavailable while keeping text chat working. The guide covers DNS, certificates, firewall/NAT rules, secret handling, and a real-device acceptance matrix. Browsers require HTTPS or localhost for microphone access. TURN over TLS on 443 can still be blocked by traffic inspection, hostname/IP restrictions, or proxies that refuse TURN/CONNECT tunnels or require authentication the browser's WebRTC stack cannot satisfy; text chat remains available while voice retries.

`INVITE_SECONDS` controls invitation lifetime and defaults to 300 seconds. Rooms waiting for a partner expire after 30 minutes. A disconnected player's spot is held for 30 seconds. Chat lives in room memory until the session ends. The game and results screens share the same chat and voice controls as the lobby.
