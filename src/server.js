import express from "express"
import path from "node:path"
import { fileURLToPath } from "node:url"
import cors from "cors"
import morgan from "morgan"
import questions from "../src/api/questions.route.js"
import users from "../src/api/users.route.js"

const app = express()
app.set("query parser", "extended")

app.use(cors())
process.env.NODE_ENV !== "prod" && app.use(morgan("dev"))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Register api routes
app.use("/api/v1/questions", questions)
app.use("/api/v1/user", users)
app.use("/status", express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), "../build")))
app.use("/", express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), "../build")))
app.use( (req, res) => res.status(404).json({ error: "not found" }))

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  res.status(error.status || 500).json({error: error.status === 400 ? "Invalid request" : "Internal server error"});
});
export default app
