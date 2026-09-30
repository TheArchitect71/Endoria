# Endoria

Express 5.2.1 backend with MongoDB driver 7.7.0. The migration preserved the existing local question database. A fresh clone starts with no application data; no private database is bundled. No Atlas account or network is required.

## Run

Use Node 26.10.0 (`.nvmrc`) and MongoDB Community 9.0.2. From this repository:

```sh
npm ci
npm run setup:local
mkdir -p .local/mongodb
mongod --dbpath .local/mongodb --bind_ip 127.0.0.1 --port 27018 --replSet offline-rs
```

Leave MongoDB in that foreground terminal. In a second terminal run `npm run db:init` and `npm start`. Skip the MongoDB launch if the matching `offline-rs` already runs on 27018. Setup generates a private secret without overwriting existing `.env.local`; database initialization creates no application records.

API: http://127.0.0.1:8000/api/v1/questions. Stop foreground processes with Ctrl+C. `.env.local` selects the local `endoria` database and contains a private JWT secret. The previous `.env` is preserved and is not loaded by startup. Local URI validation rejects remote endpoints before connecting. Existing passwords/data are unchanged; the new signing secret requires logging in again.

The Angular frontend is the sibling `../Andoria`. Clone [Andoria](https://github.com/TheArchitect71/Andoria) beside this repository. This repository had no bundled `build` frontend.

## Checks

```sh
npm run check
npm test
npm run check:pagination
```

`npm test` uses a uniquely named isolated local database, then drops that test database. It tests authentication, preferences, question cursors and answer ownership. `check:pagination` is read-only against the running application: it verifies the configured database IDs, journeys, cursor boundaries/retries, and page sizes without changing user records.

The old `test/` files are retained as learning references. They import missing MoviesDAO/CommentsDAO files and require a separate MFlix dataset; they are not a valid regression suite for the question application. The new runnable suite is in `tests/`.

## Migration notes

Native Node ES modules replace obsolete Babel startup. Current MongoDB options use `maxPoolSize`, `writeConcern`, and `serverSelectionTimeoutMS`; IDs use `new ObjectId`. Express native parsers and current catchall handling preserve the existing routes. User cursor-pagination and journey cache API contracts remain intact. Source snapshots include the user's untracked scripts/docs before this migration.

Official references: [MongoDB driver upgrades](https://www.mongodb.com/docs/drivers/node/current/reference/upgrade/), [Express 5 migration](https://expressjs.com/en/guide/migrating-5/).
