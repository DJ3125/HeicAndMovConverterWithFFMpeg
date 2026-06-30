import {readFile, writeFile, mkdir} from "node:fs/promises";
import {resolve, extname} from "path";
import {Worker} from "node:worker_threads";

const heicQueue = [];
const processingMap = new Map();
let currentID = 0;
const numThreads = 10;
const heicThreads = [];
const availableThreads = [];

initialize();

function initialize(){
  for(let i = 0; i < numThreads; i++){
    availableThreads.push(i);
    const worker = new Worker("./heicThread.js", {workerData: {id: i}});
    worker.on("message", ({bufferCompleted, completedID, threadNum, error, readyForNext})=>{
      const obj = processingMap.get(completedID);
      if(!obj){return;}
      processingMap.delete(completedID);
      if(!error){obj.resolve(bufferCompleted);}
      else{obj.reject(error);}
      if(!readyForNext){return;}
      availableThreads.push(threadNum);
      runThreadProcessing();
    });
    heicThreads.push(worker);
  }
}

export async function terminateHeicProcessing(){
  for(const i of heicThreads){i.terminate();}
  heicThreads.splice(0, heicThreads.length);
  availableThreads.splice(0, availableThreads.length);
  for(const [_, i] of processingMap){i.reject("Heic Threads were terminated");}
  heicQueue.splice(0, heicQueue.length);
  processingMap.clear();
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
    const heicID = currentID++;
    processingMap.set(heicID, {buffer, resolve, reject});
    heicQueue.push(heicID);  
  });
  runThreadProcessing();
  return promise;
}

async function runThreadProcessing(){
  if(heicQueue.length === 0){return;}
  if(availableThreads.length === 0){return;}
  const thread = heicThreads[availableThreads.pop()];
  const heicID = heicQueue.pop();
  const obj = processingMap.get(heicID);
  thread.postMessage({heicID, buffer: obj.buffer}, [obj.buffer.buffer]);
  obj.buffer = null;
}