/**
 * uploadStudyNotes.ts
 *
 * Uploads a folder of per-book study-note JSON files to a CasualOS record on
 * https://api.ao.bot, then writes a { BOOK_ID: url } map — the exact shape the
 * LIGONIER_STUDY_NOTE_TAGS secret / .env value uses.
 *
 * That map is consumed by script/injectStudyNoteTags.ts, which injects the URLs
 * as tags into packages/StudyNote/studyNote/main/studyNote.main.bot.aux.
 *
 * This script is self-contained: it calls the records API directly with `fetch`
 * and does not import @casual-simulation/aux-records (whose package ships ESM
 * syntax without declaring "type": "module", which breaks under tsx).
 *
 * Usage:
 *   pnpm upload:study-notes <folder> [options]
 *
 * Options:
 *   --record <name>       Record to upload into. Default: studyNoteV3
 *                         Created automatically if it does not exist.
 *   --policy <p>          Key policy used if the record must be created:
 *                         "subjectfull" (default) or "subjectless".
 *   --out <path>          Where to write the { BOOK_ID: url } JSON.
 *                         Default: dist/<record>-tags.json
 *   --session-key <key>   Use this session key instead of the one saved by the
 *                         `casualos` CLI.
 *
 * Auth: uses the session key saved by the `casualos` CLI. Log in first:
 *   pnpm exec casualos set-endpoint https://api.ao.bot
 *   pnpm exec casualos login
 */
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import axios from "axios";
import Conf from "conf";

const ENDPOINT = "https://api.ao.bot";
const ORIGIN = "https://auth.ao.bot";

// Headers the upload host (S3) won't accept being forwarded.
const UNSAFE_HEADERS = new Set([
  "accept-encoding",
  "referer",
  "sec-fetch-dest",
  "sec-fetch-mode",
  "sec-fetch-site",
  "origin",
  "sec-ch-ua-platform",
  "user-agent",
  "sec-ch-ua-mobile",
  "sec-ch-ua",
  "content-length",
  "connection",
  "host",
]);

/**
 * Book-name prefix -> standard 3-character book ID.
 * Kept in sync with packages/StudyNote/studyNote/main/onClick.tsx.
 */
const BOOK_NAME_TO_ID: Record<string, string> = {
  Gen: "GEN", Ex: "EXO", Lev: "LEV", Num: "NUM", Deut: "DEU",
  Josh: "JOS", Judg: "JDG", Ruth: "RUT",
  "1Sam": "1SA", "2Sam": "2SA", "1Kings": "1KI", "2Kings": "2KI",
  "1Chr": "1CH", "2Chr": "2CH", Ezra: "EZR", Neh: "NEH", Philem: "PHM",
  Esth: "EST", Job: "JOB", Ps: "PSA", Prov: "PRO",
  Eccl: "ECC", Song: "SNG", Is: "ISA", Jer: "JER",
  Lam: "LAM", Ezek: "EZK", Dan: "DAN",
  Hos: "HOS", Joel: "JOL", Amos: "AMO", Obad: "OBA",
  Jonah: "JON", Mic: "MIC", Nah: "NAM", Hab: "HAB",
  Zeph: "ZEP", Hag: "HAG", Zech: "ZEC", Mal: "MAL",
  Matt: "MAT", Mark: "MRK", Luke: "LUK", John: "JHN",
  Acts: "ACT", Rom: "ROM",
  "1Cor": "1CO", "2Cor": "2CO", Gal: "GAL", Eph: "EPH",
  Phil: "PHP", Col: "COL",
  "1Thess": "1TH", "2Thess": "2TH", "1Tim": "1TI", "2Tim": "2TI",
  Titus: "TIT", Heb: "HEB", James: "JAS",
  "1Pet": "1PE", "2Pet": "2PE",
  "1John": "1JN", "2John": "2JN", "3John": "3JN",
  Jude: "JUD", Rev: "REV",
};

const KNOWN_BOOK_IDS = new Set(Object.values(BOOK_NAME_TO_ID)); // 66 books

/**
 * Resolves a Bible book ID from a file name. Handles:
 *   "Amos_studyNote.json" -> AMO   (prefix before the first "_")
 *   "Amos.json"           -> AMO   (whole stem)
 *   "AMO.json"            -> AMO   (already an ID)
 * Returns null when nothing matches a known book.
 */
