# The Half Girlfriend Contract 1.0

A Next.js experience for a voluntary friendship and mentorship agreement. It includes separate signing tokens, server-side validation and timestamps, a local SQLite database, an audit trail, and draft/final PDF downloads.

The introduction is a pinned, eight-scene story. Scrolling scrubs the 12-second MP4 in both directions; if video is unavailable, a generated poster and animated scene text remain available. `falling-leaves` adds a low-density, reduced-motion-aware petal accent. To regenerate the local media, install Python with Pillow and NumPy plus FFmpeg, then run `python scripts/generate_cinematic.py`.

## Run locally

1. Install Node.js 20.9+ and the platform build tools required by `better-sqlite3` if a prebuilt package is unavailable.
2. Run `npm install` and `npm run dev`.
3. Copy `.env.example` to `.env.local`. Set `ADMIN_PASSWORD` for the `/admin` Mentor sign-in; if it is empty, `/admin` falls back to `PARTY_A_TOKEN`. Keep either value private and restart the server after changing it. Set `INVITATION_ADMIN_TOKEN` to a long random value if using the legacy invite endpoint, and set `APP_URL` to the public HTTPS origin in production. `AGREEMENT_ID` is optional: if omitted, the app generates an ID once and persists it in SQLite. `SQLITE_PATH` defaults to `data/agreement.sqlite3`.
4. Use the owner-only invitation panel to create separate links. Copy Party A's link only to Party A and Party B's link only to Party B. Each link has a unique random token; only its SHA-256 hash is stored. The token is carried in the URL fragment and is not sent in HTTP requests. Keep the owner token and signing links private.

The SQLite schema in [`sqlite/schema.sql`](sqlite/schema.sql) is initialized automatically on the first request. The signing and withdrawal operations run inside immediate SQLite transactions, preventing duplicate or concurrent actions from producing an inconsistent status. The API derives the party role from the invitation token, validates the name, drawn signature and consent, and assigns the timestamp on the server. Public status reads omit signature images; a valid personal token is required to read both images after execution.

SQLite is a good fit for local development and a single server instance with a persistent disk. Do not use an ephemeral serverless filesystem or multiple app instances sharing an ordinary local file. For those deployments, use a managed SQLite-compatible database such as a hosted libSQL/Turso service, or another shared database. Use HTTPS in production. Before collecting real signatures, add token hashing/rotation, per-IP rate limiting, production monitoring and a documented token delivery process.

PDFs are generated in the browser from persisted agreement data. A draft is watermarked while signatures are pending; the final download requires two saved signatures and uses their saved images and server timestamps. This is a playful, non-legal agreement, not a legally enforceable romantic or obedience contract.
