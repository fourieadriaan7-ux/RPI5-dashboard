import { execFile } from 'node:child_process';
import { platform } from 'node:os';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const ports = [5174, 18080, 8080];

async function stopWindows() {
  const command = [
    '$ports = @(5174, 18080, 8080);',
    'foreach ($port in $ports) {',
    '  Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |',
    '    Select-Object -ExpandProperty OwningProcess -Unique |',
    '    ForEach-Object {',
    '      if ($_ -and $_ -ne $PID) {',
    '        Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue;',
    '        Write-Host "Stopped process $_ on port $port";',
    '      }',
    '    }',
    '}',
    'exit 0',
  ].join(' ');

  await execFileAsync('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    command,
  ]);
}

async function stopUnix() {
  for (const port of ports) {
    const script = [
      `ids=$(lsof -ti tcp:${port} 2>/dev/null || true)`,
      'if [ -n "$ids" ]; then',
      `  kill $ids 2>/dev/null || true`,
      `  echo "Stopped process on port ${port}"`,
      'fi',
    ].join('\n');

    await execFileAsync('sh', ['-c', script]);
  }
}

if (platform() === 'win32') {
  await stopWindows();
} else {
  await stopUnix();
}
