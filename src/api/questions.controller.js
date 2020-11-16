import QuestionsDAO from "../dao/questionsDAO"

export default class QuestionsController {
  static async apiGetQuestions(req, res, next) {
    const MOVIES_PER_PAGE = 20
    const {
      questionsList,
      totalNumQuestions,
    } = await QuestionsDAO.getQuestions()
    let response = {
      questions: questionsList,
      page: 0,
      filters: {},
      entries_per_page: MOVIES_PER_PAGE,
      total_results: totalNumQuestions,
    }
    res.json(response)
  }

  static async apiGetQuestionsByCountry(req, res, next) {
    let countries = Array.isArray(req.query.countries)
      ? req.query.countries
      : Array(req.query.countries)
    let questionsList = await QuestionsDAO.getQuestionsByCountry(countries)
    let response = {
      titles: questionsList,
    }
    res.json(response)
  }

  static async apiGetMovieById(req, res, next) {
    try {
      let id = req.params.id || {}
      let movie = await QuestionsDAO.getMovieByID(id)
      if (!movie) {
        res.status(404).json({ error: "Not found" })
        return
      }
      let updated_type = movie.lastupdated instanceof Date ? "Date" : "other"
      res.json({ movie, updated_type })
    } catch (e) {
      console.log(`api, ${e}`)
      res.status(500).json({ error: e })
    }
  }

  static async apiSearchQuestions(req, res, next) {
    const MOVIES_PER_PAGE = 20
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
      MOVIES_PER_PAGE,
    })

    let response = {
      questions: questionsList,
      page: page,
      filters,
      entries_per_page: MOVIES_PER_PAGE,
      total_results: totalNumQuestions,
    }

    res.json(response)
  }

  static async apiFacetedSearch(req, res, next) {
    const MOVIES_PER_PAGE = 20

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
      MOVIES_PER_PAGE,
    })

    let response = {
      questions: facetedSearchResult.questions,
      facets: {
        runtime: facetedSearchResult.runtime,
        rating: facetedSearchResult.rating,
      },
      page: page,
      filters,
      entries_per_page: MOVIES_PER_PAGE,
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
