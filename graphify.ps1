# Use the installed package even when this Python omits site-packages at startup.
$ErrorActionPreference = 'Stop'
$graphifyRunner = "import runpy, site, sysconfig; site.addsitedir(sysconfig.get_path('purelib')); runpy.run_module('graphify', run_name='__main__', alter_sys=True)"
Push-Location $PSScriptRoot
try {
    & python -c $graphifyRunner @args
    $graphifyExitCode = $LASTEXITCODE
} finally {
    Pop-Location
}
exit $graphifyExitCode
