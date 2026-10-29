// Uzun metinleri cümlelere böl (Chrome ~200 karakterden uzun metinlerde susabiliyor)
export function splitSentences(t) {
  const out = [];
  for (const para of t.split(/\n+/)) {
    const s = para.trim();
    if (!s) continue;
    const sentences = s.match(/[^.!?…]+[.!?…]*["”]?/g) || [s];
    let buf = '';
    for (const x of sentences) {
      if ((buf + x).length > 180 && buf) {
        out.push(buf.trim());
        buf = '';
      }
      buf += x;
    }
    if (buf.trim()) out.push(buf.trim());
  }
  return out;
}

