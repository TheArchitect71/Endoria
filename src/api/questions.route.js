import { Router } from "express"
import QuestionsCtrl from "./questions.controller"
import AnswersCtrl from "./answers.controller"

const router = new Router()

// associate put, delete, and get(id)
router.route("/").get(QuestionsCtrl.apiGetQuestions)
router.route("/search").get(QuestionsCtrl.apiSearchQuestions)
router.route("/journeys").get(QuestionsCtrl.apiGetQuestionsByJourney)
router.route("/facet-search").get(QuestionsCtrl.apiFacetedSearch)
router.route("/id/:id").get(QuestionsCtrl.apiGetQuestionById)
router.route("/config-options").get(QuestionsCtrl.getConfig)

router
  .route("/answer")
  .post(AnswersCtrl.apiPostAnswer)
  .put(AnswersCtrl.apiUpdateAnswer)
  .delete(AnswersCtrl.apiDeleteAnswer)

export default router
