import { ObjectId } from "bson"

let questions
let mflix
const DEFAULT_SORT = [["tomatoes.viewer.numReviews", -1]]

export default class QuestionsDAO {
  static async injectDB(conn) {
    if (questions) {
      return
    }
    try {
      mflix = await conn.db(process.env.MFLIX_NS)
      questions = await conn.db(process.env.MFLIX_NS).collection("questions")
      this.questions = questions // this is only for testing
    } catch (e) {
      console.error(
        `Unable to establish a collection handle in questionsDAO: ${e}`,
      )
    }
  }

  /**
   * Retrieves the connection pool size, write concern and user roles on the
   * current client.
   * @returns {Promise<ConfigurationResult>} An object with configuration details.
   */
  static async getConfiguration() {
    const roleInfo = await mflix.command({ connectionStatus: 1 })
    const authInfo = roleInfo.authInfo.authenticatedUserRoles[0]
    const { poolSize, wtimeout } = questions.s.db.serverConfig.s.options
    let response = {
      poolSize,
      wtimeout,
      authInfo,
    }
    return response
  }

  /**
   * Finds and returns questions originating from one or more journeys.
   * Returns a list of objects, each object contains a title and an _id.
   * @param {string[]} journeys - The list of journeys.
   * @returns {Promise<JourneyResult>} A promise that will resolve to a list of JourneyResults.
   */
  static async getQuestionsByJourney(journeys) {
    /**
    Ticket: Projection

    Write a query that matches questions with the journeys in the "journeys"
    list, but only returns the title and _id of each question.

    Remember that in MongoDB, the $in operator can be used with a list to
    match one or more values of a specific field.
    */

    let cursor
    try {
      // TODO Ticket: Projection
      // Find questions matching the "journeys" list, but only return the title
      // and _id. Do not put a limit in your own implementation, the limit
      // here is only included to avoid sending 46000 documents down the
      // wire.
      cursor = await questions.find(
        { journeys: { $in: journeys } },
        { projection: { _id: 1, title: 1 } },
      )
    } catch (e) {
      console.error(`Unable to issue find command, ${e}`)
      return []
    }

    return cursor.toArray()
  }

  /**
   * Finds and returns questions matching a given text in their title or description.
   * @param {string} text - The text to match with.
   * @returns {QueryParams} The QueryParams for text search
   */
  static textSearchQuery(text) {
    const query = { $text: { $search: text } }
    const meta_score = { $meta: "textScore" }
    const sort = [["score", meta_score]]
    const project = { score: meta_score }

    return { query, project, sort }
  }

  /**
   * Finds and returns questions including one or more cast members.
   * @param {string[]} cast - The cast members to match with.
   * @returns {QueryParams} The QueryParams for cast search
   */
  static castSearchQuery(cast) {
    const searchCast = Array.isArray(cast) ? cast : cast.split(", ")

    const query = { cast: { $in: searchCast } }
    const project = {}
    const sort = DEFAULT_SORT

    return { query, project, sort }
  }

  /**
   * Finds and returns questions matching a one or more genres.
   * @param {string[]} genre - The genres to match with.
   * @returns {QueryParams} The QueryParams for genre search
   */
  static genreSearchQuery(genre) {
    /**
    Ticket: Text and Subfield Search

    Given an array of one or more genres, construct a query that searches
    MongoDB for questions with that genre.
    */

    const searchGenre = Array.isArray(genre) ? genre : genre.split(", ")

    // TODO Ticket: Text and Subfield Search
    // Construct a query that will search for the chosen genre.
    const query = {}
    const project = {}
    const sort = DEFAULT_SORT

    return { query, project, sort }
  }

  /**
   *
   * @param {Object} filters - The search parameter to use in the query. Comes
   * in the form of `{cast: { $in: [...castMembers]}}`
   * @param {number} page - The page of questions to retrieve.
   * @param {number} questionsPerPage - The number of questions to display per page.
   * @returns {FacetedSearchReturn} FacetedSearchReturn
   */
  static async facetedSearch({
    filters = null,
    page = 0,
    questionsPerPage = 20,
  } = {}) {
    if (!filters || !filters.cast) {
      throw new Error("Must specify cast members to filter by.")
    }
    const matchStage = { $match: filters }
    const sortStage = { $sort: { "tomatoes.viewer.rating": -1 } }
    const countingPipeline = [matchStage, sortStage, { $count: "count" }]
    const skipStage = { $skip: questionsPerPage * page }
    const limitStage = { $limit: questionsPerPage }
    const facetStage = {
      $facet: {
        runtime: [
          {
            $bucket: {
              groupBy: "$runtime",
              boundaries: [0, 60, 90, 120, 180],
              default: "other",
              output: {
                count: { $sum: 1 },
              },
            },
          },
        ],
        rating: [
          {
            $bucket: {
              groupBy: "$metacritic",
              boundaries: [0, 50, 70, 90, 100],
              default: "other",
              output: {
                count: { $sum: 1 },
              },
            },
          },
        ],
        questions: [
          {
            $addFields: {
              title: "$title",
            },
          },
        ],
      },
    }

    /**
    Ticket: Faceted Search

    Please append the skipStage, limitStage, and facetStage to the queryPipeline
    (in that order). You can accomplish this by adding the stages directly to
    the queryPipeline.

    The queryPipeline is a Javascript array, so you can use push() or concat()
    to complete this task, but you might have to do something about `const`.
    */

    const queryPipeline = [
      matchStage,
      sortStage,
      // TODO Ticket: Faceted Search
      // Add the stages to queryPipeline in the correct order.
    ]

    try {
      const results = await (await questions.aggregate(queryPipeline)).next()
      const count = await (await questions.aggregate(countingPipeline)).next()
      return {
        ...results,
        ...count,
      }
    } catch (e) {
      return { error: "Results too large, be more restrictive in filter" }
    }
  }

