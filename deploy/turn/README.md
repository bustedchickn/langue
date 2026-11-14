# Production voice relay

## Managed relay on Render

Create a TURN key under **Realtime → TURN** in the [Cloudflare dashboard](https://dash.cloudflare.com/). In the Render service's Environment settings, set `CLOUDFLARE_TURN_KEY_ID` and `CLOUDFLARE_TURN_API_TOKEN` to the key ID and its token. Save and redeploy. Keep both values server-side. Cloudflare issues temporary credentials after the game server verifies room membership. The default lifetime is one hour and can be set with `TURN_CREDENTIAL_TTL_SECONDS`.

Verify voice with two signed-in players and confirm that a relay candidate carries audio using the browser checks below.

## Self-hosted coturn

The game server already authenticates Firebase players and signs temporary TURN credentials. The files here deploy the matching coturn service. A successful app build does **not** create a relay: provision a Linux VM, a public address, DNS, and a trusted certificate before enabling production voice.

## Host, DNS, and ports

Use a dedicated Linux VM with Docker Engine and Compose v2, a reserved public IPv4 address, and enough bandwidth for relayed audio. Create a **DNS-only A record** such as `turn.example.com` pointing to it. Do not enable a CDN HTTP proxy for this name. Publish AAAA only after adding and testing working public IPv6 listeners, relay addresses, and firewall rules; this template is IPv4.

Reserve port 443 on this VM for TURN. The application can keep its HTTPS hostname on a different host/IP. In this Compose file, both TCP 443 and TCP 5349 map directly to coturn's TLS listener on container port 5349. TLS terminates in coturn using the certificate for `turn.example.com`. An HTTP reverse proxy, Firebase Hosting, Tailscale Serve/Funnel, or a WebSocket-only hosting service cannot carry these TURN allocations. An existing proxy needs a separate public IP or an explicitly configured layer-4 TCP passthrough route with no HTTP parsing.

Allow these ports in the cloud security group, host firewall, and any upstream NAT:

| Public ingress | Purpose |
| --- | --- |
| UDP 3478 | STUN and TURN over UDP; preferred latency |
| TCP 3478 | TURN when client UDP is blocked |
| TCP 5349 | TURN over TLS |
| TCP 443 | TURN over TLS for networks that permit outbound TCP 443 |
| UDP 49160–49359 | Coturn's relay allocations, even for clients using TCP/TLS |

Allow outbound UDP to public peer addresses and the relay's own public address, plus established reply traffic. UDP 443, UDP 5349, and the relay range over TCP are not required by this configuration. Restrict SSH to administrators. If the provider uses 1:1 NAT, forward all these ports and preserve each relay port number. NAT loopback/hairpin must allow one relay allocation to reach another allocation on the same public IP. `TURN_EXTERNAL_IP` is the reserved public address; do not set it to the container address. Carrier-grade NAT without configurable public port forwarding cannot host this service.

The 200-port relay range and quotas are a small-deployment starting point. Monitor allocation failures, bandwidth, and concurrent calls. Increase the range in **all three places**—`turnserver.conf`, `compose.yaml`, and firewalls—when increasing capacity.

## Certificates and server-only secret

Use a publicly trusted PEM certificate with the TURN hostname in its subject alternative names. Provide the full chain and its unencrypted private key. A self-signed certificate or a certificate for the app hostname will fail in browsers. The configuration explicitly disables the legacy TLS 1.0/1.1 enable switches (`tlsv1=0`, `tlsv1_1=0`), keeping TLS 1.2 as the minimum. Use an ACME client, preferably DNS-01; HTTP-01 instead needs port 80 and its own renewal responder.

Run the following on the Linux relay host from a checkout of this repository. Replace `turn.example.com` and the public IP in `.env` before starting. The UID is the unprivileged coturn user in the pinned image. Run the staging commands with administrator access, and keep that directory readable only to administrators and coturn.

```sh
cd deploy/turn
cp .env.example .env
# Edit .env: TURN_DOMAIN and TURN_EXTERNAL_IP.
sudo install -d -m 0700 private
sudo install -d -o 65534 -g 65534 -m 0700 private/certs
sudo sh -c 'umask 077; openssl rand -hex 32 > private/turn-secret'
sudo chown 65534:65534 private/turn-secret
sudo chmod 0400 private/turn-secret
sudo install -o 65534 -g 65534 -m 0400 \
  /etc/letsencrypt/live/turn.example.com/fullchain.pem private/certs/fullchain.pem
sudo install -o 65534 -g 65534 -m 0400 \
  /etc/letsencrypt/live/turn.example.com/privkey.pem private/certs/privkey.pem
sudo docker compose config --quiet
sudo docker compose up -d
sudo docker compose logs --tail=80 turn
```

The shared secret is mounted as a Compose secret and inserted into a mode-0600 configuration on container temporary storage; it is absent from the container command line and Compose environment. The process runs as UID/GID 65534 with a read-only root filesystem and `no-new-privileges`. Only `NET_BIND_SERVICE` remains in the capability bounding set, because the upstream binary carries that file capability. This uses Docker bridge networking with explicit port mappings; no privileged bind inside the container is needed. If the `private` directory cannot be traversed by your login user, use `sudo` for the Docker commands as shown. Compose's file-backed secrets retain host file permissions, so the ownership steps matter.

On every successful certificate renewal, repeat the two certificate staging commands and run `sudo docker compose restart turn`. Restarting a relay interrupts active allocations; schedule renewals and deployments accordingly. Monitor expiry and TLS reachability. Keep both VM and pinned coturn image patched; review a newer image revision before changing the pin.

Securely copy the **same** hex secret into the game backend's secret store as `TURN_SECRET`. Never include it in a `VITE_*` variable, Firebase Hosting assets, browser source, a public TURN testing site, screenshots, or logs. Do not commit `.env`, certificates, or `private/`. Rotate coturn and backend secrets together during a maintenance window: existing credentials signed with the old secret may stop working and clients will reconnect using newly issued credentials.

## Game backend environment

Set these on the Node game server, including `.env.cloud` for the existing cloud-connected playtest backend:

```dotenv
NODE_ENV=production
TURN_URLS=turn:turn.example.com:3478?transport=udp,turn:turn.example.com:3478?transport=tcp,turns:turn.example.com:5349?transport=tcp,turns:turn.example.com:443?transport=tcp
TURN_SECRET=<the contents of private/turn-secret>
TURN_CREDENTIAL_TTL_SECONDS=3600
# Optional; an empty value disables STUN URLs if you want to rely on TURN.
STUN_URLS=stun:turn.example.com:3478
```

Also keep the existing real `FIREBASE_PROJECT_ID`, Firebase Admin credentials, allowed `CLIENT_ORIGIN` HTTPS origins, and public frontend Firebase settings. Remove Firebase emulator host variables from production. Synchronize clocks on the backend and relay with NTP; TURN REST credentials use Unix expiry timestamps. Credential lifetime defaults to 3600 seconds and accepts 120–86400 seconds. The client receives only temporary credentials and expiry metadata from `/api/voice?roomId=<connected-room-id>` and refreshes them during recovery. The route requires both a valid Firebase bearer token and membership in a connected room; an authenticated player outside that room is denied.

Deploy the updated browser build and game backend together: the voice configuration response and signaling messages have changed. Reload existing browser tabs after the rollout. Schedule the backend restart between playtests, because active rooms are held in memory and a restart ends them. Set the backend variables before starting it; changing a local environment file requires a backend restart.

Production voice requires TURN URLs for UDP, TCP, and TLS on 443, plus a shared secret of at least 32 characters. If relay options are missing or incomplete, `/api/voice` returns an actionable 503 while text chat and the backend remain available. Malformed URLs, configured URLs without an adequate secret, and invalid credential lifetimes are startup errors. `VOICE_ALLOW_STUN_ONLY=true` explicitly permits a degraded STUN-only deployment for testing; it does not meet the cross-network production requirement. Local emulator development can continue without TURN. To exercise the real relay with emulator accounts, put the real `TURN_URLS` and `TURN_SECRET` in the backend `.env` and restart `npm run dev:server`; the browser must access a trusted HTTPS origin when it is on another device. Never expose the Firebase emulators publicly to do this.

## Checks before opening a playtest

1. Check DNS from outside the VM, then inspect logs for startup, certificate, bind, and authentication errors. Confirm ports are listening and mapped with `sudo docker compose ps` and `sudo ss -lntup`. A TCP port opening alone does not prove a TURN allocation or audio works.
2. From another network, verify the certificate and both TLS routes:

   ```sh
   openssl s_client -connect turn.example.com:443 -servername turn.example.com \
     -verify_hostname turn.example.com -verify_return_error </dev/null
   openssl s_client -connect turn.example.com:5349 -servername turn.example.com \
     -verify_hostname turn.example.com -verify_return_error </dev/null
   ```

3. Sign in and join a room. In browser developer tools, check the `/api/voice?roomId=...` request succeeds with authentication and `Cache-Control: no-store`. The response contains `iceServers`, `serverTime`, `expiresAt` (epoch milliseconds, or null without TURN), and `relayConfigured`; it must never contain `TURN_SECRET`. An unauthenticated request must return 401; a signed-in account without connected membership in the requested room must receive 403. Do not copy bearer tokens or returned passwords into reports.
4. Open `chrome://webrtc-internals` (or Firefox `about:webrtc`) **before** joining voice. Inspect the selected candidate pair and incoming/outgoing audio byte counters. A `relay` candidate and rising counters establish relay use; `host`/`srflx` success alone does not test TURN. Record the candidate's URL/relay transport where the browser exposes it, without credentials or private addresses.
5. To prove each path independently, use a staging backend and temporarily advertise only one TURN URL at a time. UDP and ordinary TCP tests can use a nonproduction backend configuration; a production backend requires the full set. On the restrictive test network block outbound UDP and outbound TCP except 443, and keep the app's HTTPS/WSS backend reachable over 443. Confirm a relay candidate using `turns:...:443?transport=tcp` is selected and two-way speech works. Keep the relay VM's UDP relay range open; restrict the **test clients**, not the relay. Restore the full URL set afterward.

## Real-device acceptance record

Use two physical devices with separate accounts and real microphones, on genuinely separate access networks (disable Wi-Fi on the mobile device when using cellular). An isolated pair of browser profiles, fake microphones, a shared Wi-Fi network, or a browser's mobile viewport does not establish this result. Test at least one school/office network or a controlled client firewall that blocks UDP and non-443 TCP.

| Scenario | Required observation | Result / device and network / date |
| --- | --- | --- |
| Home broadband ↔ cellular | Two-way speech; selected pair and increasing audio byte counts | Not run on external devices in this workspace |
| Home ↔ school/office | Two-way speech; note whether direct, UDP relay, TCP relay, or TLS relay | Not run on external devices in this workspace |
| UDP + non-443 TCP blocked at client | TLS 443 relay selected; two-way speech | Not run on external devices in this workspace |
| Network drop / Wi-Fi ↔ cellular | Automatic voice recovery after connectivity returns; text remains usable while voice retries | Not run on external devices in this workspace |
| Relay credential refresh | On staging use TTL 120 seconds; keep call active through refresh, then drop/recover after old expiry | Not run on external devices in this workspace |
| Mute / unmute during recovery | Muted audio stays muted; unmute restores speech | Not run on external devices in this workspace |
| Leave Voice / rejoin, each seat | Mic stops after leaving; partner waits; both can rejoin and hear each other | Not run on external devices in this workspace |
| Room reconnect / refresh | Within the 30-second seat grace, room rejoins and voice can resume/rejoin without stale signaling | Not run on external devices in this workspace |
| Relay unavailable / all voice paths blocked | Useful retry/error status; text chat continues; retry works after restoration | Not run on external devices in this workspace |

Record browser/OS versions, selected candidate types/transport, approximate recovery time, and whether each player heard actual speech. Automated browser regression tests cover local behavior; they do not replace these external network and real microphone checks. No production relay provisioning, real certificate handshake, or separate-network call is claimed until this record is filled in against a running service.

## Restrictions TURN cannot bypass

TURN over TLS on 443 helps when a firewall permits outbound TLS on that port, directly or through a CONNECT proxy supported by the browser's WebRTC stack. It is still TURN, not HTTPS. Networks may block non-HTTP TLS through application inspection, use HTTPS-only or authenticated proxies that refuse TURN/CONNECT tunnels or require authentication the WebRTC stack cannot satisfy, deny the TURN hostname/IP, intercept TLS with an incompatible certificate policy, or block WebRTC entirely. Captive portals, denied microphone permissions, OS/browser background suspension, and a complete connection loss also prevent voice. The app cannot override those policies. Use an administrator-approved network, another connection such as cellular, or text chat. TCP/TLS relay can also add delay or stuttering on lossy networks.

Implementation references: [coturn image and ports](https://github.com/coturn/coturn/blob/4.18.0/docker/coturn/README.md), [coturn configuration options](https://github.com/coturn/coturn/blob/4.18.0/examples/etc/turnserver.conf), and [Docker Compose secrets](https://docs.docker.com/compose/how-tos/use-secrets/).
