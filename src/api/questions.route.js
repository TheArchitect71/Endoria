import { Router } from "express"
import QuestionsCtrl from "./questions.controller"
import CommentsCtrl from "./comments.controller"

const router = new Router()

// associate put, delete, and get(id)
router.route("/").get(QuestionsCtrl.apiGetQuestions)
router.route("/search").get(QuestionsCtrl.apiSearchQuestions)
router.route("/countries").get(QuestionsCtrl.apiGetQuestionsByCountry)
router.route("/facet-search").get(QuestionsCtrl.apiFacetedSearch)
router.route("/id/:id").get(QuestionsCtrl.apiGetMovieById)
router.route("/config-options").get(QuestionsCtrl.getConfig)

router
  .route("/comment")
  .post(CommentsCtrl.apiPostComment)
  .put(CommentsCtrl.apiUpdateComment)
  .delete(CommentsCtrl.apiDeleteComment)

export default router
