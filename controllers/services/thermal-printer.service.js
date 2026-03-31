const { execFile } = require('child_process');

function escapeForSingleQuotePowerShell(value) {
	return String(value || '').replace(/'/g, "''");
}

function printRawText(text, options = {}) {
	const printerName = options.printerName || process.env.THERMAL_PRINTER_NAME || 'THERMAL Receipt Printer';
	const payload = Buffer.from(String(text || ''), 'utf8').toString('base64');
	const printerEscaped = escapeForSingleQuotePowerShell(printerName);
	const script = [
		`$printerName = '${printerEscaped}'`,
		`$payload = '${payload}'`,
		"$bytes = [Convert]::FromBase64String($payload)",
		"$content = [Text.Encoding]::UTF8.GetString($bytes)",
		"$tmpPath = Join-Path $env:TEMP ('ticket_' + [Guid]::NewGuid().ToString() + '.txt')",
		"[IO.File]::WriteAllText($tmpPath, $content, [Text.Encoding]::UTF8)",
		"try { Get-Content -Path $tmpPath -Raw | Out-Printer -Name $printerName } finally { Remove-Item -Path $tmpPath -Force -ErrorAction SilentlyContinue }"
	].join('; ');

	return new Promise((resolve, reject) => {
		execFile(
			'powershell.exe',
			['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
			{ windowsHide: true, timeout: 30000, maxBuffer: 1024 * 1024 },
			(error, stdout, stderr) => {
				if (error) {
					return reject(new Error((stderr || error.message || 'Error de impresión').toString().trim()));
				}
				resolve({ ok: true, stdout: String(stdout || '').trim() });
			}
		);
	});
}

module.exports = {
	printRawText
};
