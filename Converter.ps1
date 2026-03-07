$base = (Resolve-Path ".\input").Path

New-Item -Path ".\out" -ItemType Directory -Force | Out-Null
$out = (Resolve-Path ".\out").Path

$all = Get-ChildItem -Path $base -Recurse -File
$numtot = $all.count

$all | ForEach-Object {

  $relativePath = $_.FullName.Substring($base.Length + 1)
  $tmp = Join-Path $out $relativePath

  $newOut = $null
  $copy = $false
  if ($_.Extension.ToLower() -eq ".heic") {
    $newOut = $tmp.Substring(0, $tmp.Length - 5) + ".jpg"
  }
  elseif ($_.Extension.ToLower() -eq ".mov") {
    $newOut = $tmp.Substring(0, $tmp.Length - 4) + ".mp4"
  }else{
    $newOut = $tmp
    $copy = $true
  }

  if ($newOut) {

    # ensure output directory exists
    $dir = Split-Path $newOut
    New-Item -ItemType Directory -Force -Path $dir | Out-Null

    if($copy){
      Copy-Item -Path $_.FullName -Destination $newOut
    }else{
      ffmpeg -y -loglevel quiet -i $_.FullName $newOut 
    }
  }
  $count++
  $name = $_.basename
  write-host "finished $name. Done with $count out of $numtot"
}