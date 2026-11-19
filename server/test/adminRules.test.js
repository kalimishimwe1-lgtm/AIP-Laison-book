import test from 'node:test';
import assert from 'node:assert/strict';
import {checkUserChange,checkUserDelete,genPassword,cleanSettings,like,csvCell,page} from '../src/adminRules.js';

const admin={id:1,role:'admin',status:'active'},teacher={id:2,role:'teacher',status:'pending'};
test('admin cannot disable or demote themselves',()=>{
  assert.match(checkUserChange({actorId:1,target:admin,changes:{status:'disabled'},activeAdmins:3}),/own account/);
  assert.match(checkUserChange({actorId:1,target:admin,changes:{role:'teacher'},activeAdmins:3}),/own administrator/);
});
test('the last active admin is protected',()=>{
  assert.match(checkUserChange({actorId:9,target:admin,changes:{role:'teacher'},activeAdmins:1}),/At least one/);
  assert.equal(checkUserChange({actorId:9,target:admin,changes:{role:'teacher'},activeAdmins:2}),null);
});
test('ordinary changes are allowed',()=>{
  assert.equal(checkUserChange({actorId:1,target:teacher,changes:{status:'active'},activeAdmins:1}),null);
  assert.equal(checkUserChange({actorId:1,target:teacher,changes:{name:'X'},activeAdmins:1}),null);
});
test('delete rules',()=>{
  assert.match(checkUserDelete({actorId:1,target:admin,activeAdmins:5}),/own account/);
  assert.match(checkUserDelete({actorId:2,target:admin,activeAdmins:1}),/At least one/);
  assert.equal(checkUserDelete({actorId:1,target:teacher,activeAdmins:1}),null);
});
test('generated passwords are 12 chars, no look-alikes, and differ',()=>{
  const a=genPassword(),b=genPassword();
  assert.equal(a.length,12);assert.match(a,/^[A-HJ-NP-Za-km-z2-9]+$/);assert.notEqual(a,b);
});
test('settings are validated',()=>{
  assert.deepEqual(cleanSettings({maintenance:true,announcement:'  Hello   world '}).values,{maintenance:'1',announcement:'Hello world'});
  assert.deepEqual(cleanSettings({registration_open:'0',junk:'x'}).values,{registration_open:'0'});
  assert.ok(cleanSettings({maintenance:'yes'}).error);
  assert.ok(cleanSettings({announcement:'x'.repeat(301)}).error);
});
test('search terms and csv cells are made safe',()=>{
  assert.equal(like('50%_a'),'%50\\%\\_a%');
  assert.equal(csvCell('=SUM(A1)'),"'=SUM(A1)");
  assert.equal(csvCell('a,"b"'),'"a,""b"""');
  assert.equal(csvCell(null),'');
});
test('paging',()=>{
  assert.deepEqual(page('3',25),{limit:25,offset:50,page:3});
  assert.deepEqual(page('-4',25),{limit:25,offset:0,page:1});
  assert.deepEqual(page(undefined,10),{limit:10,offset:0,page:1});
});
