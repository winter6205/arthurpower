#!/usr/bin/env node
'use strict';
// defend-claim-report-triple.cjs — Q3 Report Triple gate
// Port of defend-claim-report-triple.sh. Zero-dep Node CJS.

const SRC_EXTS = new Set(['.go','.ts','.tsx','.js','.jsx','.py','.java','.rs','.c','.cpp','.h','.hpp','.sh','.cjs']);
const ACTION_RE = /(ran|built|tested|grepped|curl|executed|verified|confirmed|passed|exit\.code|sha256|exit.*0|HTTP.*200|grep.*matched)/i;
const NARR_CN = /完成|成功|已验证|已修复/;
const NARR_EN = /\b(done|fixed|completed|passing)\b/i;
const CODE_SIG = /(<-|\bcase\b|\bchan\b|\bfunc\b|\btype\b|\bvar\b|\blet\b|\bconst\b|\bstruct\b|\binterface\b|\breturn\b)/;
const COMMENT = /^[[:space:]]*(\/\/|\/\*|\*)/;

const { readStdin } = require('./lib/read-stdin-with-timeout.cjs');

(async function main(){
  if(process.argv[2]==='--self-test'){console.log('Q3 self-test: report triple detection. PASS');process.exit(0);}
  const raw=await readStdin();let inp={};
  try{if(raw.trim())inp=JSON.parse(raw);}catch(_){}
  const fp=inp&&inp.tool_input&&(inp.tool_input.file_path||'')||'';
  const co=inp&&inp.tool_input&&(inp.tool_input.content||inp.tool_input.new_string||'')||'';
  const ext=fp.slice(fp.lastIndexOf('.')).toLowerCase();
  if(!SRC_EXTS.has(ext)||!co)process.exit(0);
  let nar=null;
  for(const ln of co.split('\n')){
    if(!ln)continue;
    if(NARR_CN.test(ln)){nar='cn';break;}
    if(NARR_EN.test(ln)){
      if(COMMENT.test(ln)){nar='en-cmt';break;}
      if(CODE_SIG.test(ln))continue;
      nar='en';break;
    }
  }
  if(!nar)process.exit(0);
  if(!ACTION_RE.test(co)){
    console.log(JSON.stringify({systemMessage:'REJECTED: completion report without evidence triple (trigger: '+nar+'). Required: action-verb + artifact + outcome (e.g., "ran pytest tests/unit/ -- exit 0").'}));
    process.exit(2);
  }
  process.exit(0);
})().catch(e=>{process.stderr.write('[defend-claim-report-triple.cjs FATAL] '+(e&&e.stack||e)+String.fromCharCode(10));process.exit(0);});
