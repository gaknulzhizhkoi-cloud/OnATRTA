import { dlopen, FFIType, ptr } from "bun:ffi";

// 1. Подключаем системную библиотеку shell32.dll
const shell32 = dlopen("shell32.dll", {
  ShellExecuteW: {
    // Параметры: hwnd, operation, file, parameters, directory, showCmd
    args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.i32],
    returns: FFIType.ptr,
  },
});

// Функция для перевода строки в формат UTF-16 (нужен для Windows API)
function toPtr(str: string) {
  return ptr(Buffer.from(str + "\0", "utf16le"));
}

console.log("⏳ Вызываем окно UAC через FFI...");

// 2. Вызываем ShellExecuteW с глаголом "runas"
// "runas" — это стандартная команда Windows для запуска с повышением прав
const result = shell32.symbols.ShellExecuteW(
  0,                  // Простой дескриптор окна
  toPtr("runas"),     // Глагол (действие): запуск от админа
  toPtr("notepad.exe"), // Что запускаем
  0,                  // Аргументы (нет)
  0,                  // Рабочая директория (по умолчанию)
  1                   // SW_SHOWNORMAL (показать окно)
);

// Если результат > 32, значит запуск прошел успешно
if (Number(result) > 32) {
  console.log("✅ Успех! Блокнот запущен с правами администратора.");
} else {
  console.log("❌ Ошибка или пользователь нажал 'Нет' в окне UAC. Код:", result);
}