function resolveBookId(fileName: string): string | null {
  const stem = path.basename(fileName, path.extname(fileName));
  for (const c of [stem, stem.split("_")[0]]) {
    if (KNOWN_BOOK_IDS.has(c.toUpperCase())) return c.toUpperCase();
    const key = Object.keys(BOOK_NAME_TO_ID).find(
      (k) => k.toLowerCase() === c.toLowerCase()
    );
    if (key) return BOOK_NAME_TO_ID[key];
  }
  return null;
}

/** Splits argv into positionals and `--flag value` options. */
function parseArgs(argv: string[]) {
  const valueFlags = new Set(["record", "policy", "out", "session-key"]);
  const opts: Record<string, string> = {};
  const positionals: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      opts[key] = valueFlags.has(key) ? argv[++i] : "true";
    } else {
      positionals.push(a);
    }
  }
  return { opts, positionals };
}

/** Reads the session key saved by the `casualos` CLI for api.ao.bot. */
function readSavedSessionKey(): string | null {
  try {
    const config = new Conf({ projectName: "casualos-cli" });
    return (config.get(`${ENDPOINT}:sessionKey`) as string) || null;
  } catch {
    return null;
  }
}

/** Calls a CasualOS records API procedure and returns its JSON result. */
async function callProcedure(
  procedure: string,
  input: unknown,
  sessionKey: string
): Promise<any> {
  const res = await fetch(`${ENDPOINT}/api/v3/callProcedure`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
      Accept: "application/json,application/x-ndjson",
      Origin: ORIGIN,
      Authorization: `Bearer ${sessionKey}`,
    },
    body: JSON.stringify({ procedure, input }),
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `${procedure} returned non-JSON (HTTP ${res.status}): ${text.slice(0, 300)}`
    );
  }
}

/**
 * Uploads raw bytes to the given record key and returns the public file URL.
 * Two phases: register the file, then PUT the bytes to the presigned URL.
 */
async function uploadFileBytes(
  recordKey: string,
  bytes: Buffer,
  sessionKey: string
): Promise<{ url: string; alreadyExisted: boolean }> {
  const sha256 = createHash("sha256").update(bytes).digest("hex");

  const result = await callProcedure(
    "recordFile",
    {
      recordKey,
      fileSha256Hex: sha256,
      fileMimeType: "application/json",
      fileByteLength: bytes.byteLength,
      markers: ["publicRead"],
    },
    sessionKey
  );

  if (result.success === false) {
    // Identical bytes already stored — the server dedupes and returns the URL.
    if (result.errorCode === "file_already_exists") {
      return { url: result.existingFileUrl, alreadyExisted: true };
    }
    throw new Error(`${result.errorCode} - ${result.errorMessage}`);
  }

  const uploadHeaders: Record<string, string> = { ...result.uploadHeaders };
  for (const h of UNSAFE_HEADERS) delete uploadHeaders[h];

  const put = await axios.request({
    method: String(result.uploadMethod).toLowerCase(),
    url: result.uploadUrl,
    headers: uploadHeaders,
    data: bytes,
    validateStatus: () => true,
  });
  if (put.status < 200 || put.status >= 300) {
    throw new Error(`upload PUT failed with HTTP ${put.status}`);
  }
  return { url: result.uploadUrl, alreadyExisted: false };
}

