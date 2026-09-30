import fs from "node:fs"
import path from "node:path"
import { MongoClient, ObjectId } from "mongodb"
import { offlineUri, namespace as offlineNamespace } from "../src/offline-config.js"

const source = path.resolve(process.argv[2] || ".local-data/questions.json")
const uri = offlineUri()
const namespace = offlineNamespace()


if (!namespace) throw new Error("MFLIX_NS is required")

const questions = JSON.parse(fs.readFileSync(source, "utf8"))
if (!Array.isArray(questions)) throw new Error("Question export must be a JSON array")

const operations = questions.map((question, index) => {
  const id = question && question._id && question._id.$oid
  if (!ObjectId.isValid(id) || !question.title || !question.journeys) {
    throw new Error(`Question ${index + 1} needs a MongoDB ObjectId, title, and journeys`)
  }
  const document = { ...question, _id: new ObjectId(id) }
  return {
    replaceOne: {
      filter: { _id: document._id },
      replacement: document,
      upsert: true,
    },
  }
})

async function connectWhenReady() {
  const deadline = Date.now() + 30000
  while (true) {
    try {
      return await MongoClient.connect(uri, {
                serverSelectionTimeoutMS: 1000,
      })
    } catch (error) {
      if (Date.now() >= deadline) throw error
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
}

async function main() {
  const client = await connectWhenReady()
  try {
    const database = client.db(namespace)
    if (operations.length) await database.collection("questions").bulkWrite(operations, { ordered: false })
    await database.collection("questions").createIndex({ journeys: 1, _id: 1 })
    await database.collection("users").createIndex({ email: 1 }, { unique: true })
    await database.collection("answers").createIndex({ question_id: 1, email: 1 })
    console.log(`Imported ${operations.length} questions into local MongoDB database ${namespace}`)
  } finally {
    await client.close()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
