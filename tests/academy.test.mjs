import test from 'node:test';
import assert from 'node:assert/strict';
import {sudokuAdapter} from '../dist/academy-adapter.js';
import {bootAcademy} from '../dist/academy-client.js';

test('selected Sudoku hero survives cloud restore, siblings stay separate, and only new puzzles earn XP',async()=>{
 const sibling={id:'sibling',name:'Sibling',completed:['last'],xp:20};
 let d={activeProfileId:'local',profiles:[{id:'local',name:'Hero',completed:['first'],xp:20},sibling]};
 const levels=[{id:'first'},{id:'last'}],adapter=sudokuAdapter({getData:()=>d,levels,makeProfile:name=>({id:'new',name,completed:[],xp:0}),validProfile:p=>typeof p.name==='string'&&Array.isArray(p.completed),validRun:()=>false,persist(){},refresh(){}});
 const store=new Map(),credits=[];let revision=0,online=true,cloud;
 const platform={crypto,location:{href:'https://sudoku.heroacademy.app/#academy_launch=private'},history:{replaceState(a,b,url){assert(!url.includes('private'));platform.location.href='https://sudoku.heroacademy.app'+url;}},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},confirm:()=>true,setInterval:()=>0,clearInterval(){},addEventListener(){},removeEventListener(){},fetch:async(url,o)=>{
  assert(!platform.location.href.includes('private'));assert.equal(o.credentials,'omit');if(!online)throw Error('offline');const b=o.body?JSON.parse(o.body):{};
  if(url.endsWith('/exchange'))return Response.json({game_id:'sudokuquest',token:'a'.repeat(64),hero:{id:'cloud',name:'Hero'},save:null});
  if(url.endsWith('/save')){cloud=b.state;return Response.json({revision:++revision});}
  if(url.endsWith('/events')){credits.push(b.milestone);return Response.json({hero:{xp:20},gameXP:20});}
  return Response.json({game_id:'sudokuquest',hero:{id:'cloud'},gameXP:20});
 }};
 const client=await bootAcademy(adapter,platform);assert.deepEqual(credits,[]);assert.equal(cloud.id,'local');
 d.profiles[0].completed.push('last');await client.flush();await client.flush();assert.deepEqual(credits,['1']);
 online=false;d.profiles[0].xp=40;await client.flush();assert.equal(d.profiles[0].xp,40);
 adapter.restore({id:'foreign',name:'Cloud',avatar:'<img src=x onerror=alert(1)>',completed:['last'],xp:20,run:{bad:true}});assert.equal(d.activeProfileId,'local');assert.equal(d.profiles[0].id,'local');assert.equal(d.profiles[0].run,null);assert.equal(d.profiles[0].avatar,'🦊');assert.deepEqual(d.profiles[1],sibling);
 assert.deepEqual(adapter.milestones(),[1]);assert(!adapter.select('missing'));assert.equal(adapter.create({name:'New'}),'new');assert.equal(d.profiles.length,3);client.stop();
});
