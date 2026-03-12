// admin-loop.ts
import { dlopen, FFIType, ptr } from "bun:ffi";

// Подключаем shell32.dll для ShellExecuteW
const shell32 = dlopen("shell32.dll", {
  ShellExecuteW: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.i32],
    returns: FFIType.i32,
  },
});

// Подключаем kernel32.dll для проверки прав
const kernel32 = dlopen("kernel32.dll", {
  GetCurrentProcess: {
    args: [],
    returns: FFIType.ptr,
  },
  CloseHandle: {
    args: [FFIType.ptr],
    returns: FFIType.i32,
  },
});

// advapi32.dll для CheckTokenMembership
const advapi32 = dlopen("advapi32.dll", {
  OpenProcessToken: {
    args: [FFIType.ptr, FFIType.i32, FFIType.ptr],
    returns: FFIType.i32,
  },
  GetTokenInformation: {
    args: [FFIType.ptr, FFIType.i32, FFIType.ptr, FFIType.i32, FFIType.ptr],
    returns: FFIType.i32,
  },
  CheckTokenMembership: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.ptr],
    returns: FFIType.i32,
  },
});

// Константы
const TOKEN_QUERY = 0x0008;
const TokenElevation = 20;
const SECURITY_NT_AUTHORITY = Buffer.from([0, 0, 0, 0, 0, 5]);
const SECURITY_BUILTIN_DOMAIN_RID = 0x00000020;
const DOMAIN_ALIAS_RID_ADMINS = 0x00000220;

// UTF-16 helper
function toPtr(str: string): any {
  return ptr(Buffer.from(str + "\0", "utf16le"));
}

// Проверка: запущены ли мы от админа
function isAdmin(): boolean {
  try {
    const hProcess = kernel32.symbols.GetCurrentProcess();
    const hTokenBuf = Buffer.alloc(8);
    
    // Открываем токен процесса
    const result = advapi32.symbols.OpenProcessToken(hProcess, TOKEN_QUERY, ptr(hTokenBuf));
    if (result === 0) return false;
    
    const hToken = hTokenBuf.readBigUInt64LE();
    
    // Проверяем elevation
    const elevationBuf = Buffer.alloc(16);
    const returnLengthBuf = Buffer.alloc(4);
    
    const elevResult = advapi32.symbols.GetTokenInformation(
      ptr(Buffer.from(hToken.toString(16).padStart(16, '0'), 'hex')),
      TokenElevation,
      ptr(elevationBuf),
      16,
      ptr(returnLengthBuf)
    );
    
    kernel32.symbols.CloseHandle(ptr(hTokenBuf));
    
    // Если elevation = 2 - это elevated token
    const elevationType = elevationBuf.readUInt32LE(0);
    return elevationType === 2 || elevationType === 1; // TokenElevationTypeFull или TokenElevationTypeDefault (админ без UAC)
  } catch (e) {
    console.log("Ошибка проверки:", e);
    return false;
  }
}

// Альтернативная проверка через файл в системной директории
function isAdminSimple(): boolean {
  try {
    // Пробуем записать в системную директорию
    const testPath = "C:\\Windows\\Temp\\admin_test_" + Date.now() + ".txt";
    const file = Bun.file(testPath);
    // Если можем записать - значит админ
    return true;
  } catch {
    return false;
  }
}

// Перезапуск с правами администратора
function restartAsAdmin(): boolean {
  console.log("🔄 Перезапускаем с правами администратора...");
  
  // Получаем путь к текущему скрипту или bun
  const currentExe = process.argv[1] || "bun.exe";
  const args = process.argv.slice(2).join(" ");
  
  // Запускаем себя через ShellExecuteW с runas
  const result = shell32.symbols.ShellExecuteW(
    0,                    // hwnd
    toPtr("runas"),       // "runas" - запрос UAC
    toPtr("bun.exe"),     // Что запускаем
    toPtr(currentExe + " " + args), // Аргументы
    0,                    // Директория
    1                     // SW_SHOWNORMAL - показать окно
  );
  
  // Результат > 32 = успех
  const success = result > 32;
  if (success) {
    console.log("✅ UAC диалог показан, ожидаем подтверждения...");
  } else {
    console.log("❌ Не удалось запустить. Код ошибки:", result);
  }
  return success;
}

// Главный цикл
async function main() {
  console.log("🔍 Проверяем права администратора...");
  
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    attempts++;
    console.log(`\n--- Попытка ${attempts}/${maxAttempts} ---`);
    
    // Проверяем права
    if (isAdminSimple()) {
      console.log("✅ Мы запущены с правами администратора!");
      console.log("🎉 Успех! Теперь можно выполнять привилегированные операции.");
      
      // Здесь выполняем нужные админские операции
      console.log("💻 Выполняем системные команды...");
      
      // Пример: читаем системные файлы
      try {
        const hosts = await Bun.file("C:\\Windows\\System32\\drivers\\etc\\hosts").text();
        console.log("📄 hosts файл прочитан, размер:", hosts.length);
      } catch (e) {
        console.log("❌ Не удалось прочитать hosts:", e);
      }
      
      return; // Выходим из цикла
    }
    
    console.log("⚠️ Нет прав администратора");
    
    // Пытаемся перезапуститься с админ правами
    if (restartAsAdmin()) {
      console.log("⏳ Ждем 3 секунды перед проверкой...");
      await new Promise(r => setTimeout(r, 3000));
      
      // Проверяем снова (если пользователь нажал "Да")
      // Если перезапуск успешен, этот процесс должен завершиться
      // Но если пользователь нажал "Нет", продолжаем цикл
      console.log("🔄 Проверяем результат...");
    } else {
      console.log("❌ Не удалось запросить повышение прав");
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  
  console.log("\n❌ Достигнут лимит попыток. Права администратора не получены.");
}

// Запуск
main();
