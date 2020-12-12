import UsersDAO from "../dao/usersDAO"
import AnswersDAO from "../dao/answersDAO"
import QuestionsDAO from "../dao/questionsDAO"
import { User } from "./users.controller"
import { ObjectId } from "bson"

export default class AnswersController {
  static async apiPostAnswer(req, res, next) {
    try {
      const userJwt = req.get("Authorization").slice("Bearer ".length)
      const user = await User.decoded(userJwt)
      var { error } = user
      if (error) {
        res.status(401).json({ error })
        return
      }

      const questionId = req.body.question_id
      const answer = req.body.answer
      const date = new Date()

      const answerResponse = await AnswersDAO.addAnswer(
        ObjectId(questionId),
        user,
        answer,
        date,
      )

      const updatedAnswers = await QuestionsDAO.getQuestionByID(questionId)

      res.json({ status: "success", answers: updatedAnswers.answers })
    } catch (e) {
      res.status(500).json({ e })
    }
  }

  static async apiUpdateAnswer(req, res, next) {
    try {
      const userJwt = req.get("Authorization").slice("Bearer ".length)
      const user = await User.decoded(userJwt)
      var { error } = user
      if (error) {
        res.status(401).json({ error })
        return
      }

      const answerId = req.body.answer_id
      const text = req.body.updated_answer
      const date = new Date()

      const answerResponse = await AnswersDAO.updateAnswer(
        ObjectId(answerId),
        user.email,
        text,
        date,
      )

      var { error } = answerResponse
      if (error) {
        res.status(400).json({ error })
      }

      if (answerResponse.modifiedCount === 0) {
        throw new Error(
          "unable to update answer - user may not be original poster",
        )
      }

      const questionId = req.body.question_id
      const updatedAnswers = await QuestionsDAO.getQuestionByID(questionId)

      res.json({ answers: updatedAnswers.answers })
    } catch (e) {
      res.status(500).json({ e })
    }
  }

  static async apiDeleteAnswer(req, res, next) {
    try {
      const userJwt = req.get("Authorization").slice("Bearer ".length)
      const user = await User.decoded(userJwt)
      var { error } = user
      if (error) {
        res.status(401).json({ error })
        return
      }

      const answerId = req.body.answer_id
      const userEmail = user.email
      console.log(user.email)
      console.log(answerId)
      const answerResponse = await AnswersDAO.deleteAnswer(
        ObjectId(answerId),
        userEmail,
      )

      const questionId = req.body.question_id

      const { answers } = await QuestionsDAO.getQuestionByID(questionId)
      res.json({ answers })
    } catch (e) {
      res.status(500).json({ e })
    }
  }

  static async apiAnswerReport(req, res, next) {
    try {
      const userJwt = req.get("Authorization").slice("Bearer ".length)
      const user = await User.decoded(userJwt)
      var { error } = user
      if (error) {
        res.status(401).json({ error })
        return
      }

      if (UsersDAO.checkAdmin(user.email)) {
        const report = await AnswersDAO.mostActiveAnswerers()
        res.json({ report })
        return
      }

      res.status(401).json({ status: "fail" })
    } catch (e) {
      res.status(500).json({ e })
    }
  }
}
