// admin-simple.ts
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

// Простая проверка: пытаемся открыть файл в системной директории
async function isAdmin(): Promise<boolean> {
  try {
    const testFile = "C:\\Windows\\Temp\\admin_check_" + Date.now();
    await Bun.write(testFile, "test");
    await Bun.file(testFile).delete();
    return true;
  } catch {
    return false;
  }
}

async function main() {
  for (let i = 1; i <= 10; i++) {
    console.log(`Попытка ${i}/10...`);
    
    if (await isAdmin()) {
      console.log("✅ Админ! Выполняем команды...");
      // Здесь payload
      return;
    }
    
    console.log("❌ Не админ, запрашиваем UAC...");
    
    // Перезапускаем себя
    shell32.symbols.ShellExecuteW(
      0,
      toPtr("runas"),
      toPtr("bun.exe"),
      toPtr(process.argv.slice(1).join(" ")),
      0,
      1
    );
    
    // Ждём 3 секунды
    await new Promise(r => setTimeout(r, 3000));
  }
}

main();
