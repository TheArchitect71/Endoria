import app from './server.js';
import { MongoClient } from 'mongodb';
import { offlineUri } from './offline-config.js';
import QuestionsDAO from './dao/questionsDAO.js';
import UsersDAO from './dao/usersDAO.js';
import AnswersDAO from './dao/answersDAO.js';
export async function start(port = Number(process.env.PORT || 8000)) {
  if (!process.env.SECRET_KEY) throw new Error('SECRET_KEY is required; use the local environment file');
  const client = new MongoClient(offlineUri(), {maxPoolSize:50,writeConcern:{w:'majority',wtimeoutMS:2500},serverSelectionTimeoutMS:5000});
  try {
    await client.connect();
    await Promise.all([QuestionsDAO.injectDB(client), UsersDAO.injectDB(client), AnswersDAO.injectDB(client)]);
    const server = app.listen(port, '127.0.0.1');
    await new Promise((resolve,reject) => {server.once('listening',resolve);server.once('error',reject);});
    console.log(`Endoria listening at http://127.0.0.1:${server.address().port}`);
    return {server,client};
  } catch(error) { await client.close();throw error; }
}
