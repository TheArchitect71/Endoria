// Read-only checks against the user's foreground API and its MongoDB data.
import assert from "node:assert"
import { MongoClient } from "mongodb"
import { offlineUri, namespace as offlineNamespace } from "../src/offline-config.js"

const base = process.env.ENDORIA_API_URL || "http://127.0.0.1:8000"

async function request(route, query = {}) {
  const url = new URL(`/api/v1/questions${route}`, base)
  for (const [key, value] of Object.entries(query)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      url.searchParams.append(key, item)
    }
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) })
  return { status: response.status, body: await response.json() }
}

async function walk(collection, journeys, pageSize) {
  const route = journeys ? "/journeys" : ""
  const filter = journeys ? { journeys: { $in: journeys } } : {}
  const expected = (
    await collection
      .find(filter)
      .sort({ _id: 1 })
      .toArray()
  ).map(question => question._id.toString())
  const seen = []
  const sizes = []
  let cursor = ""
  for (let page = 0; page <= expected.length; page++) {
    const query = { pageSize, lastId: cursor }
    if (journeys) query.journeys = journeys
    const { status, body } = await request(route, query)
    assert.strictEqual(status, 200)
    const documents = journeys ? body.titles : body.questions
    assert(Array.isArray(documents))
    assert(documents.length <= pageSize)
    assert.strictEqual(body.entries_per_page, pageSize)
    assert.strictEqual(body.total_results, expected.length)
    const ids = documents.map(question => question._id)
    assert.deepStrictEqual(
      ids,
      expected.slice(seen.length, seen.length + pageSize),
    )
    seen.push(...ids)
    sizes.push(ids.length)
    assert.strictEqual(body.last_id, ids.length ? ids[ids.length - 1] : null)
    assert.strictEqual(body.has_more, seen.length < expected.length)
    assert.strictEqual(body.next_cursor, body.has_more ? body.last_id : null)
    // Retrying a page must produce identical data and pagination metadata.
    assert.deepStrictEqual((await request(route, query)).body, body)
    if (!body.has_more) break
    assert(ids.length > 0)
    assert.notStrictEqual(body.next_cursor, cursor)
    cursor = body.next_cursor
  }
  assert.deepStrictEqual(seen, expected)
  assert.strictEqual(new Set(seen).size, seen.length)
  console.log(
    `PASS ${journeys ? journeys.join("+") : "all"}: ${
      seen.length
    } unique IDs; pages ${sizes.join(",")}`,
  )
}

async function main() {
  const client = await MongoClient.connect(offlineUri(), {
    serverSelectionTimeoutMS: 5000,
  })
  try {
    const database = client.db(offlineNamespace())
    const collection = database.collection("questions")
    const journeys = await collection.distinct("journeys")
    await walk(collection, null, 20)
    await walk(collection, null, 100)
    for (const journey of journeys) await walk(collection, [journey], 20)
    if (journeys.length) {
      await walk(collection, [journeys[0]], 1)
      const count = await collection.countDocuments({ journeys: journeys[0] })
      if (count > 0 && count <= 100)
        await walk(collection, [journeys[0]], count)
      await walk(collection, journeys.slice(0, 2), 7)
      await walk(collection, [journeys[0], journeys[0]], 20)
    }
    await walk(collection, ["__pagination_check_unknown_journey__"], 20)

    for (const route of ["", "/journeys"]) {
      const filter = route ? { journeys: journeys[0] || "unknown" } : {}
      const defaults = await request(route, filter)
      assert.strictEqual(defaults.status, 200)
      assert.strictEqual(defaults.body.entries_per_page, 20)
      for (const pageSize of ["0", "-1", "101", "1.5", "abc", "", ["1", "2"]]) {
        assert.strictEqual(
          (await request(route, { ...filter, pageSize })).status,
          400,
        )
      }
      for (const lastId of [
        "bad",
        "abcdefghijkl",
        "f".repeat(23),
        "z".repeat(24),
        ["0".repeat(24), "f".repeat(24)],
      ]) {
        assert.strictEqual(
          (await request(route, { ...filter, lastId })).status,
          400,
        )
      }
      const empty = await request(route, { ...filter, lastId: "f".repeat(24) })
      assert.strictEqual(empty.status, 200)
      assert.deepStrictEqual(
        route ? empty.body.titles : empty.body.questions,
        [],
      )
      assert.strictEqual(empty.body.has_more, false)
      assert.strictEqual(empty.body.last_id, null)
      assert.strictEqual(empty.body.next_cursor, null)
      const first = await request(route, { ...filter, lastId: "0".repeat(24) })
      assert.deepStrictEqual(first.body, defaults.body)
    }
    assert.strictEqual((await request("/journeys")).status, 400)
    assert.strictEqual(
      (await request("/journeys", { journeys: "" })).status,
      400,
    )
    const build = await database.admin().command({ buildInfo: 1 })
    console.log(
      `PASS defaults, bounds, invalid/nonexistent cursors, empty results, retries; MongoDB ${
        build.version
      }, driver ${"7.7.0"}`,
    )
  } finally {
    await client.close()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
