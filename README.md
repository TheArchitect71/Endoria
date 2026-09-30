# Endoria — reflection API

The backend for [Andoria](https://github.com/TheArchitect71/Andoria), a guided journaling and self-reflection app. Express and the MongoDB driver provide account authentication, preferences, journey questions, cursor pagination, and ownership checks for saved answers. This repository has no frontend; run Andoria separately.

## Run locally

Prerequisites: the Node version in `.nvmrc` (currently 26.10.0), npm, and MongoDB Community 9.0.2. From the repository root:

```sh
npm ci
npm run setup:local
```

Start MongoDB in a foreground terminal:

```sh
mkdir -p .local/mongodb
mongod --dbpath .local/mongodb --bind_ip 127.0.0.1 --port 27018 --replSet offline-rs
```

If that local replica set already runs on port 27018, reuse it rather than starting a second instance. In another terminal at the repository root:

```sh
npm run db:init
npm start
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000). Keep both processes in the foreground and stop them with **Ctrl+C**. Setup creates a private, ignored `.env.local` without overwriting an existing file. Database initialization creates no application records. These defaults use local MongoDB; no Atlas account is required.

## Data and frontend

The questions API is `/api/v1/questions`. A fresh database has no question dataset. To import your own question export, run `npm run import:questions -- /path/to/questions.json`. It expects a JSON array with `_id.$oid`, `title`, and `journeys` for each question, and replaces or inserts matching question IDs. The default input path is `.local-data/questions.json`. Private user data and databases are not bundled. Clone Andoria beside this repository and follow its README.

## Development

```sh
npm run check
npm test
```

Tests use an isolated local MongoDB database and remove it afterwards. With the app running, `npm run check:pagination` performs read-only pagination checks. Old course exercises in `test/` are references; the runnable application suite is in `tests/`.
