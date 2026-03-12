// admin-check.ts
import { dlopen, FFIType, ptr } from "bun:ffi";

// Логирование в файл для отладки
const logFile = "C:\\Users\\User\\AppData\\Local\\Temp\\admin-log.txt";
function log(msg: string) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}\n`;
  try {
    const existing = Bun.file(logFile).size > 0 ? require('fs').readFileSync(logFile, 'utf8') : '';
    require('fs').writeFileSync(logFile, existing + line);
  } catch {
    require('fs').writeFileSync(logFile, line);
  }
  console.log(msg); // Дублируем в консоль
}

log("🚀 Скрипт запущен");
log(`PID: ${process.pid}`);
log(`Args: ${JSON.stringify(process.argv)}`);

const shell32 = dlopen("shell32.dll", {
  ShellExecuteW: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.i32],
    returns: FFIType.i32,
  },
});

function toPtr(str: string) {
  return ptr(Buffer.from(str + "\0", "utf16le"));
}

// Проверка через whoami /groups
async function isAdmin(): Promise<boolean> {
  try {
    log("🔍 Запускаем whoami /groups...");
    const proc = Bun.spawn(["whoami", "/groups"]);
    const output = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;
    
    log(`whoami exit code: ${exitCode}`);
    log(`whoami output: ${output.substring(0, 500)}`);
    if (stderr) log(`whoami stderr: ${stderr}`);
    
    const isAdmin = output.includes("S-1-5-32-544") || 
                    output.includes("Administrators") ||
                    output.includes("Администраторы") ||
                    output.includes("BUILTIN\\Administrators");
    
    log(`Is admin check: ${isAdmin}`);
    return isAdmin;
  } catch (e) {
    log(`whoami failed: ${e}`);
    return false;
  }
}

async function main() {
  for (let i = 1; i <= 10; i++) {
    log(`\n=== Попытка ${i}/10 ===`);
    
    if (await isAdmin()) {
      log("✅ Мы администратор!");
      
      // Payload
      try {
        const hosts = await Bun.file("C:\\Windows\\System32\\drivers\\etc\\hosts").text();
        log(`📄 hosts файл прочитан, размер: ${hosts.length}`);
      } catch (e) {
        log(`❌ hosts: ${e}`);
      }
      
      // Держим окно открытым 10 секунд чтобы увидеть результат
      log("⏳ Ждём 10 секунд...");
      await new Promise(r => setTimeout(r, 10000));
      return;
    }
    
    log("❌ Не администратор, запрашиваем UAC...");
    
    const scriptPath = process.argv[1] || "C:\\Users\\User\\AppData\\Local\\Temp\\admin-check.ts";
    log(`Script path: ${scriptPath}`);
    
    const result = shell32.symbols.ShellExecuteW(
      0,
      toPtr("runas"),
      toPtr("bun.exe"),
      toPtr("run " + scriptPath),
      0,
      1
    );
    
    log(`ShellExecuteW result: ${result}`);
    
    if (result > 32) {
      log("✅ UAC диалог показан, ждём...");
      await new Promise(r => setTimeout(r, 5000));
    } else {
      log(`❌ Ошибка ShellExecuteW: ${result}`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  
  log("\n❌ Не удалось получить права администратора");
  await new Promise(r => setTimeout(r, 5000));
}

main().catch(e => log(`💥 Ошибка: ${e}`));
