$base = (Resolve-Path ".\input").Path

New-Item -Path ".\out" -ItemType Directory -Force | Out-Null
$out = (Resolve-Path ".\out").Path

$all = Get-ChildItem -Path $base -Recurse -File
$numtot = $all.count
$count = 0
$tmpFileName = ".\tmp.txt"
New-Item -ItemType File -Force -Path $tmpFileName | Out-Null

$all | ForEach-Object {

  $relativePath = $_.FullName.Substring($base.Length + 1)
  $tmp = Join-Path $out $relativePath

  $newOut = $null
  $copy = $false
  $forNode = $false
  if ($_.Extension.ToLower() -eq ".heic") {
    $newOut = $tmp.Substring(0, $tmp.Length - 5) + ".jpg"
    $forNode = $true
  }
  elseif ($_.Extension.ToLower() -eq ".mov") {
    $newOut = $tmp.Substring(0, $tmp.Length - 4) + ".mp4"
  }else{
    $newOut = $tmp
    $copy = $true
  }
  $name = $_.fullname
  write-host "Starting $name"
  if ($newOut) {
    # ensure output directory exists
    $dir = Split-Path $newOut
    New-Item -ItemType Directory -Force -Path $dir | Out-Null

    if($copy){
      Copy-Item -Path $_.FullName -Destination $newOut
    }else{
      if($forNode){
        $tmpData = $_.FullName + "," + $newOut + "|"
        Add-Content -Path $tmpFileName -Value $tmpData
      }else{
        ffmpeg -y -loglevel quiet -i $_.FullName $newOut
      }
    }
  }
  $count++
  
  write-host "finished $name. Done with $count out of $numtot"
}

node index.js $tmpFileName
rm $tmpFileName -force