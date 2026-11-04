import "./sites-env.mjs";
import { access, cp, mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Stop the local Worker first: copying an active SQLite/WAL directory is not an atomic backup.
export async function backupLocalState(stateDirectory=path.resolve(".wrangler/state"),outputDirectory=path.resolve(".sites-runtime/backups")) {
  await access(stateDirectory);
  const files=await readdir(stateDirectory,{recursive:true});
  if(!files.some(file=>file.endsWith(".sqlite")))throw new Error("No local SQLite database found. Nothing copied.");
  await mkdir(outputDirectory,{recursive:true});
  const output=path.join(outputDirectory,`state-${new Date().toISOString().replace(/[:.]/g,"-")}-${crypto.randomUUID().slice(0,8)}`);
  await cp(stateDirectory,output,{recursive:true,errorOnExist:true,force:false});
  await writeFile(path.join(output,"BACKUP-INFO.json"),JSON.stringify({createdAt:new Date().toISOString(),source:path.resolve(stateDirectory),note:"Restore only with the local Worker stopped. Contains private account data."},null,2),{flag:"wx"});
  return output;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)console.log("Local state backup:",await backupLocalState());
