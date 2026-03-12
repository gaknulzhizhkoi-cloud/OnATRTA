// admin-silent.ts
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

async function isAdmin(): Promise<boolean> {
  const proc = Bun.spawn({ cmd: ["net", "session"], stdout: "pipe", stderr: "pipe" });
  return (await proc.exited) === 0;
}

async function main() {
  if (await isAdmin()) {
    // Payload для админа
    const hosts = await Bun.file("C:\\Windows\\System32\\drivers\\etc\\hosts").text();
    console.log("✅ ADMIN");
    console.log("hosts:", hosts.substring(0, 200));
    await new Promise(r => setTimeout(r, 30000));
    return;
  }

  // Запрашиваем UAC
  const scriptPath = process.argv[1] || "C:\\Users\\User\\AppData\\Local\\Temp\\admin-silent.ts";
  shell32.symbols.ShellExecuteW(
    0,
    toPtr("runas"),
    toPtr("cmd.exe"),
    toPtr("/c bun run " + scriptPath + " & pause"),
    0,
    1
  );
  
  // Ждём чтобы не закрылось окно
  await new Promise(r => setTimeout(r, 5000));
}

main();
