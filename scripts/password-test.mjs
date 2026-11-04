import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs";
import ts from "typescript";
const source=fs.readFileSync(new URL("../lib/password.ts",import.meta.url),"utf8");
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {hashPassword,verifyPassword,validPassword}=await import("data:text/javascript;base64,"+Buffer.from(code).toString("base64"));
test("password boundaries and spaces",()=>{assert.equal(validPassword("short"),false);assert.equal(validPassword("x".repeat(129)),false);assert.equal(validPassword("A long pass phrase"),true);});
test("salted hashes verify, reject incorrect passwords and malformed records",async()=>{
 const password="A long test pass phrase";
 const first=await hashPassword(password),second=await hashPassword(password);
 assert.notEqual(first,second);assert.ok(!first.includes(password));
 assert.equal(await verifyPassword(password,first),true);
 assert.equal(await verifyPassword(password+"!",first),false);
 assert.equal(await verifyPassword(password,null),false);
 assert.equal(await verifyPassword(password,"scrypt-v1$malformed"),false);
});
