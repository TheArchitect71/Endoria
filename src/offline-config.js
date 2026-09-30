export function offlineUri(value = process.env.MFLIX_DB_URI || 'mongodb://127.0.0.1:27018/?replicaSet=offline-rs') {
  const uri = new URL(value);
  if (uri.protocol !== 'mongodb:' || !['127.0.0.1','localhost'].includes(uri.hostname)) {
    throw new Error('Offline MongoDB requires a single localhost mongodb:// address');
  }
  return value;
}
export function namespace() { return process.env.MFLIX_NS || 'endoria'; }
