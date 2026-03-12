// admin-check.ts
import { dlopen, FFIType, ptr } from "bun:ffi";

// ПРАВИЛЬНАЯ проверка: net session (только админ может выполнить)
async function isAdmin(): Promise<boolean> {
  try {
    const proc = Bun.spawn({
      cmd: ["net", "session"],
      stdout: "pipe",
      stderr: "pipe",
    });
    
    const exitCode = await proc.exited;
    console.log("net session exit code:", exitCode);
    
    // exit code 0 = админ, 2 или другое = не админ
    return exitCode === 0;
  } catch (e) {
    console.log("net session error:", e);
    return false;
  }
}

// Альтернативная проверка: пробуем записать в защищённое место
async function isAdminWrite(): Promise<boolean> {
  try {
    const testPath = "C:\\Windows\\System32\\drivers\\etc\\admin_test_" + Date.now();
    await Bun.write(testPath, "test");
    // Если дошли сюда - админ
    await Bun.file(testPath).delete();
    return true;
  } catch {
    return false;
  }
}

const shell32 = dlopen("shell32.dll", {
  ShellExecuteW: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.i32],
    returns: FFIType.i32,
  },
});

function toPtr(str: string) {
  return ptr(Buffer.from(str + "\0", "utf16le"));
}

async function main() {
  console.log("🚀 Скрипт запущен");
  console.log("PID:", process.pid);
  
  // Проверяем оба метода
  const netAdmin = await isAdmin();
  const writeAdmin = await isAdminWrite();
  console.log("net session admin:", netAdmin);
  console.log("write admin:", writeAdmin);
  
  const isReallyAdmin = netAdmin || writeAdmin;
  
  if (isReallyAdmin) {
    console.log("✅ Подтверждено: мы администратор!");
    console.log("whoami:", await new Response(Bun.spawn({cmd: ["whoami"], stdout: "pipe"}).stdout).text());
    
    // Payload
    try {
      const hosts = await Bun.file("C:\\Windows\\System32\\drivers\\etc\\hosts").text();
      console.log("📄 hosts:", hosts.substring(0, 100));
    } catch (e) {
      console.log("❌ hosts:", e);
    }
    
    await new Promise(r => setTimeout(r, 10000));
    return;
  }
  
  console.log("❌ Не администратор");
  console.log("🔄 Запрашиваем UAC...");
  
  // Получаем путь к текущему скрипту
  const scriptPath = process.argv[1] || "C:\\Users\\User\\AppData\\Local\\Temp\\admin-check.ts";
  console.log("Script path:", scriptPath);
  
  // ShellExecuteW с runas
  const result = shell32.symbols.ShellExecuteW(
    0,
    toPtr("runas"),
    toPtr("cmd.exe"),  // Запускаем cmd чтобы увидеть окно
    toPtr("/c bun run " + scriptPath + " && pause"),
    0,
    1  // SW_SHOWNORMAL
  );
  
  console.log("ShellExecuteW result:", result);
  
  if (result > 32) {
    console.log("✅ UAC запрошен, ждём...");
    // Ждём бесконечно чтобы процесс не умер
    await new Promise(() => {});
  } else {
    console.log("❌ Ошибка:", result);
    await new Promise(r => setTimeout(r, 5000));
  }
}

main().catch(console.error);
