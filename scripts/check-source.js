import { readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
function check(dir) { for(const entry of readdirSync(dir,{withFileTypes:true})) { const p=`${dir}/${entry.name}`;if(entry.isDirectory())check(p);else if(p.endsWith('.js'))execFileSync(process.execPath,['--check',p],{stdio:'inherit'}); } }
check('src');check('scripts');console.log('Source syntax checks passed');
