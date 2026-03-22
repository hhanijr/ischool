# download_weights.ps1  –  Download SadTalker weights on Windows (PowerShell)
# Run once after cloning:  .\scripts\download_weights.ps1

$SadTalkerDir = "$PSScriptRoot\..\backend\SadTalker"
$Checkpoints  = "$SadTalkerDir\checkpoints"
$GfpganWeights = "$SadTalkerDir\gfpgan\weights"

New-Item -ItemType Directory -Force -Path $Checkpoints   | Out-Null
New-Item -ItemType Directory -Force -Path $GfpganWeights | Out-Null

$checkpointFiles = @(
    @{ Name = "SadTalker_V0.0.2_256.safetensors";  Url = "https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2-rc/SadTalker_V0.0.2_256.safetensors" },
    @{ Name = "SadTalker_V0.0.2_512.safetensors";  Url = "https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2-rc/SadTalker_V0.0.2_512.safetensors" },
    @{ Name = "mapping_00109-model.pth.tar";        Url = "https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2-rc/mapping_00109-model.pth.tar" }
)

$gfpganFiles = @(
    @{ Name = "GFPGANv1.4.pth";            Url = "https://github.com/TencentARC/GFPGAN/releases/download/v1.3.4/GFPGANv1.4.pth" },
    @{ Name = "parsing_parsenet.pth";       Url = "https://github.com/sczhou/CodeFormer/releases/download/v0.1.0/parsing_parsenet.pth" }
)

Write-Host "Downloading SadTalker checkpoints (~1.6 GB)..."
foreach ($f in $checkpointFiles) {
    $dest = Join-Path $Checkpoints $f.Name
    if (-Not (Test-Path $dest)) {
        Write-Host "  -> $($f.Name)"
        Invoke-WebRequest -Uri $f.Url -OutFile $dest -UseBasicParsing
    } else {
        Write-Host "  [skip] $($f.Name) already exists"
    }
}

Write-Host "Downloading GFPGAN weights..."
foreach ($f in $gfpganFiles) {
    $dest = Join-Path $GfpganWeights $f.Name
    if (-Not (Test-Path $dest)) {
        Write-Host "  -> $($f.Name)"
        Invoke-WebRequest -Uri $f.Url -OutFile $dest -UseBasicParsing
    } else {
        Write-Host "  [skip] $($f.Name) already exists"
    }
}

Write-Host "Done! All weights are in place."
