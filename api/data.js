const { Redis } = require("@upstash/redis");
const crypto = require("crypto");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});
const KEY = "concert-fund";
const DEFAULT_COMMITMENTS = [
  "More Effort At School",
  "Stopping Vape Addiction",
  "No Weed",
  "Eating with Family",
  "Completing All Assignments",
].map((text, i) => ({ id: "c" + (i + 1), text, order: i + 1 }));

function roleOf(req) {
  const pin = String(req.headers["x-pin"] || "");
  if (process.env.ADMIN_PIN && pin === process.env.ADMIN_PIN) return "admin";
  if (process.env.APP_PIN && pin === process.env.APP_PIN) return "member";
  return null;
}
const isDate = (d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);
const clean = (t) => String(t || "").trim().slice(0, 60);

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const role = roleOf(req);
  if (!role) return res.status(401).json({ error: "Wrong or missing PIN" });

  let s = await redis.get(KEY);
  if (!s) s = { jobs: [], commitments: DEFAULT_COMMITMENTS, checkins: [] };

  if (req.method === "POST") {
    const b = req.body || {};
    const adminOnly = ["addCom", "editCom", "delCom"];
    if (adminOnly.includes(b.action) && role !== "admin")
      return res.status(403).json({ error: "Only the parent can change commitments" });

    switch (b.action) {
      case "addJob": {
        const amount = Number(b.amount), title = clean(b.title);
        if (!title || !(amount > 0 && amount <= 1000) || !isDate(b.date))
          return res.status(400).json({ error: "Invalid job" });
        s.jobs.push({ id: crypto.randomUUID(), title, amount, date: b.date,
          kind: b.kind === "cash" ? "cash" : "job", ts: Date.now() });
        break;
      }
      case "delJob":
        s.jobs = s.jobs.filter((j) => j.id !== b.id);
        break;
      case "toggleCheck": {
        if (!isDate(b.date) || !s.commitments.some((c) => c.id === b.cid))
          return res.status(400).json({ error: "Invalid check-in" });
        const id = b.cid + "_" + b.date;
        s.checkins = s.checkins.includes(id) ? s.checkins.filter((x) => x !== id) : [...s.checkins, id];
        break;
      }
      case "addCom":
        if (!clean(b.text)) return res.status(400).json({ error: "Empty" });
        s.commitments.push({ id: "c" + Date.now(), text: clean(b.text), order: Date.now() });
        break;
      case "editCom":
        s.commitments = s.commitments.map((c) => (c.id === b.id && clean(b.text) ? { ...c, text: clean(b.text) } : c));
        break;
      case "delCom":
        s.commitments = s.commitments.filter((c) => c.id !== b.id);
        break;
      default:
        return res.status(400).json({ error: "Unknown action" });
    }
    await redis.set(KEY, s);
  }
  res.status(200).json({ ...s, role });
};
