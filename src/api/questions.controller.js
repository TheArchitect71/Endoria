import QuestionsDAO from "../dao/questionsDAO"
import { User } from "./users.controller"

export default class QuestionsController {
  static async apiGetQuestions(req, res, next) {
    const QUESTIONS_PER_PAGE = 20
    const {
      questionsList,
      totalNumQuestions,
    } = await QuestionsDAO.getQuestions()
    let response = {
      questions: questionsList,
      page: 0,
      filters: {},
      entries_per_page: QUESTIONS_PER_PAGE,
      total_results: totalNumQuestions,
    }
    res.json(response)
  }

  static async apiGetQuestionsByJourney(req, res, next) {
    let pageSize = parseInt(req.query.pageSize, 10)
    let lastId = req.query.lastId
    console.log(`The type of lastId is`, typeof lastId)

    let journeys = Array.isArray(req.query.journeys)
      ? req.query.journeys
      : Array(req.query.journeys)

    const { questionsList, last_id } = await QuestionsDAO.getQuestionsByJourney(
      journeys,
      lastId,
      pageSize,
    )

    let response = {
      titles: questionsList,
      // first_id: first_id,
      last_id: last_id,
      entries_per_page: pageSize,
    }
    res.json(response)
  }

  static async apiGetQuestionById(req, res, next) {
    try {
      const userJwt = req.get("Authorization").slice("Bearer ".length)
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
      return this.apiSearchQuestions(req, res, next)
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
