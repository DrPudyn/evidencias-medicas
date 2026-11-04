import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
const directory=await mkdtemp(path.join(os.tmpdir(),"em-verify-"));
console.log("Isolated validation database:", directory);
const child=spawn(process.execPath,["scripts/smoke-ci.mjs"],{stdio:"inherit",env:{...process.env,SMOKE_INIT_DB:"true",SMOKE_DB_DIR:directory}});
child.on("error",error=>{console.error(error);process.exitCode=1;});
child.on("exit",code=>{process.exitCode=code??1;});
