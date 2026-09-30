const {MongoClient} = require('mongodb');
async function initialize(){
 const client=new MongoClient('mongodb://127.0.0.1:27018/?directConnection=true',{serverSelectionTimeoutMS:1000});
 try{
  for(let n=0;;n++){try{await client.connect();break}catch(e){if(n>=30)throw e;await new Promise(r=>setTimeout(r,1000));}}
  const admin=client.db('admin');
  try{const status=await admin.command({replSetGetStatus:1});if(status.set!=='offline-rs')throw new Error('Existing replica set is not offline-rs; refusing to change it');}
  catch(e){if(e.code!==94)throw e;await admin.command({replSetInitiate:{_id:'offline-rs',members:[{_id:0,host:'127.0.0.1:27018'}]}});}
  for(let n=0;;n++){if((await admin.command({hello:1})).isWritablePrimary)break;if(n>=30)throw new Error('Replica set did not become primary');await new Promise(r=>setTimeout(r,1000));}
  console.log('Local offline-rs primary ready; no application records created');
 }finally{await client.close();}
}
initialize().catch(e=>{console.error(e.message);process.exitCode=1;});
