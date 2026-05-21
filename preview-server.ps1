$Root = "C:\Users\RONAK SINGH\Documents\Codex\YT Transcript"
$Address = [System.Net.IPAddress]::Parse("127.0.0.1")
$Listener = [System.Net.Sockets.TcpListener]::new($Address, 8080)
$Listener.Start()

while ($true) {
    $Client = $Listener.AcceptTcpClient()
    try {
        $Stream = $Client.GetStream()
        $Reader = [System.IO.StreamReader]::new($Stream)
        $RequestLine = $Reader.ReadLine()
        if (-not $RequestLine) {
            $Client.Close()
            continue
        }

        while ($Reader.Peek() -gt -1) {
            $Line = $Reader.ReadLine()
            if ([string]::IsNullOrWhiteSpace($Line)) { break }
        }

        $Parts = $RequestLine.Split(" ")
        $Path = if ($Parts.Length -gt 1) { $Parts[1] } else { "/" }
        if ($Path -eq "/") { $Path = "/preview.html" }
        $Path = $Path.Split("?")[0]
        $Decoded = [System.Uri]::UnescapeDataString($Path.TrimStart("/"))
        $File = Join-Path $Root $Decoded

        if (Test-Path -LiteralPath $File -PathType Leaf) {
            $Body = [System.IO.File]::ReadAllBytes($File)
            $ContentType = if ($File.EndsWith(".html")) {
                "text/html; charset=utf-8"
            } elseif ($File.EndsWith(".css")) {
                "text/css; charset=utf-8"
            } elseif ($File.EndsWith(".js")) {
                "text/javascript; charset=utf-8"
            } else {
                "application/octet-stream"
            }
            $Header = "HTTP/1.1 200 OK`r`nContent-Type: $ContentType`r`nContent-Length: $($Body.Length)`r`nConnection: close`r`n`r`n"
        } else {
            $Body = [System.Text.Encoding]::UTF8.GetBytes("Not found")
            $Header = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($Body.Length)`r`nConnection: close`r`n`r`n"
        }

        $HeaderBytes = [System.Text.Encoding]::ASCII.GetBytes($Header)
        $Stream.Write($HeaderBytes, 0, $HeaderBytes.Length)
        $Stream.Write($Body, 0, $Body.Length)
    } finally {
        $Client.Close()
    }
}
