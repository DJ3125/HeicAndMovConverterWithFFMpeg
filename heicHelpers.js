import {readFile, writeFile, mkdir} from "node:fs/promises";
import {resolve, extname} from "path";
import {Worker} from "node:worker_threads";

const heicQueue = [];
let currentID = 0;
const numThreads = 10;
const heicThreads = [];
const availableThreads = [];

initialize();

function initialize(){
  for(let i = 0; i < numThreads; i++){
    availableThreads.push(i);
    heicThreads.push(new Worker("./heicThread.js", {workerData: {id: i}}));
  }
}

export async function terminateHeicProcessing(){
  for(const i of heicThreads){i.terminate();}
  heicThreads.splice(0, heicThreads.length);
  availableThreads.splice(0, availableThreads.length);
  for(const i of heicQueue){i.reject("Heic Threads were terminated");}
  heicQueue.splice(0, heicQueue.length);
}

export async function convertHeicOrFile({fileObj, date}){
  const directoryPath = resolve("out", `y${date.getFullYear()}`, `m${date.getMonth().toString().padStart(2, "0")}`, `d${date.getDate().toString().padStart(2, "0")}`);
  const createDirectory = mkdir(directoryPath, {recursive: true});
  const inputBuffer = await readFile(resolve(fileObj.parentPath, fileObj.name));
  const isHeic = extname(fileObj.name) === ".heic";
  const outBuffer = isHeic ? waitForThreadForHeic(inputBuffer) : inputBuffer;
  await createDirectory;
  const newName = isHeic ? fileObj.name.slice(0, ".heic".length * -1).concat(".png") : fileObj.name;
  await writeFile(resolve(directoryPath, newName), await outBuffer);
}

async function waitForThreadForHeic(buffer){
  const promise = new Promise((resolve, reject)=>{
    heicQueue.push({buffer, resolve, reject});  
  });
  runThreadProcessing();
  return promise;
}

async function runThreadProcessing(){
  if(heicQueue.length === 0){return;}
  if(availableThreads.length === 0){return;}
  const thread = heicThreads[availableThreads.pop()];
  const heicID = currentID++;
  const obj = heicQueue.pop();
  thread.postMessage({heicID, buffer: obj.buffer});
  thread.on("message", ({bufferCompleted, completedID, threadNum, error, readyForNext})=>{
    if(completedID !== heicID){return;}
    if(!error){obj.resolve(bufferCompleted);}
    else{obj.reject(err);}
    if(!readyForNext){return;}
    availableThreads.push(threadNum);
    runThreadProcessing();
  });
}