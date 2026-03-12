// admin-loop.ts
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
  console.log("🚀 PID:", process.pid);
  
  for (let i = 1; i <= 10; i++) {
    console.log(`\n=== Попытка ${i}/10 ===`);
    
    if (await isAdmin()) {
      console.log("✅ АДМИН! Выполняем payload...");
      
      // Payload
      const whoami = Bun.spawn({ cmd: ["whoami"], stdout: "pipe" });
      console.log("whoami:", (await new Response(whoami.stdout).text()).trim());
      
      try {
        const hosts = await Bun.file("C:\\Windows\\System32\\drivers\\etc\\hosts").text();
        console.log("hosts:", hosts.substring(0, 100));
      } catch (e) {
        console.log("hosts error:", e);
      }
      
      console.log("⏳ Успех! Ждём 30 сек...");
      await new Promise(r => setTimeout(r, 30000));
      return;
    }
    
    console.log("❌ Не админ");
    
    if (i < 10) {
      console.log("🔄 Запрашиваем UAC...");
      
      const scriptPath = process.argv[1] || "C:\\Users\\User\\AppData\\Local\\Temp\\admin-loop.ts";
      const result = shell32.symbols.ShellExecuteW(
        0,
        toPtr("runas"),
        toPtr("cmd.exe"),
        toPtr("/c bun run " + scriptPath + " & pause"),
        0,
        1
      );
      
      console.log("ShellExecuteW:", result);
      
      if (result > 32) {
        console.log("✅ UAC показан, ждём 5 сек...");
        await new Promise(r => setTimeout(r, 5000));
      } else {
        console.log("❌ Ошибка:", result);
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  }
  
  console.log("\n❌ Не удалось стать админом");
  await new Promise(r => setTimeout(r, 10000));
}

main().catch(console.error);
