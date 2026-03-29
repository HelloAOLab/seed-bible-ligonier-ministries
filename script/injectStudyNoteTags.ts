/**
 * injectStudyNoteTags.ts
 *
 * Injects study note URLs into the StudyNote bot.aux file.
 *
 * - Local dev: reads from .env file (gitignored)
 * - CI/CD: reads from LIGONIER_STUDY_NOTE_TAGS env var (GitHub secret)
 *
 * Usage:
 *   pnpm inject-study-note-tags
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const BOT_AUX_PATH = path.resolve(
  "packages",
  "StudyNote",
  "studyNote",
  "main",
  "studyNote.main.bot.aux"
);

const SECRET_NAME = "LIGONIER_STUDY_NOTE_TAGS";

async function loadFromEnvFile(): Promise<string | null> {
  const envPath = path.resolve(".env");
  if (!existsSync(envPath)) return null;

  const content = await readFile(envPath, "utf-8");
  const prefix = `${SECRET_NAME}=`;
  const startIdx = content.indexOf(prefix);
  if (startIdx === -1) return null;

  let value = content.slice(startIdx + prefix.length).trim();
  if (
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith('"') && value.endsWith('"'))
  ) {
    value = value.slice(1, -1);
  }
  return value;
}

async function main() {
  // CI/CD: env var from GitHub secret | Local: .env file
  const raw = process.env[SECRET_NAME] || (await loadFromEnvFile());

  if (!raw) {
    console.warn("⚠️  No study note tags found. Skipping injection.");
    process.exit(0);
  }

  let tags: Record<string, string>;
  try {
    tags = JSON.parse(raw);
  } catch (e) {
    console.error("❌ Failed to parse as JSON:", (e as Error).message);
    process.exit(1);
  }

  const tagCount = Object.keys(tags).length;
  if (tagCount === 0) {
    console.error("❌ No book entries found.");
    process.exit(1);
  }

  const auxContent = await readFile(BOT_AUX_PATH, "utf-8");
  const aux = JSON.parse(auxContent);
  const botTags = aux?.state?.["{id}"]?.tags;

  if (!botTags) {
    console.error("❌ Unexpected bot.aux structure");
    process.exit(1);
  }

  let injectedCount = 0;
  for (const [bookId, url] of Object.entries(tags)) {
    if (typeof url === "string" && url.startsWith("http")) {
      botTags[bookId] = url;
      injectedCount++;
    }
  }

  await writeFile(BOT_AUX_PATH, JSON.stringify(aux, null, 2) + "\n", "utf-8");
  console.log(`✅ Injected ${injectedCount} study note URLs into bot.aux`);
}

main();
