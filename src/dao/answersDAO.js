import { ObjectId } from "bson"

let answers

export default class AnswersDAO {
  static async injectDB(conn) {
    if (answers) {
      return
    }
    try {
      answers = await conn.db(process.env.MFLIX_NS).collection("answers")
    } catch (e) {
      console.error(`Unable to establish collection handles in userDAO: ${e}`)
    }
  }

  /**
  Ticket: Create/Update Answers

  For this ticket, you will need to implement the following two methods:

  - addAnswer
  - updateAnswer

  You can find these methods below this docstring. Make sure to read the answers
  to better understand the task.
  */

  /**
   * Inserts a answer into the `answers` collection, with the following fields:

     - "name", the name of the user posting the answer
     - "email", the email of the user posting the answer
     - "question_id", the _id of the question pertaining to the answer
     - "text", the text of the answer
     - "date", the date when the answer was posted

   * @param {string} questionId - The _id of the question in the `questions` collection.
   * @param {Object} user - An object containing the user's name and email.
   * @param {string} answer - The text of the answer.
   * @param {string} date - The date on which the answer was posted.
   * @returns {DAOResponse} Returns an object with either DB response or "error"
   */
  static async addAnswer(questionId, user, answer, date) {
    try {
      // TODO Ticket: Create/Update Answers
      // Construct the answer document to be inserted into MongoDB.
      const answerDoc = {
        questionId: questionId,
        user: user,
        answer: answer,
        date: date,
      }

      return await answers.insertOne(answerDoc)
    } catch (e) {
      console.error(`Unable to post answer: ${e}`)
      return { error: e }
    }
  }

  /**
   * Updates the answer in the answer collection. Queries for the answer
   * based by both answer _id field as well as the email field to doubly ensure
   * the user has permission to edit this answer.
   * @param {string} answerId - The _id of the answer to update.
   * @param {string} userEmail - The email of the user who owns the answer.
   * @param {string} text - The updated text of the answer.
   * @param {string} date - The date on which the answer was updated.
   * @returns {DAOResponse} Returns an object with either DB response or "error"
   */
  static async updateAnswer(answerId, userEmail, text, date) {
    try {
      // TODO Ticket: Create/Update Answers
      // Use the answerId and userEmail to select the proper answer, then
      // update the "text" and "date" fields of the selected answer.
      const updateResponse = await answers.updateOne(
        { _id: answerId, user: userEmail },
        { $set: { answer: text, date: date } },
      )

      return updateResponse
    } catch (e) {
      console.error(`Unable to update answer: ${e}`)
      return { error: e }
    }
  }

  static async deleteAnswer(answerId, userEmail) {
    /**
    Ticket: Delete Answers

    Implement the deleteOne() call in this method.

    Ensure the delete operation is limited so only the user can delete their own
    answers, but not anyone else's answers.
    */

    try {
      // TODO Ticket: Delete Answers
      // Use the userEmail and answerId to delete the proper answer.
      const deleteResponse = await answers.deleteOne({
        _id: ObjectId(answerId),
        user: userEmail,
      })

      return deleteResponse
    } catch (e) {
      console.error(`Unable to delete answer: ${e}`)
      return { error: e }
    }
  }

  static async mostActiveAnswerers() {
    /**
    Ticket: User Report

    Build a pipeline that returns the 20 most frequent answerers on the MFlix
    site. You can do this by counting the number of occurrences of a user's
    email in the `answers` collection.
    */
    try {
      // TODO Ticket: User Report
      // Return the 20 users who have answered the most on MFlix.
      const groupStage = { $group: { _id: "$email", count: { $sum: 1 } } }
      const sortStage = { $sort: { count: -1 } }
      const limitStage = { $limit: 20 }
      const pipeline = [groupStage, sortStage, limitStage]

      // TODO Ticket: User Report
      // Use a more durable Read Concern here to make sure this data is not stale.
      const readConcern = { level: "majority" }

      const aggregateResult = await answers.aggregate(pipeline, {
        readConcern,
      })

      return await aggregateResult.toArray()
    } catch (e) {
      console.error(`Unable to retrieve most active answerers: ${e}`)
      return { error: e }
    }
  }
}

/**
 * Success/Error return object
 * @typedef DAOResponse
 * @property {boolean} [success] - Success
 * @property {string} [error] - Error
 */
