import {readFile, writeFile, readdir} from "node:fs/promises";
import convert from "heic-convert";
import {resolve, extname} from "path";
import {exec} from "child_process";
import ExifReader from 'exifreader';
import {convertHeicOrFile, terminateHeicProcessing} from "./heicHelpers.js";
import pLimit from 'p-limit';

const limit = pLimit(700);


async function getAndSortFiles(){
  const allFiles = await readdir("./input", {withFileTypes: true, recursive: true});
  const sortingObj = {
    movs: [],
    heics: [],
    other: []
  };
  for(const i of allFiles){
    if(!i.isFile()){continue;}
    switch(extname(i.name).toLowerCase()){
      case ".heic":
        sortingObj.heics.push(i);
        break; 
      case ".mov":
        sortingObj.movs.push(i);
        break;
      default:
        sortingObj.other.push(i);
    }
  }
  return sortingObj;
}

async function getDateMetadata(fileObj){
  const pathLoc = resolve(fileObj.parentPath, fileObj.name);
  switch(extname(fileObj.name).toLowerCase()){
    case ".heic":
    case ".png":
    case ".jpg":
    case ".jpeg":
      const obj = await ExifReader.load(pathLoc);
      const str = obj['DateTimeOriginal'].description;
      const arr = str.substring(0, str.indexOf(" ")).split(":").map(i=>parseInt(i));
      const date = new Date();
      date.setDate(arr[2]);
      date.setMonth(arr[1]);
      date.setFullYear(arr[0]);
      return date;
    case ".mov":
      return new Promise((resolve, reject) => {
        exec(`ffprobe -v quiet -print_format json -show_format -show_streams "${pathLoc}"`, (err, stdout) => {
        if (err) return reject(err);
        resolve(new Date(JSON.parse(stdout).format.tags.creation_time));
      });
  });
    default:
      return new Date();
  }
}

async function createConversions({fileObj, date}){
  switch(extname(fileObj.name).toLowerCase()){
    case ".mov":
      break;
    case ".heic":  
    default:
      return convertHeicOrFile({fileObj, date});
  }
}


console.log("Started");
getAndSortFiles().then(async (res)=>{
  console.log("Finished sorting");
  return Promise.allSettled(res.other.map(async (i)=>{
    return {date: await getDateMetadata(i), fileObj: i};
  }));
}).then(res=>{
  console.log("Finished getting dates");
  const promises = [];
  let numFinished = 0;
  for(const i of res){
    if(i.reason){
      console.warn(i.reason);
      continue;
    }
    promises.push(createConversions(i.value).catch(err=>console.log(err)).finally(()=>console.log(`Finished ${++numFinished}/${res.length}`)));
  }
  return Promise.allSettled(promises);
}).catch(err=>console.log(err)).finally(()=>{
  console.log("shutting Down"); 
  terminateHeicProcessing();
});

