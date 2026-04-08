import pLimit from 'p-limit';
import {exec, spawn} from "node:child_process";
import {resolve} from "path";
import {mkdir} from "node:fs/promises";


const limit = pLimit(10);

export async function getMovDate(pathLoc){
  return limit(()=>new Promise((resolve, reject) => {
    exec(`ffprobe -v quiet -print_format json -show_format -show_streams "${pathLoc}"`, (err, stdout) => {
      if (err){return reject(err);}
      resolve(new Date(JSON.parse(stdout).format.tags.creation_time));
    });
  }));
}

export async function convertMov({fileObj, date}){
  const directoryPath = resolve("out", `y${date.getFullYear()}`, `m${date.getMonth().toString().padStart(2, "0")}`, `d${date.getDate().toString().padStart(2, "0")}`);
  const createDirectory = await mkdir(directoryPath, {recursive: true});
  return limit(()=>new Promise(async (resolveProm, reject) => {
    const ff = spawn("ffmpeg", [
      "-y",
      "-loglevel", "quiet",
      "-i", resolve(fileObj.parentPath, fileObj.name),
      resolve(directoryPath, fileObj.name.slice(0, -1 * ".mov".length).concat(".mp4"))
    ]);
    ff.on("exit", (code) => {
      if (code === 0){resolveProm();}
      else{reject(new Error(`FFmpeg failed with code ${code}`))}
    });
  }));
}