  /**
   * Finds and returns questions by journey.
   * Returns a list of objects, each object contains a title and an _id.
   * @param {Object} filters - The search parameters to use in the query.
   * @param {number} page - The page of questions to retrieve.
   * @param {number} questionsPerPage - The number of questions to display per page.
   * @returns {GetQuestionsResult} An object with question results and total results
   * that would match this query
   */
  static async getQuestions({
    // here's where the default parameters are set for the getQuestions method
    filters = null,
    page = 0,
    questionsPerPage = 20,
  } = {}) {
    let queryParams = {}
    if (filters) {
      if ("text" in filters) {
        queryParams = this.textSearchQuery(filters["text"])
      } else if ("cast" in filters) {
        queryParams = this.castSearchQuery(filters["cast"])
      } else if ("genre" in filters) {
        queryParams = this.genreSearchQuery(filters["genre"])
      }
    }

    let { query = {}, project = {}, sort = DEFAULT_SORT } = queryParams
    let cursor
    try {
      cursor = await questions
        .find(query)
        .project(project)
        .sort(sort)
    } catch (e) {
      console.error(`Unable to issue find command, ${e}`)
      return { questionsList: [], totalNumQuestions: 0 }
    }

    /**
    Ticket: Paging

    Before this method returns back to the API, use the "questionsPerPage" and
    "page" arguments to decide the questions to display.

    Paging can be implemented by using the skip() and limit() cursor methods.
    */

    // TODO Ticket: Paging
    // Use the cursor to only return the questions that belong on the current page
    const displayCursor = cursor
      .skip(questionsPerPage * page)
      .limit(questionsPerPage)

    try {
      const questionsList = await displayCursor.toArray()
      const totalNumQuestions =
        page === 0 ? await questions.countDocuments(query) : 0

      return { questionsList, totalNumQuestions }
    } catch (e) {
      console.error(
        `Unable to convert cursor to array or problem counting documents, ${e}`,
      )
      return { questionsList: [], totalNumQuestions: 0 }
    }
  }

  /**
   * Gets a question by its id
   * @param {string} id - The desired question id, the _id in Mongo
   * @returns {MflixQuestion | null} Returns either a single question or nothing
   */
  static async getQuestionByID(id) {
    try {
      /**
      Ticket: Get Answers

      Given a question ID, build an Aggregation Pipeline to retrieve the questions
      matching that question's ID.

      The $match stage is already completed. You will need to add a $lookup
      stage that searches the `questions` collection for the correct questions.
      */

      // TODO Ticket: Get Answers
      // Implement the required pipeline.
      const pipeline = [
        {
          // find the current question in the "questions" collection
          $match: {
            _id: ObjectId(id),
          },
        },
        {
          // lookup answers from the "answers" collection
          $lookup: {
            from: "answers",
            let: { id: "$_id" },
            pipeline: [
              {
                // only join answers with a match question_id
                $match: {
                  $expr: {
                    $eq: ["$question_id", "$$id"],
                  },
                },
              },
              {
                // sort by date in descending order
                $sort: {
                  date: -1,
                },
              },
            ],
            // call embedded field answers
            as: "answers",
          },
        },
      ]
      return await questions.aggregate(pipeline).next()
    } catch (e) {
      /**
      Ticket: Error Handling

      Handle the error that occurs when an invalid ID is passed to this method.
      When this specific error is thrown, the method should return `null`.
      */

      // TODO Ticket: Error Handling
      // Catch the InvalidId error by string matching, and then handle it.
      console.error(`Something went wrong in getQuestionByID: ${e}`)
      throw e
    }
  }
}

/**
 * This is a parsed query, sort, and project bundle.
 * @typedef QueryParams
 * @property {Object} query - The specified query, transformed accordingly
 * @property {any[]} sort - The specified sort
 * @property {Object} project - The specified project, if any
 */

/**
 * Represents a single journey result
 * @typedef JourneyResult
 * @property {string} ObjectID - The ObjectID of the question
 * @property {string} title - The title of the question
 */

/**
 * A Question from mflix
 * @typedef MflixQuestion
 * @property {string} _id
 * @property {string} title
 * @property {number} year
 * @property {number} runtime
 * @property {Date} released
 * @property {string[]} cast
 * @property {number} metacriticd
 * @property {string} poster
 * @property {string} plot
 * @property {string} fullplot
 * @property {string|Date} lastupdated
 * @property {string} type
 * @property {string[]} languages
 * @property {string[]} directors
 * @property {string[]} writers
 * @property {IMDB} imdb
 * @property {string[]} journeys
 * @property {string[]} rated
 * @property {string[]} genres
 * @property {string[]} questions
 */

/**
 * IMDB subdocument
 * @typedef IMDB
 * @property {number} rating
 * @property {number} votes
 * @property {number} id
 */

/**
 * Result set for getQuestions method
 * @typedef GetQuestionsResult
 * @property {MflixQuestions[]} questionsList
 * @property {number} totalNumResults
 */

/**
 * Faceted Search Return
 *
 * The type of return from faceted search. It will be a single document with
 * 3 fields: rating, runtime, and questions.
 * @typedef FacetedSearchReturn
 * @property {object} rating
 * @property {object} runtime
 * @property {MFlixQuestion[]}questions
 */