async function main() {
  const { opts, positionals } = parseArgs(process.argv.slice(2));
  const folder = positionals[0];
  const recordName = opts.record ?? "studyNoteV3";
  const policy = opts.policy ?? "subjectfull";

  if (!folder) {
    console.error(
      "Usage: pnpm upload:study-notes <folder> [--record <name>] " +
        "[--policy subjectfull|subjectless] [--out <path>] [--session-key <key>]"
    );
    process.exit(1);
  }
  const outPath = path.resolve(
    opts.out ?? path.join("dist", `${recordName}-tags.json`)
  );

  // 1. Collect .json files and resolve each to a book ID ------------------
  const info = await stat(folder).catch(() => null);
  if (!info || !info.isDirectory()) {
    console.error(`Not a folder: ${folder}`);
    process.exit(1);
  }
  const entries = await readdir(folder, { withFileTypes: true });
  const jsonFiles = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".json"))
    .map((e) => e.name)
    .sort();
  if (jsonFiles.length === 0) {
    console.error(`No .json files found in: ${folder}`);
    process.exit(1);
  }

  const resolved: { file: string; bookId: string }[] = [];
  const unresolved: string[] = [];
  for (const file of jsonFiles) {
    const bookId = resolveBookId(file);
    if (bookId) resolved.push({ file, bookId });
    else unresolved.push(file);
  }

  console.log(`Found ${jsonFiles.length} .json file(s) in ${folder}:`);
  for (const { file, bookId } of resolved) {
    console.log(`  ${bookId.padEnd(4)} <-  ${file}`);
  }
  if (unresolved.length > 0) {
    console.log("\nCould NOT map these to a book (they will be skipped):");
    for (const file of unresolved) console.log(`  ?    ${file}`);
    console.log(
      "Rename them as <BookName>_*.json (e.g. Amos_studyNote.json) and re-run."
    );
  }

  // Stop if two files claim the same book.
  const byBook = new Map<string, string>();
  for (const { file, bookId } of resolved) {
    if (byBook.has(bookId)) {
      console.error(
        `\nTwo files map to ${bookId}: "${byBook.get(bookId)}" and "${file}". ` +
          "Resolve the duplicate and re-run."
      );
      process.exit(1);
    }
    byBook.set(bookId, file);
  }

  // 2. Authentication -----------------------------------------------------
  const sessionKey = opts["session-key"] ?? readSavedSessionKey();
  if (!sessionKey) {
    console.error(
      "\nNot logged in to api.ao.bot. Run these first:\n" +
        "  pnpm exec casualos set-endpoint https://api.ao.bot\n" +
        "  pnpm exec casualos login\n" +
        "...or pass --session-key <key>."
    );
    process.exit(1);
  }

  // 3. Make sure the record exists (creates it if it doesn't) -------------
  const keyResult = await callProcedure(
    "createRecordKey",
    { recordName, policy },
    sessionKey
  );
  if (keyResult.success === false) {
    console.error(
      `\nCould not create or access record "${recordName}":\n` +
        `  ${keyResult.errorCode} - ${keyResult.errorMessage}\n` +
        `If your session expired, run "pnpm exec casualos login" again.\n` +
        `If the name is taken by someone else, pass a different --record.`
    );
    process.exit(1);
  }
  const recordKey: string = keyResult.recordKey;

  // 4. Upload each file ---------------------------------------------------
  console.log(`\nUploading ${resolved.length} file(s) to "${recordName}"...\n`);
  const tags: Record<string, string> = {};
  let failed = 0;
  for (const { file, bookId } of resolved) {
    try {
      const bytes = await readFile(path.join(folder, file));
      const { url, alreadyExisted } = await uploadFileBytes(
        recordKey,
        bytes,
        sessionKey
      );
      tags[bookId] = url;
      console.log(
        `  OK    ${bookId}${alreadyExisted ? " (already stored)" : ""}`
      );
    } catch (err) {
      failed++;
      console.error(`  FAIL  ${bookId} (${file}): ${(err as Error).message}`);
    }
  }

  // 5. Write the { BOOK_ID: url } map (sorted by book ID) -----------------
  const sorted: Record<string, string> = {};
  for (const k of Object.keys(tags).sort()) sorted[k] = tags[k];

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(sorted, null, 2) + "\n", "utf-8");

  // 6. Report -------------------------------------------------------------
  const missing = [...KNOWN_BOOK_IDS].filter((b) => !(b in sorted)).sort();
  console.log(
    `\nDone — ${Object.keys(sorted).length} uploaded, ${failed} failed, ` +
      `${unresolved.length} skipped.`
  );
  if (missing.length > 0) {
    console.log(
      `Note: ${missing.length} of 66 books have no URL: ${missing.join(", ")}`
    );
  } else {
    console.log("All 66 books covered.");
  }
  console.log(`\nMap written to: ${outPath}`);
  console.log(
    "\nTo apply it, put this single line in your .env file:\n" +
      `LIGONIER_STUDY_NOTE_TAGS=${JSON.stringify(sorted)}`
  );
  console.log("then run:  pnpm inject-study-note-tags");

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
