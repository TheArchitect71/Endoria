import QuestionsDAO from "../dao/questionsDAO.js"
import { User } from "./users.controller.js"

function invalidPagination(message) {
  const error = new Error(message)
  error.code = "INVALID_PAGINATION_INPUT"
  return error
}

function paginationOptions(query) {
  const rawSize = query.pageSize
  const pageSize = rawSize === undefined ? 20 : Number(rawSize)
  if (
    (rawSize !== undefined &&
      (typeof rawSize !== "string" || !/^\d+$/.test(rawSize))) ||
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 100
  ) {
    throw invalidPagination("pageSize must be an integer between 1 and 100")
  }
  const lastId = query.lastId === undefined ? "" : query.lastId
  if (
    typeof lastId !== "string" ||
    (lastId && !/^[a-fA-F0-9]{24}$/.test(lastId))
  ) {
    throw invalidPagination(
      "lastId must be a 24-character hexadecimal ObjectId",
    )
  }
  return { pageSize, lastId }
}

function paginationError(res, error) {
  if (error.code === "INVALID_PAGINATION_INPUT")
    return res.status(400).json({ error: error.message })
  console.error(`Unable to retrieve question page: ${error}`)
  return res.status(500).json({ error: "Unable to retrieve questions" })
}

export default class QuestionsController {
  static async apiGetQuestions(req, res, next) {
    try {
      const options = paginationOptions(req.query)
      const {
        questionsList,
        totalNumQuestions,
        last_id,
        has_more,
      } = await QuestionsDAO.getQuestionPage(options)
      res.json({
        questions: questionsList,
        page: 0,
        filters: {},
        entries_per_page: options.pageSize,
        total_results: totalNumQuestions,
        last_id,
        next_cursor: has_more ? last_id : null,
        has_more,
      })
    } catch (error) {
      paginationError(res, error)
    }
  }

  static async apiGetQuestionsByJourney(req, res, next) {
    try {
      const options = paginationOptions(req.query)
      const journeys = Array.isArray(req.query.journeys)
        ? req.query.journeys
        : [req.query.journeys]
      if (
        !journeys.length ||
        journeys.some(journey => typeof journey !== "string" || !journey.trim())
      ) {
        throw invalidPagination(
          "journeys must contain at least one nonempty journey name",
        )
      }
      const {
        questionsList,
        totalNumQuestions,
        last_id,
        has_more,
      } = await QuestionsDAO.getQuestionsByJourney(
        journeys,
        options.lastId,
        options.pageSize,
      )
      res.json({
        titles: questionsList,
        last_id,
        entries_per_page: options.pageSize,
        total_results: totalNumQuestions,
        next_cursor: has_more ? last_id : null,
        has_more,
      })
    } catch (error) {
      paginationError(res, error)
    }
  }

  static async apiGetQuestionById(req, res, next) {
    try {
      const userJwt = (req.get("Authorization") || "").replace(/^Bearer /, "")
      const user = await User.decoded(userJwt)
      var { error } = user
      if (error) {
        res.status(401).json({ error })
        return
      }

      let id = req.params.id || {}
      let userId = user.email
      let question = await QuestionsDAO.getQuestionByID(id, userId)
      if (!question) {
        res.status(404).json({ error: "Not found" })
        return
      }
      let updated_type = question.lastupdated instanceof Date ? "Date" : "other"
      res.json({ question, updated_type })
    } catch (e) {
      console.log(`api, ${e}`)
      res.status(500).json({ error: e })
    }
  }

  static async apiSearchQuestions(req, res, next) {
    const QUESTIONS_PER_PAGE = 20
    let page
    try {
      page = req.query.page ? parseInt(req.query.page, 10) : 0
    } catch (e) {
      console.error(`Got bad value for page:, ${e}`)
      page = 0
    }
    let searchType
    try {
      searchType = Object.keys(req.query)[0]
    } catch (e) {
      console.error(`No search keys specified: ${e}`)
    }

    let filters = {}

    switch (searchType) {
      case "genre":
        filters.genre = req.query.genre
        break
      case "cast":
        filters.cast = req.query.cast
        break
      case "text":
        filters.text = req.query.text
        break
      default:
      // nothing to do
    }

    const {
      questionsList,
      totalNumQuestions,
    } = await QuestionsDAO.getQuestions({
      filters,
      page,
      QUESTIONS_PER_PAGE,
    })

    let response = {
      questions: questionsList,
      page: page,
      filters,
      entries_per_page: QUESTIONS_PER_PAGE,
      total_results: totalNumQuestions,
    }

    res.json(response)
  }

  static async apiFacetedSearch(req, res, next) {
    const QUESTIONS_PER_PAGE = 20

    let page
    try {
      page = req.query.page ? parseInt(req.query.page, 10) : 0
    } catch (e) {
      console.error(`Got bad value for page, defaulting to 0: ${e}`)
      page = 0
    }

    if (!req.query.cast) {
      return QuestionsController.apiSearchQuestions(req, res, next)
    }

    const filters = { cast: req.query.cast }

    const facetedSearchResult = await QuestionsDAO.facetedSearch({
      filters,
      page,
      QUESTIONS_PER_PAGE,
    })

    let response = {
      questions: facetedSearchResult.questions,
      facets: {
        runtime: facetedSearchResult.runtime,
        rating: facetedSearchResult.rating,
      },
      page: page,
      filters,
      entries_per_page: QUESTIONS_PER_PAGE,
      total_results: facetedSearchResult.count,
    }

    res.json(response)
  }

  static async getConfig(req, res, next) {
    const {
      poolSize,
      wtimeout,
      authInfo,
    } = await QuestionsDAO.getConfiguration()
    try {
      let response = {
        pool_size: poolSize,
        wtimeout,
        ...authInfo,
      }
      res.json(response)
    } catch (e) {
      res.status(500).json({ error: e })
    }
  }
}
