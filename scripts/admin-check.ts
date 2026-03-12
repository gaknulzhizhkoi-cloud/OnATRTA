// admin-check.ts
import { dlopen, FFIType, ptr } from "bun:ffi";

const shell32 = dlopen("shell32.dll", {
  ShellExecuteW: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.i32],
    returns: FFIType.i32,
  },
});

function toPtr(str: string) {
  return ptr(Buffer.from(str + "\0", "utf16le"));
}

// Проверка через whoami /groups (ищем S-1-5-32-544 - группа администраторов)
async function isAdmin(): Promise<boolean> {
  try {
    const proc = Bun.spawn(["whoami", "/groups"]);
    const output = await new Response(proc.stdout).text();
    await proc.exited;
    
    // Проверяем наличие SID администраторов
    const isAdmin = output.includes("S-1-5-32-544") || 
                    output.includes("Administrators") ||
                    output.includes("Администраторы");
    
    console.log("whoami output:", output.substring(0, 200));
    console.log("Is admin:", isAdmin);
    
    return isAdmin;
  } catch (e) {
    console.log("whoami failed:", e);
    return false;
  }
}

async function main() {
  console.log("🚀 Скрипт запущен");
  console.log("PID:", process.pid);
  
  for (let i = 1; i <= 10; i++) {
    console.log(`\n=== Попытка ${i}/10 ===`);
    
    if (await isAdmin()) {
      console.log("✅ Мы администратор! Выполняем payload...");
      
      // Payload для админа
      console.log("💻 Системная информация:");
      const hostname = Bun.spawn(["hostname"]);
      console.log("Hostname:", await new Response(hostname.stdout).text());
      
      // Читаем системные файлы
      try {
        const hosts = await Bun.file("C:\\Windows\\System32\\drivers\\etc\\hosts").text();
        console.log("📄 hosts файл:", hosts.substring(0, 100));
      } catch (e) {
        console.log("❌ hosts:", e);
      }
      
      return;
    }
    
    console.log("❌ Не администратор");
    console.log("🔄 Запрашиваем UAC...");
    
    // Получаем путь к текущему скрипту
    const scriptPath = process.argv[1] || "C:\\Users\\User\\AppData\\Local\\Temp\\admin-check.ts";
    
    // Запускаем себя с правами администратора
    const result = shell32.symbols.ShellExecuteW(
      0,
      toPtr("runas"),
      toPtr("bun.exe"),
      toPtr("run " + scriptPath),
      0,
      1  // SW_SHOWNORMAL - показать окно
    );
    
    console.log("ShellExecuteW result:", result);
    
    if (result > 32) {
      console.log("✅ UAC диалог показан");
      console.log("⏳ Ждём 3 секунды...");
      await new Promise(r => setTimeout(r, 3000));
    } else {
      console.log("❌ Ошибка ShellExecuteW:", result);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  
  console.log("\n❌ Не удалось получить права администратора");
}

main();
