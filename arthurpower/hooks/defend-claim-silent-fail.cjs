#!/usr/bin/env node
'use strict';
// defend-claim-silent-fail.cjs — Q5 Code-Shape Lint (silent failure)
// Port of defend-claim-silent-fail.sh. Zero-dep Node CJS.
const fs=require('node:fs');const SRC_EXTS=new Set(['.py','.ts','.tsx','.js','.jsx','.go','.java','.rs']);const { readStdin } = require('./lib/read-stdin-with-timeout.cjs');
(async()=>{const raw=await readStdin();let inp={};try{if(raw.trim())inp=JSON.parse(raw)}catch(_){}
const fp=inp&&inp.tool_input&&(inp.tool_input.file_path||'')||'';if(!fp){process.exit(0)}
const ext=fp.slice(fp.lastIndexOf('.')).toLowerCase();if(!SRC_EXTS.has(ext))process.exit(0)
let c=inp&&inp.tool_input&&(inp.tool_input.content||'')||'';if(!c&&fp){try{c=fs.readFileSync(fp,'utf8')}catch(_){}}
if(!c)process.exit(0);const lines=c.split('\n')
for(const ln of lines){
if(/except\s*:\s*pass/.test(ln)){console.log(JSON.stringify({systemMessage:'[defend-claim Q5] REJECTED: empty except:pass detected. Require typed exception + logging per S3. Consider: except SpecificError as e: logger.error(e); raise'}));process.exit(2)}
if(/catch\s*\{\s*\}/.test(ln)){console.log(JSON.stringify({systemMessage:'[defend-claim Q5] REJECTED: empty catch {} detected. Require error handling: log, rethrow, or convert to typed error per S3.'}));process.exit(2)}
if(/=>\s*null\s*;/.test(ln)){console.log(JSON.stringify({systemMessage:'[defend-claim Q5] WARNING: silent null return detected. Consider returning Optional/default or throwing typed exception per S3.'}));process.exit(0)}
}
process.exit(0)})().catch(e=>{process.stderr.write('[defend-claim-silent-fail.cjs FATAL] '+(e&&e.stack||e)+String.fromCharCode(10));process.exit(0)})
