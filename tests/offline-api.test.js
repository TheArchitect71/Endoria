import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {ObjectId} from 'mongodb';
import {start} from '../src/index.js';
import {offlineUri} from '../src/offline-config.js';
process.env.MFLIX_NS=`endoria_migration_test_${process.pid}`;
process.env.MFLIX_DB_URI='mongodb://127.0.0.1:27018/?replicaSet=offline-rs';
process.env.SECRET_KEY='isolated-migration-test-secret';
process.env.NODE_ENV='prod';
let runtime,url,db;
const ids=Array.from({length:7},()=>new ObjectId());
before(async()=>{
 runtime=await start(0);url=`http://127.0.0.1:${runtime.server.address().port}`;db=runtime.client.db(process.env.MFLIX_NS);
 await db.collection('questions').insertMany(ids.map((_id,i)=>({_id,title:`Question ${i}`,journeys:[i%2?'alpha':'beta']})));
 await db.collection('users').createIndex({email:1},{unique:true});
});
after(async()=>{if(runtime){await new Promise(r=>runtime.server.close(r));await db.dropDatabase();await runtime.client.close();}});
async function request(path,method='GET',body,token){const response=await fetch(url+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,data:await response.json()};}
test('remote MongoDB URI is rejected before connecting',()=>{assert.throws(()=>offlineUri('mongodb+srv://example.mongodb.net'),/Offline MongoDB/);assert.throws(()=>offlineUri('mongodb://example.com:27017'),/Offline MongoDB/);assert.equal(offlineUri('mongodb://localhost:27018'),'mongodb://localhost:27018');});
test('cursor pagination preserves order, filters, metadata and validation',async()=>{
 let cursor='',seen=[];do{const {status,data}=await request(`/api/v1/questions?pageSize=3&lastId=${cursor}`);assert.equal(status,200);assert.equal(data.total_results,7);seen.push(...data.questions.map(q=>q._id));cursor=data.next_cursor;}while(cursor);assert.deepEqual(seen,ids.map(String));
 const result=await request('/api/v1/questions/journeys?journeys=alpha&pageSize=2');assert.equal(result.data.total_results,3);assert(result.data.titles.every(q=>q.journeys.includes('alpha')));
 for(const query of ['pageSize=0','pageSize=101','lastId=bad','pageSize=1&pageSize=2'])assert.equal((await request('/api/v1/questions?'+query)).status,400);
 assert.equal((await request('/api/v1/questions/journeys')).status,400);
});
test('offline user lifecycle and answer ownership work on current driver',async()=>{
 const account={name:'Migration User',email:'migration@example.test',password:'migration-password'};
 const registration=await request('/api/v1/user/register','POST',account);assert.equal(registration.status,200);assert(registration.data.auth_token);
 assert.equal((await request('/api/v1/user/register','POST',account)).status,400);
 assert.equal((await request('/api/v1/user/login','POST',{email:account.email,password:'wrong'})).status,401);
 const login=await request('/api/v1/user/login','POST',account);assert.equal(login.status,200);let token=login.data.auth_token;assert(await db.collection('sessions').findOne({email:account.email}));
 assert.equal((await request('/api/v1/questions/id/'+ids[0])).status,401);
 assert.equal((await request('/api/v1/questions/id/bad','GET',null,token)).status,404);
 const prefs=await request('/api/v1/user/update-preferences','PUT',{preferences:{theme:'dark'}},token);assert.equal(prefs.status,200);assert.equal(prefs.data.info.preferences.theme,'dark');token=prefs.data.auth_token;
 assert.equal((await request('/api/v1/user/answer-report','GET',null,token)).status,401);
 const answer=await request('/api/v1/questions/answer','POST',{question_id:String(ids[0]),answer:'Local answer'},token);assert.equal(answer.status,200);assert.equal(answer.data.answers[0].answer,'Local answer');const answerId=answer.data.answers[0]._id;
 const edited=await request('/api/v1/questions/answer','PUT',{question_id:String(ids[0]),answer_id:answerId,updated_answer:'Edited answer'},token);assert.equal(edited.status,200);assert.equal(edited.data.answers[0].answer,'Edited answer');
 const other=await request('/api/v1/user/register','POST',{...account,email:'other@example.test'});await request('/api/v1/questions/answer','DELETE',{question_id:String(ids[0]),answer_id:answerId},other.data.auth_token);assert(await db.collection('answers').findOne({_id:new ObjectId(answerId)}));
 const deleted=await request('/api/v1/questions/answer','DELETE',{question_id:String(ids[0]),answer_id:answerId},token);assert.equal(deleted.status,200);assert.deepEqual(deleted.data.answers,[]);assert.equal(await db.collection('answers').countDocuments(),0);
 assert.equal((await request('/api/v1/user/logout','POST',{},token)).status,200);assert.equal(await db.collection('sessions').countDocuments(),0);
 assert.equal((await request('/api/v1/user/delete','DELETE',{password:account.password},token)).status,200);assert.equal(await db.collection('users').countDocuments({email:account.email}),0);
});
test('configuration uses public driver options and unknown routes return JSON404',async()=>{const c=await request('/api/v1/questions/config-options');assert.equal(c.status,200);assert.equal(c.data.pool_size,50);assert.equal(c.data.wtimeout,2500);assert.equal((await request('/missing')).status,404);});
