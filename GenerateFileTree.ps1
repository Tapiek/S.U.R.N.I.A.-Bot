param (
    [string]$Path = ".",
    [string[]]$Exclude = @("node_modules", ".git")
)

function Get-FileTree {
    param (
        [string]$Directory,
        [int]$Indent = 0,
        [string[]]$ExcludeDirs
    )

    # Get directories and files in the current directory
    $items = Get-ChildItem -Path $Directory -Force | Where-Object {
        $_.PSIsContainer -or $_.Name -notin $ExcludeDirs
    }

    foreach ($item in $items) {
        if ($item.PSIsContainer -and ($item.Name -notin $ExcludeDirs)) {
            # Print directory name
            Write-Output (" " * $Indent + "|-- " + $item.Name)
            # Recursively call the function for subdirectories
            Get-FileTree -Directory $item.FullName -Indent ($Indent + 4) -ExcludeDirs $ExcludeDirs
        }
        elseif (-not $item.PSIsContainer) {
            # Print file name
            Write-Output (" " * $Indent + "|-- " + $item.Name)
        }
    }
}

# Start generating the file tree from the given path
Write-Output ("Root: " + (Get-Item -Path $Path).FullName)
Get-FileTree -Directory $Path -ExcludeDirs $Exclude

#.\GenerateFileTree.ps1 -Path "C:\Users\tapie\Documents\Projects\SurnTest" -Exclude "node_modules", ".git"