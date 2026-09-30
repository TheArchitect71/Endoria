# Backend Samples Endoria checkout

This duplicate checkout uses the same preserved offline Endoria database. It retains its existing Express backend and question/auth/answer APIs, including the validated pagination fixes from the main checkout. Default port8001 avoids the main checkout's8000. Original lesson tests remain as references; active integration tests are in tests/. No frontend source existed in this sample.

# Endoria

Express 5.2.1 backend with MongoDB driver 7.7.0. The existing database has 310 questions, 2 answers and 1 user; it is preserved in local MongoDB 9.0.2 on port 27018. No Atlas account or network is required.

## Run

Use Node 26.10.0 (`.nvmrc`). Start `../../.dependency-migration/start-mongodb.sh` in another terminal, then:

```sh
npm ci
npm start
```

API: http://127.0.0.1:8001/api/v1/questions. Stop foreground processes with Ctrl+C. `.env.local` selects the local `endoria` database and contains a private JWT secret. The previous `.env` is preserved and is not loaded by startup. Local URI validation rejects remote endpoints before connecting. Existing passwords/data are unchanged; the new signing secret requires logging in again.

The Angular frontend is the main workspace frontend `../../Andoria`. Its migration is tracked in the mission checkpoint. This repository had no bundled `build` frontend.

## Checks

```sh
npm run check
npm test
npm run check:pagination
```

`npm test` uses a uniquely named isolated local database, then drops that test database. It tests authentication, preferences, question cursors and answer ownership. `check:pagination` is read-only against the running application: it verifies all 310 IDs, journeys, cursor boundaries/retries, and page sizes without changing user records.

The old `test/` files are retained as learning references. They import missing MoviesDAO/CommentsDAO files and require a separate MFlix dataset; they are not a valid regression suite for the question application. The new runnable suite is in `tests/`.

## Migration notes

Native Node ES modules replace obsolete Babel startup. Current MongoDB options use `maxPoolSize`, `writeConcern`, and `serverSelectionTimeoutMS`; IDs use `new ObjectId`. Express native parsers and current catchall handling preserve the existing routes. User cursor-pagination and journey cache API contracts remain intact. Source snapshots include the user's untracked scripts/docs before this migration.

Official references: [MongoDB driver upgrades](https://www.mongodb.com/docs/drivers/node/current/reference/upgrade/), [Express 5 migration](https://expressjs.com/en/guide/migrating-5/).
