import { start } from './src/index.js';
try {
  const {server,client} = await start();
  const stop = () => server.close(async()=>{await client.close();process.exit(0);});
  process.once('SIGINT',stop);process.once('SIGTERM',stop);
} catch(error) { console.error(error.message); process.exitCode=1; }
