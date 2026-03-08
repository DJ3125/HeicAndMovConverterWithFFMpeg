import {readFile, writeFile} from "node:fs/promises";
import convert from "heic-convert";
import process from "process";

const dataLoc = process.argv[2];

async function convertHeic(fileLocIn, fileLocOut){
  const inputBuffer = await readFile(fileLocIn);
  const outputBuffer = await convert({
    buffer: inputBuffer, // the HEIC file buffer
    format: 'PNG'        // output format
  });

  await writeFile(fileLocOut, outputBuffer);
}

async function run(){
  const dataStr = await readFile(dataLoc, {encoding: "utf-8"});
  
  
  const data = dataStr.split("|").map(i=>{
    const tmp = i.split(",");
    tmp[0] = tmp[0].trim();
    return tmp;
  }).filter(i=>i[0] && i[1]);
  const promises = [];
  let count = 0;
  for(const i of data){
    promises.push(convertHeic(i[0], i[1]).catch(err=>console.log(err)).finally(()=>console.log(`completed ${++count}/${data.length}`)));
  }
  await Promise.allSettled(promises)
}

run();