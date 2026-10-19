<#
.SYNOPSIS
    Sends a .jsx (ExtendScript) file into Photoshop via COM.

.EXAMPLE
    .\ps_bridge.ps1 -JsxPath .\test_red_square.jsx
    .\ps_bridge.ps1 .\script.jsx -Arguments "foo","bar"
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$JsxPath,

    # Passed to the script as the `arguments` array.
    [string[]]$Arguments = @()
)

$ErrorActionPreference = 'Stop'

$resolved = Resolve-Path -LiteralPath $JsxPath -ErrorAction SilentlyContinue
if (-not $resolved) {
    Write-Error "JSX file not found: $JsxPath"
    exit 1
}
$fullPath = $resolved.ProviderPath
if ([IO.Path]::GetExtension($fullPath) -notin '.jsx', '.js') {
    Write-Warning "File does not have a .jsx/.js extension: $fullPath"
}

# Attach to the running Photoshop instance (or start it if it isn't open).
try {
    $ps = New-Object -ComObject Photoshop.Application
} catch {
    Write-Error "Could not connect to Photoshop via COM. Is Photoshop installed? $_"
    exit 1
}

Write-Host "Connected to Photoshop $($ps.Version)"
Write-Host "Running: $fullPath"

# Copy into a plain object[] element by element: a cast would keep PowerShell's PSObject
# wrappers, which COM rejects as an unsupported Variant type.
$jsxArgs = New-Object object[] $Arguments.Count
for ($i = 0; $i -lt $Arguments.Count; $i++) { $jsxArgs[$i] = [string]$Arguments[$i] }

try {
    # ExecutionMode 1 = psNeverShowDebugger, so script errors come back as COM exceptions
    # instead of opening the ExtendScript debugger.
    $result = $ps.DoJavaScriptFile($fullPath, $jsxArgs, 1)
} catch {
    $msg = if ($_.Exception.InnerException) { $_.Exception.InnerException.Message } else { $_.Exception.Message }
    Write-Error "JSX execution failed: $msg"
    exit 1
} finally {
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($ps)
}

if ($null -ne $result -and "$result" -ne '') {
    Write-Output $result
}
exit 0
