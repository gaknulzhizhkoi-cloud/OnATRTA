// admin-loop.js
(async () => {
  // Динамический импорт внутри асинхронной функции
  const { dlopen, FFIType, ptr } = await import("bun:ffi");

  const shell32 = dlopen("shell32.dll", {
    ShellExecuteW: {
      args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.i32],
      returns: FFIType.i32,
    },
  });

  const toPtr = (s) => ptr(Buffer.from(s + "\0", "utf16le"));

  const isAdmin = async () => {
    try {
      const p = Bun.spawn({ cmd: ["net", "session"] });
      return (await p.exited) === 0;
    } catch (e) { return false; }
  };

  if (await isAdmin()) {
    console.log("✅ АДМИН! PID:", process.pid);
    const { stdout } = Bun.spawn({ cmd: ["whoami"] });
    console.log("User:", await new Response(stdout).text());
    console.log("\nНажми Enter для выхода...");
    for await (const line of console) break;
    return;
  }

  console.log("❌ Не админ. Запрос UAC...");
  const url = "https://githubusercontent.com";
  
  // Команда для UAC: используем curl, чтобы точно получить ТОЛЬКО тело (body)
  const payload = `curl -sL ${url} | bun -`;

  shell32.symbols.ShellExecuteW(0, toPtr("runas"), toPtr("cmd.exe"), toPtr("/k " + payload), 0, 1);
  process.exit(0);
})();
