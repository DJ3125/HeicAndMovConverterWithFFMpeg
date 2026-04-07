import convert from "heic-convert";
import {parentPort, workerData} from "node:worker_threads";

const threadID = workerData.id;
const queue = [];

parentPort.onmessage = ({data: message})=>{
  queue.push(message);
  processBuffer();
};

async function processBuffer(){
  if(queue.length === 0){return;}
  const obj = queue.pop();
  const outputBuffer = await convert({
    buffer: obj.buffer, // the HEIC file buffer
    format: 'PNG'        // output format
  });
  parentPort.postMessage({bufferCompleted: outputBuffer, completedID: obj.heicID, threadNum: threadID, error: null, readyForNext: queue.length === 0});
  processBuffer();
}
