const getStyleOf = await thisBot.GetStyle();
import { BibleDataManager } from "app.hooks.bibleDataManager";
const Apologist = await thisBot.Apologist();
const Tapos = await thisBot.Tapos();
const TableTalkEmbed = await thisBot.TableTalk();
import { TextEditor } from "app.components.editor";
const { useEffect, useState, useRef, useLayoutEffect, useCallback, useMemo } =
  os.appHooks;

const bibleBooks = [
  { id: "GEN", name: "GENESIS", realName: "Genesis" },
  { id: "EXO", name: "EXODUS", realName: "Exodus" },
  { id: "LEV", name: "LEVITICUS", realName: "Leviticus" },
  { id: "NUM", name: "NUMBERS", realName: "Numbers" },
  { id: "DEU", name: "DEUTERONOMY", realName: "Deuteronomy" },
  { id: "JOS", name: "JOSHUA", realName: "Joshua" },
  { id: "JDG", name: "JUDGES", realName: "Judges" },
  { id: "RUT", name: "RUTH", realName: "Ruth" },
  { id: "1SA", name: "1 SAMUEL", realName: "1 Samuel" },
  { id: "2SA", name: "2 SAMUEL", realName: "2 Samuel" },
  { id: "1KI", name: "1 KINGS", realName: "1 Kings" },
  { id: "2KI", name: "2 KINGS", realName: "2 Kings" },
  { id: "1CH", name: "1 CHRONICLES", realName: "1 Chronicles" },
  { id: "2CH", name: "2 CHRONICLES", realName: "2 Chronicles" },
  { id: "EZR", name: "EZRA", realName: "Ezra" },
  { id: "NEH", name: "NEHEMIAH", realName: "Nehemiah" },
  { id: "EST", name: "ESTHER", realName: "Esther" },
  { id: "JOB", name: "JOB", realName: "Job" },
  { id: "PSA", name: "PSALMS", realName: "Psalms" },
  { id: "PRO", name: "PROVERBS", realName: "Proverbs" },
  { id: "ECC", name: "ECCLESIASTES", realName: "Ecclesiastes" },
  { id: "SNG", name: "SONG", realName: "Song" },
  { id: "ISA", name: "ISAIAH", realName: "Isaiah" },
  { id: "JER", name: "JEREMIAH", realName: "Jeremiah" },
  { id: "LAM", name: "LAMENTATIONS", realName: "Lamentations" },
  { id: "EZK", name: "EZEKIEL", realName: "Ezekiel" },
  { id: "DAN", name: "DANIEL", realName: "Daniel" },
  { id: "HOS", name: "HOSEA", realName: "Hosea" },
  { id: "JOL", name: "JOEL", realName: "Joel" },
  { id: "AMO", name: "AMOS", realName: "Amos" },
  { id: "OBA", name: "OBADIAH", realName: "Obadiah" },
  { id: "JON", name: "JONAH", realName: "Jonah" },
  { id: "MIC", name: "MICAH", realName: "Micah" },
  { id: "NAM", name: "NAHUM", realName: "Nahum" },
  { id: "HAB", name: "HABAKKUK", realName: "Habakkuk" },
  { id: "ZEP", name: "ZEPHANIAH", realName: "Zephaniah" },
  { id: "HAG", name: "HAGGAI", realName: "Haggai" },
  { id: "ZEC", name: "ZECHARIAH", realName: "Zechariah" },
  { id: "MAL", name: "MALACHI", realName: "Malachi" },
  { id: "MAT", name: "MATTHEW", realName: "Matthew" },
  { id: "MRK", name: "MARK", realName: "Mark" },
  { id: "LUK", name: "LUKE", realName: "Luke" },
  { id: "JHN", name: "JOHN", realName: "John" },
  { id: "ACT", name: "ACTS", realName: "Acts" },
  { id: "ROM", name: "ROMANS", realName: "Romans" },
  { id: "1CO", name: "1 CORINTHIANS", realName: "1 Corinthians" },
  { id: "2CO", name: "2 CORINTHIANS", realName: "2 Corinthians" },
  { id: "GAL", name: "GALATIANS", realName: "Galatians" },
  { id: "EPH", name: "EPHESIANS", realName: "Ephesians" },
  { id: "PHP", name: "PHILIPPIANS", realName: "Philippians" },
  { id: "COL", name: "COLOSSIANS", realName: "Colossians" },
  { id: "1TH", name: "1 THESSALONIANS", realName: "1 Thessalonians" },
  { id: "2TH", name: "2 THESSALONIANS", realName: "2 Thessalonians" },
  { id: "1TI", name: "1 TIMOTHY", realName: "1 Timothy" },
  { id: "2TI", name: "2 TIMOTHY", realName: "2 Timothy" },
  { id: "TIT", name: "TITUS", realName: "Titus" },
  { id: "PHM", name: "PHILEMON", realName: "Philemon" },
  { id: "HEB", name: "HEBREWS", realName: "Hebrews" },
  { id: "JAS", name: "JAMES", realName: "James" },
  { id: "1PE", name: "1 PETER", realName: "1 Peter" },
  { id: "2PE", name: "2 PETER", realName: "2 Peter" },
  { id: "1JN", name: "1 JOHN", realName: "1 John" },
  { id: "2JN", name: "2 JOHN", realName: "2 John" },
  { id: "3JN", name: "3 JOHN", realName: "3 John" },
  { id: "JUD", name: "JUDE", realName: "Jude" },
  { id: "REV", name: "REVELATION", realName: "Revelation" },
];

function getBookNameById(id) {
  const book = bibleBooks.find((b) => b.id === id);
  return book ? book.realName : null;
}

/**
 * Splits a string into an array of { text, type } chunks,
 * where type === 'citation' for each individual parenthetical ref,
 * and 'plain' for everything else.
 *
 * @param {string} text - The text to split
 * @param {string} currentBookId - Current book ID (e.g., "GEN") for self-reference detection
 * @param {number} currentChapter - Current chapter number for self-reference detection
 */
function splitWithCitations(text, currentBookId = null, currentChapter = null) {
  // very loose pre-split on parens:
  const citationRE = /\([^)]*\)/g;

  const hasDigit = (s) => /\d/.test(s);

  // our Five citation‐formats:
  // 1) BookName[.] Chapter:Verse[-Verse][ note/notes]
  // 2) BookName[.] Chapter:Verse[-Verse][ note/notes],[ note/notes]
  // 3) pure numeric Chapter:Verse[-Verse]
  // 4) v. N or vv. N–N (with optional " note" or " notes")
  // 5) bare BookName[.]
  const validRefRE = new RegExp(
    [
      // 1) e.g. "John 1:3", "1 Kings 4:12–14", "Ps. 102:25–27", "John 1:3 notes"
      "^(?:[1-3]\\s+)?[A-Za-z]+\\.?\\s*\\d+:\\d+(?:[-–]\\d+)?(?:\\s+(?:and\\s+)?notes?)?$",

      // 2) e.g. "John 1:3", "1 Kings 4:12–14", "Ps. 102:25–27, 28"
      "^(?:[1-3]\\s+)?[A-Za-z]+\\.?\\s*\\d+:\\d+" +
        "(?:[-–]\\d+)?" +
        "(?:,\\s*(?:\\d+:)?\\d+(?:[-–]\\d+)?)*" +
        "(?:\\s+(?:and\\s+)?notes?)?$",

      // 3) pure numeric "43:10" or "3:1–6"
      "^\\d+:\\d+(?:[-–]\\d+)?" +
        "(?:,\\s*(?:\\d+:)?\\d+(?:[-–]\\d+)?)*" +
        "(?:\\s+(?:and\\s+)?notes?)?$",

      // 4) v./vv. shorthand "(v. 8)", "(vv. 1–16)", "(vv. 14-20 notes)"
      "^vv?\\.\\s*\\d+(?:[-–]\\d+)?" +
        "(?:,\\s*(?:\\d+:)?\\d+(?:[-–]\\d+)?)*" +
        "(?:\\s+(?:and\\s+)?notes?)?$",

      // 5) bare book only: "(John)", "(1 Kings)", "(Ps.)"
      "^(?:[1-3]\\s+)?[A-Za-z]+\\.?(?:\\s+(?:and\\s+)?notes?)?$",

      // 6) Cross-chapter range: "21:1–22:5" (chapter:verse–chapter:verse)
      "^\\d+:\\d+[-–]\\d+:\\d+(?:\\s+(?:and\\s+)?notes?)?$",

      // 7) Book + Chapter only: "Lev. 25", "Gen 1", "1 Kings 2"
      "^(?:[1-3]\\s+)?[A-Za-z]+\\.?\\s+\\d+$",
    ].join("|"),
    "i"
  );

  const getTheLettersOnly = new RegExp(["^(?:[1-3]\\s+)?[A-Za-z]+\\.?$"]);

  // NEW: Pattern to detect "Book Chapter" format WITHOUT verse (e.g., "Gen 1", "1 Kings 2")
  // These should NOT be treated as clickable citations
  const bookChapterOnlyRE = /^(?:[1-3]\s+)?[A-Za-z]+\.?\s+\d+$/i;

  // Helper to check if text is a "Book Chapter" pattern (should be plain, not citation)
  const isBookChapterOnly = (s) => bookChapterOnlyRE.test(s.trim());

  // helper: does this alpha‐prefix match any book?
  function looksLikeBook(prefix) {
    const norm = prefix
      .toUpperCase()
      .replace(/\.$/, "")
      .replaceAll(",", "")
      .trim();

    // reject too-short alpha chunks outright
    if (norm.length < 2) return false;

    return bibleBooks.some(
      (b) => b.id === norm || b.name.startsWith(norm) || b.name.includes(norm)
    );
  }

  // Helper: extract book ID from plain text context like "in Leviticus" or "from Genesis"
  // Returns the book ID if found, null otherwise
  function extractContextBookFromText(plainText) {
    if (!plainText) return null;

    // Patterns that indicate a book context: "in Book", "from Book", "see Book", "Book says"
    // Also matches standalone book names at end of text before citations
    const contextPatterns = [
      /\b(?:in|from|see|cf\.|cf)\s+((?:[1-3]\s+)?[A-Za-z]+)\.?\s*$/i, // "in Leviticus" at end
      /\b((?:[1-3]\s+)?[A-Za-z]+)\s+(?:says|states|records|describes)\b/i, // "Leviticus says"
      /\b(?:and|or)\s+((?:[1-3]\s+)?[A-Za-z]+)\s*$/i, // "and Deuteronomy" at end
    ];

    for (const pattern of contextPatterns) {
      const match = plainText.match(pattern);
      if (match) {
        const bookName = match[1].trim();
        // Verify it's actually a book name
        const norm = bookName.toUpperCase().replace(/\.$/, "").trim();
        const book = bibleBooks.find(
          (b) =>
            b.id === norm || b.name.startsWith(norm) || b.name.includes(norm)
        );
        if (book) {
          return book.id;
        }
      }
    }
    return null;
  }

  // split into plain vs "(…)" segments
  const parts = text.split(citationRE) || [];
  const matches = text.match(citationRE) || [];

  const result = [];
  let contextBook = null; // Track book context from plain text (e.g., "in Leviticus")

  for (let i = 0; i < parts.length; i++) {
    // 1) push any leading plain text
    if (parts[i]) {
      result.push({ text: parts[i], type: "plain" });
      // Check if this plain text contains a book context for subsequent citations
      const detectedBook = extractContextBookFromText(parts[i]);
      if (detectedBook) {
        contextBook = detectedBook;
      }
    }

    // 2) now handle the "(...)" that got removed by split()
    const group = matches[i];
    if (!group) continue;

    // strip the parens and trim
    const inner = group.slice(1, -1).trim();

    // Track book context within this parenthetical group
    // e.g., in "(Ex. 28:3; 35:31)", the "Ex." sets the context for "35:31"
    let groupBookContext = null;

    // Check if this contains semicolons - if so, check if all parts are valid citations
    // If all parts are valid, keep as one citation group
    if (inner.includes(";")) {
      const semiChunks = inner
        .split(";")
        .map((c) => c.trim())
        .filter(Boolean);

      // Check if first chunk has a book prefix to set context
      const firstChunk = semiChunks[0];
      const bookPrefixMatch = firstChunk.match(
        /^((?:[1-3]\s+)?[A-Za-z]+\.?)\s*\d/i
      );
      if (bookPrefixMatch) {
        const bookPart = bookPrefixMatch[1].trim();
        const normBook = bookPart.toUpperCase().replace(/\.$/, "").trim();
        const foundBook = bibleBooks.find(
          (b) =>
            b.id === normBook ||
            b.name.startsWith(normBook) ||
            b.name.includes(normBook)
        );
        if (foundBook) {
          groupBookContext = foundBook.id;
        }
      }

      // Check if all chunks are valid citations
      const allValid = semiChunks.every(
        (ch) => validRefRE.test(ch) || /^\d+:\d+/.test(ch)
      );

      if (allValid) {
        // Split into individual per-book citations so each is independently clickable
        let currentGroupBookContext = groupBookContext;
        semiChunks.forEach((ch) => {
          // Check if this chunk has a book prefix to update context
          const chunkBookMatch = ch.match(/^((?:[1-3]\s+)?[A-Za-z]+\.?)\s*\d/i);
          if (chunkBookMatch) {
            const bookPart = chunkBookMatch[1].trim();
            const normBook = bookPart.toUpperCase().replace(/\.$/, "").trim();
            const foundBook = bibleBooks.find(
              (b) =>
                b.id === normBook ||
                b.name.startsWith(normBook) ||
                b.name.includes(normBook)
            );
            if (foundBook) {
              currentGroupBookContext = foundBook.id;
            }
          }

          // Numeric-only refs (e.g., "43:10") inherit the most recent book context
          const isNumericOnly = /^\d+:\d+/.test(ch);

          result.push({
            text: `(${ch})`,
            type: "citation",
            contextBook: isNumericOnly ? currentGroupBookContext : null,
          });
        });
        continue; // Skip to next group
      }
    }

    // If not a simple semicolon-separated citation group, process chunks individually
    const chunks = inner
      .split(";")
      .map((chunk) => chunk.trim())
      .filter(Boolean);

    chunks.forEach((chunk) => {
      // 🚫 No numbers => never a citation
      if (!hasDigit(chunk)) {
        result.push({ text: `(${chunk})`, type: "plain" });
        return;
      }

      // Handle "cf" prefix: strip for validation, keep in display
      // Matches: "cf Rom. 5:12-21", "cf. Gen 1:1", "cf vv. 1-3"
      const cfMatch = chunk.match(/^(cf\.?\s*)(.+)$/i);
      const cfPrefix = cfMatch ? cfMatch[1] : "";
      const chunkWithoutCf = cfMatch ? cfMatch[2].trim() : chunk;

      let flag = chunk.includes("cf");

      if (chunk.includes(",") && !validRefRE.test(chunk) && !flag) {
        let splitParts = chunk.split(",").map((c) => c.trim());

        if (splitParts.length > 2) {
          for (let i = 0; i < splitParts.length - 1; i++) {
            if (looksLikeBook(splitParts[i])) {
              if (validRefRE.test(splitParts[i] + splitParts[i + 1])) {
                result.push({
                  text: `(${splitParts[i] + ". " + splitParts[i + 1]})`,
                  type: "citation",
                });
              } else {
                if (validRefRE.test(splitParts[i])) {
                  result.push({ text: `(${splitParts[i]})`, type: "citation" });
                } else {
                  // anything else remains plain
                  result.push({ text: `(${splitParts[i]})`, type: "plain" });
                }
              }
            } else {
              // test validity
              if (getTheLettersOnly.test(splitParts[i])) {
                if (
                  validRefRE.test(splitParts[i]) &&
                  looksLikeBook(splitParts[i])
                ) {
                  result.push({ text: `(${splitParts[i]})`, type: "citation" });
                } else {
                  // anything else remains plain
                  result.push({ text: `(${splitParts[i]})`, type: "plain" });
                }
              } else {
                if (validRefRE.test(splitParts[i])) {
                  result.push({ text: `(${splitParts[i]})`, type: "citation" });
                } else {
                  // anything else remains plain
                  result.push({ text: `(${splitParts[i]})`, type: "plain" });
                }
              }
            }
          }
        } else {
          splitParts.forEach((ref) => {
            const wrapped = `(${ref})`;
            // test validity
            if (getTheLettersOnly.test(ref)) {
              if (validRefRE.test(ref) && looksLikeBook(ref)) {
                result.push({ text: wrapped, type: "citation" });
              } else {
                // anything else remains plain
                result.push({ text: wrapped, type: "plain" });
              }
            } else {
              if (validRefRE.test(ref)) {
                result.push({ text: wrapped, type: "citation" });
              } else {
                // anything else remains plain
                result.push({ text: wrapped, type: "plain" });
              }
            }
          });
        }
      } else if (chunk.includes(".") && !validRefRE.test(chunk) && flag) {
        let splitParts = chunk
          .split(".")
          .map((c) => c.trim())
          .filter(Boolean);

        if (splitParts.length > 2) {
          for (let i = 0; i < splitParts.length - 1; i++) {
            if (looksLikeBook(splitParts[i])) {
              if (validRefRE.test(splitParts[i] + splitParts[i + 1])) {
                result.push({
                  text: `(${splitParts[i] + ". " + splitParts[i + 1]})`,
                  type: "citation",
                });
              } else {
                if (validRefRE.test(splitParts[i])) {
                  result.push({ text: `(${splitParts[i]})`, type: "citation" });
                } else {
                  // anything else remains plain
                  result.push({ text: `(${splitParts[i]})`, type: "plain" });
                }
              }
            } else {
              // test validity
              if (getTheLettersOnly.test(splitParts[i])) {
                if (
                  validRefRE.test(splitParts[i]) &&
                  looksLikeBook(splitParts[i])
                ) {
                  result.push({ text: `(${splitParts[i]})`, type: "citation" });
                } else {
                  // anything else remains plain
                  result.push({ text: `(${splitParts[i]})`, type: "plain" });
                }
              } else {
                if (validRefRE.test(splitParts[i])) {
                  result.push({ text: `(${splitParts[i]})`, type: "citation" });
                } else {
                  // anything else remains plain
                  result.push({ text: `(${splitParts[i]})`, type: "plain" });
                }
              }
            }
          }
        } else {
          splitParts.forEach((ref) => {
            const wrapped = `(${ref})`;
            // test validity
            if (getTheLettersOnly.test(ref)) {
              if (validRefRE.test(ref) && looksLikeBook(ref)) {
                result.push({ text: wrapped, type: "citation" });
              } else {
                // anything else remains plain
                result.push({ text: wrapped, type: "plain" });
              }
            } else {
              if (validRefRE.test(ref)) {
                result.push({ text: wrapped, type: "citation" });
              } else {
                // anything else remains plain
                result.push({ text: wrapped, type: "plain" });
              }
            }
          });
        }
      } else {
        // test validity
        // Handle "Book Chapter" patterns (e.g., "Lev. 25", "Gen 1", "cf Gen 1")
        // These ARE valid citations if they reference a DIFFERENT book
        // If it's the SAME book (and optionally same chapter), output as plain text
        if (isBookChapterOnly(chunkWithoutCf)) {
          // Extract the book part and chapter number (from chunkWithoutCf)
          const bookPartMatch = chunkWithoutCf.match(
            /^((?:[1-3]\s+)?[A-Za-z]+\.?)\s*(\d+)?$/i
          );
          if (bookPartMatch && looksLikeBook(bookPartMatch[1])) {
            // Get the book ID from the reference
            const refBookNorm = bookPartMatch[1]
              .toUpperCase()
              .replace(/\.$/, "")
              .trim();
            const refBook = bibleBooks.find(
              (b) =>
                b.id === refBookNorm ||
                b.name.startsWith(refBookNorm) ||
                b.name.includes(refBookNorm)
            );
            const refBookId = refBook ? refBook.id : null;
            const refChapter = bookPartMatch[2]
              ? parseInt(bookPartMatch[2], 10)
              : null;

            // Check if this is a self-reference (same book AND same chapter)
            const isSameBook =
              refBookId && currentBookId && refBookId === currentBookId;
            const isSameChapter =
              refChapter === null ||
              (currentChapter && refChapter === currentChapter);
            const isSelfReference = isSameBook && isSameChapter;

            if (isSelfReference) {
              // Self-reference: output as plain text WITHOUT parentheses
              result.push({ text: chunk, type: "plain" });
            } else {
              // Cross-reference: output as citation
              result.push({ text: `(${chunk})`, type: "citation" });
            }
          } else {
            result.push({ text: chunk, type: "plain" }); // Unknown book, no parens
          }
        } else if (getTheLettersOnly.test(chunkWithoutCf)) {
          // Bare alpha → only a citation if it's a real book (John, Ps., 1 Kings, etc.)
          if (
            validRefRE.test(chunkWithoutCf) &&
            looksLikeBook(chunkWithoutCf)
          ) {
            result.push({ text: `(${chunk})`, type: "citation" });
          } else {
            result.push({ text: `(${chunk})`, type: "plain" });
          }
        } else {
          // Mixed/numeric forms still rely on validRefRE
          // For numeric-only refs, use groupBookContext first, then contextBook from preceding plain text
          // Use chunkWithoutCf for validation, chunk for display
          if (validRefRE.test(chunkWithoutCf)) {
            // Check if this has a book prefix - if so, extract and set groupBookContext
            const bookPrefixMatch = chunkWithoutCf.match(
              /^((?:[1-3]\s+)?[A-Za-z]+\.?)\s*\d/i
            );
            if (bookPrefixMatch) {
              const bookPart = bookPrefixMatch[1].trim();
              const normBook = bookPart.toUpperCase().replace(/\.$/, "").trim();
              const foundBook = bibleBooks.find(
                (b) =>
                  b.id === normBook ||
                  b.name.startsWith(normBook) ||
                  b.name.includes(normBook)
              );
              if (foundBook) {
                groupBookContext = foundBook.id;
              }
            }

            // Check if this is a numeric-only citation (no book prefix)
            const isNumericOnly = /^\d+:\d+/.test(chunkWithoutCf);
            // Priority: groupBookContext (from first ref in group) > contextBook (from plain text) > null
            const effectiveContext = isNumericOnly
              ? groupBookContext || contextBook
              : null;

            result.push({
              text: `(${chunk})`,
              type: "citation",
              contextBook: effectiveContext,
            });
          } else {
            result.push({ text: `(${chunk})`, type: "plain" });
          }
        }
      }
    });
  }

  // Post-processing: Merge standalone "(cf)" or "(cf.)" with following citation
  // Handles cases where source has "(cf) (Rom. 5:12)" as separate elements
  const mergedResult = [];
  for (let i = 0; i < result.length; i++) {
    const current = result[i];
    const next = result[i + 1];

    // Check if current is a standalone cf (plain text, content is just "cf" variants)
    const isCfOnly =
      current.type === "plain" && /^\(cf\.?\)$/i.test(current.text);

    if (isCfOnly && next && next.type === "citation") {
      // Merge: add "cf " to the beginning of the next citation
      const citationInner = next.text.slice(1, -1); // Remove parens
      mergedResult.push({
        ...next,
        text: `(cf ${citationInner})`,
      });
      i++; // Skip the next item since we merged it
    } else {
      mergedResult.push(current);
    }
  }

  return mergedResult;
}

/**
 * Detects numbered lists in text and splits content into segments.
 * A list is detected when 3+ sequential numbered items starting from 1 are found.
 *
 * @param {string} text - The text to analyze
 * @returns {Array<{type: 'text' | 'list', content?: string, items?: string[]}>}
 */
function detectAndSplitLists(text) {
  if (!text || typeof text !== "string")
    return [{ type: "text", content: text || "" }];

  // First, find where "1. " occurs (the start of a potential list)
  // Look for "1. " that's at start, after whitespace, or after punctuation like ": "
  const listStartPattern = /(?:^|[\s:])1\.\s+/g;

  let listStartMatch = null;
  let listStartIndex = -1;

  // Find a valid list start
  while ((listStartMatch = listStartPattern.exec(text)) !== null) {
    // The actual "1. " starts after any preceding char
    const matchText = listStartMatch[0];
    const leadingChars = matchText.match(/^[\s:]+/);
    const offset = leadingChars ? leadingChars[0].length : 0;
    listStartIndex = listStartMatch.index + offset;

    // Now verify we have 2, 3, 4... following
    const textFromHere = text.slice(listStartIndex);
    const allItemsPattern = /(\d+)\.\s+/g;
    const matches = [...textFromHere.matchAll(allItemsPattern)];

    if (matches.length >= 3) {
      const numbers = matches.map((m) => parseInt(m[1], 10));

      // Check if starts with 1 and is sequential
      if (numbers[0] === 1) {
        // Find the longest sequential run starting from 1
        let seqLength = 1;
        for (let i = 1; i < numbers.length; i++) {
          if (numbers[i] === numbers[i - 1] + 1) {
            seqLength++;
          } else {
            break;
          }
        }

        if (seqLength >= 3) {
          // We have a valid list!
          const result = [];

          // Add text before the list
          if (listStartIndex > 0) {
            const beforeText = text.slice(0, listStartIndex).trim();
            if (beforeText) {
              result.push({ type: "text", content: beforeText });
            }
          }

          // Extract list items (only the sequential ones)
          const items = [];
          for (let i = 0; i < seqLength; i++) {
            const currentMatch = matches[i];
            const nextMatch = matches[i + 1];

            const startIdx = currentMatch.index + currentMatch[0].length;
            // If next match is part of sequence, use its index; otherwise use text length
            const endIdx =
              i + 1 < seqLength && nextMatch
                ? nextMatch.index
                : nextMatch
                  ? nextMatch.index
                  : textFromHere.length;

            const itemContent = textFromHere.slice(startIdx, endIdx).trim();
            if (itemContent) {
              items.push(itemContent);
            }
          }

          if (items.length >= 3) {
            result.push({ type: "list", items });

            // Add any text after the list
            const lastSeqMatch = matches[seqLength - 1];
            const lastItemEnd = lastSeqMatch.index + lastSeqMatch[0].length;
            // Find where the last item actually ends
            const nextNonSeqMatch = matches[seqLength];
            const afterListStart = nextNonSeqMatch
              ? nextNonSeqMatch.index
              : textFromHere.length;

            // Text after the list (from end of last item content to end)
            // This is already included in the last item, so check if there's trailing content
            const afterText = textFromHere.slice(afterListStart).trim();
            if (afterText && seqLength < matches.length) {
              result.push({ type: "text", content: afterText });
            }

            return result;
          }
        }
      }
    }
  }

  // No valid list found
  return [{ type: "text", content: text }];
}

function parseCitationReferences(citation, defaultBookId, contextChapter) {
  // remove surrounding parens
  let inner = citation.slice(1, -1).trim();

  // Strip "cf" or "cf." prefix if present (e.g., "cf Rom. 5:12" -> "Rom. 5:12")
  inner = inner.replace(/^cf\.?\s*/i, "").trim();

  // NEW: robust v./vv. parser with "note", "notes", and "and note"
  // Examples:
  //  "v. 5"
  //  "vv. 1–3, 7, 9-11"
  //  "vv. 29, 30 note."
  //  "v. 5 and note"
  //  "vv. 14-20 notes"
  const vvMatch = inner.match(
    /^vv?\.\s*([^()]*?)(?:\s+(and\s+notes?|notes?)\.?)?$/i
  );
  if (vvMatch) {
    const itemsStr = vvMatch[1].trim(); // e.g., "1–3, 7, 9-11" or "29, 30" or "5" or "14-20"
    const tail = (vvMatch[2] || "").toLowerCase(); // "", "note", "notes", or "and note"
    const wantNote = tail.includes("note"); // true for "note", "notes", or "and note"
    const wantBible = tail === "" || tail.startsWith("and"); // empty or "and note"/"and notes"
    const chapter = Number(contextChapter) || 1;

    // split on commas, normalize dashes, trim each token
    const tokens = itemsStr
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const baseRanges = [];
    for (const raw of tokens) {
      const tok = raw.replace(/[\u2013\u2014]/g, "-"); // normalize –— to -
      const mRange = tok.match(/^(\d+)\s*-\s*(\d+)$/);
      if (mRange) {
        const a = Number(mRange[1]),
          b = Number(mRange[2]);
        baseRanges.push({
          verseStart: Math.min(a, b),
          verseEnd: Math.max(a, b),
        });
        continue;
      }
      const mSingle = tok.match(/^(\d+)$/);
      if (mSingle) {
        const v = Number(mSingle[1]);
        baseRanges.push({ verseStart: v, verseEnd: v });
      }
      // silently ignore non-matching tokens
    }

    // If nothing parsed, fall back safely to v1
    if (!baseRanges.length) {
      baseRanges.push({ verseStart: 1, verseEnd: 1 });
    }

    const out = [];
    for (const r of baseRanges) {
      if (wantBible) {
        out.push({
          bookId: defaultBookId,
          chapter,
          verseStart: r.verseStart,
          verseEnd: r.verseEnd,
          source: "bible",
        });
      }
      if (wantNote) {
        out.push({
          bookId: defaultBookId,
          chapter,
          verseStart: r.verseStart,
          verseEnd: r.verseEnd,
          source: "study-note",
        });
      }
    }
    return out;
  }

  // Accepts things like: "Is. 6:8 note", "1:3-31 note", "3:1–6, 9 note", "2:4 and note"
  // Works only if "note" (or "and note") is present. Book prefix optional.
  // If no chapter is given in a segment, uses the most recent one in that citation,
  // falling back to contextChapter.

  if (/\b(and\s+notes?|notes?)\b\.?$/i.test(inner)) {
    // capture optional book prefix, the rest of the ref list, and trailing "note"/"notes"/"and note"
    const m = inner.match(
      /^\s*((?:[1-3]\s+)?[A-Za-z]+\.?)?\s*(.*?)\s*(and\s+notes?|notes?)\.?$/i
    );
    if (!m) return null;
    console.log(m);

    const bookPrefix = (m[1] || "").trim(); // e.g., "Is." or "Isaiah" or ""
    const refsStr = (m[2] || "").trim(); // e.g., "6:8", "1:3-31", "3:1–6, 9"
    const tail = m[3].toLowerCase(); // "note" | "notes" | "and note" | "and notes"

    // resolve book id (if no prefix, stick to defaultBookId)
    const bookId = bookPrefix
      ? getBookIdFromCitation(`(${bookPrefix})`, defaultBookId)
      : defaultBookId;

    console.log("note bookId: ", bookId, bookPrefix);

    const wantNote = true; // always when this parser is used
    const wantBible = tail.startsWith("and"); // include bible too only for "and note"/"and notes"

    // split items on commas/semicolons
    const parts = refsStr
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter(Boolean);

    let currentChapter = Number(contextChapter) || 1; // rolling chapter memory
    const ranges = [];

    for (const raw of parts) {
      const tok = raw.replace(/[\u2013\u2014]/g, "-"); // normalize –— to -
      // full "C:V" or "C:V-V"
      let mm = tok.match(/^(\d+):(\d+)(?:\s*-\s*(\d+))?$/);
      if (mm) {
        currentChapter = Number(mm[1]);
        const vs = Number(mm[2]);
        const ve = mm[3] ? Number(mm[3]) : vs;
        ranges.push({
          chapter: currentChapter,
          verseStart: Math.min(vs, ve),
          verseEnd: Math.max(vs, ve),
        });
        continue;
      }
      // verse-only "V" or "V-V" (use currentChapter)
      mm = tok.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
      if (mm) {
        const vs = Number(mm[1]);
        const ve = mm[2] ? Number(mm[2]) : vs;
        ranges.push({
          chapter: currentChapter,
          verseStart: Math.min(vs, ve),
          verseEnd: Math.max(vs, ve),
        });
        continue;
      }
      // ignore anything else silently
    }

    if (!ranges.length) {
      ranges.push({
        chapter: Number(contextChapter) || 1,
        verseStart: 1,
        verseEnd: 1,
      });
    }

    const out = [];
    for (const r of ranges) {
      if (wantBible) {
        out.push({
          bookId,
          chapter: r.chapter,
          verseStart: r.verseStart,
          verseEnd: r.verseEnd,
          source: "bible",
        });
      }
      if (wantNote) {
        out.push({
          bookId,
          chapter: r.chapter,
          verseStart: r.verseStart,
          verseEnd: r.verseEnd,
          source: "study-note",
        });
      }
    }
    console.log("output: ", out);
    return out;
  }

  // Check for cross-chapter range: "21:1–22:5" (chapter:verse–chapter:verse)
  const crossChapterMatch = inner.match(/^(\d+):(\d+)[-–](\d+):(\d+)$/);
  if (crossChapterMatch) {
    const ch1 = +crossChapterMatch[1];
    const v1 = +crossChapterMatch[2];
    const ch2 = +crossChapterMatch[3];
    const v2 = +crossChapterMatch[4];

    // For cross-chapter ranges, we'll return references for each chapter in the range
    const out = [];
    for (let ch = ch1; ch <= ch2; ch++) {
      const startVerse = ch === ch1 ? v1 : 1;
      // For end verse, we'd need to know the chapter length,
      // so for intermediate chapters we use a high number (will be clamped by data)
      const endVerse = ch === ch2 ? v2 : 999;
      out.push({
        bookId: defaultBookId,
        chapter: ch,
        verseStart: startVerse,
        verseEnd: endVerse,
        source: "bible",
      });
    }
    return out;
  }

  // Check for "Book Chapter" format (e.g., "Lev. 25", "Gen 1")
  // Returns all verses from the specified chapter
  const bookChapterMatch = inner.match(/^((?:[1-3]\s+)?[A-Za-z]+\.?)\s+(\d+)$/);
  if (bookChapterMatch) {
    const bookPart = bookChapterMatch[1];
    const chapter = +bookChapterMatch[2];
    const bookId = getBookIdFromCitation(`(${bookPart})`, defaultBookId);
    return [
      {
        bookId,
        chapter,
        verseStart: 1,
        verseEnd: 999, // Will be clamped by actual chapter length when fetching
        source: "bible",
      },
    ];
  }

  // 1) detect & consume the book‐prefix
  //    e.g. "1 Kings", "Ps.", "John"
  const bookMatch = inner.match(/^(?:[1-3]\s+)?[A-Za-z]+\.?/);
  let bookId = defaultBookId;
  let rest = inner;
  if (bookMatch) {
    const bookPart = bookMatch[0];
    bookId = getBookIdFromCitation(`(${bookPart})`, defaultBookId);
    rest = inner.slice(bookPart.length).trim();
  }

  // 2) now rest should look like "102:25–27, 28" or "1:1–3; 3:5"
  //    split on semicolons → each group may span multiple verses separated by commas
  const groups = rest
    .split(";")
    .map((g) => g.trim())
    .filter(Boolean);

  const out = [];

  groups.forEach((group) => {
    // group might be "102:25–27, 28" or "1:1–3"
    // split on commas:
    const parts = group
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    // we keep track of the “current chapter” from the first full part
    let currentChapter = null;

    parts.forEach((part) => {
      // part can be "102:25–27" or "28" or "1:5–6"
      const fullRef = part.match(/^(\d+):(\d+)(?:[-–](\d+))?$/);
      if (fullRef) {
        // chapter:verse[-verse]
        currentChapter = +fullRef[1];
        const start = +fullRef[2];
        const end = fullRef[3] ? +fullRef[3] : start;
        out.push({
          bookId,
          chapter: currentChapter,
          verseStart: start,
          verseEnd: end,
          source: "bible",
        });
      } else {
        // maybe just a verse number, e.g. "28" → use currentChapter
        const vOnly = part.match(/^(\d+)(?:[-–](\d+))?$/);
        if (vOnly && currentChapter != null) {
          const start = +vOnly[1];
          const end = vOnly[2] ? +vOnly[2] : start;
          out.push({
            bookId,
            chapter: currentChapter,
            verseStart: start,
            verseEnd: end,
            source: "bible",
          });
        }
      }
    });
  });

  return out;
}

function getBookIdFromCitation(citation, defaultBookId) {
  // citation is like "(John 1:3)" or "(1 Kings 4:12–14)"
  const inner = citation.slice(1, -1).trim();
  // match either “1 Kings” or “John” at the start
  const m = inner.match(/^(?:[1-3]\s+[A-Za-z]+|[A-Za-z]+)\.?/);
  if (!m) return defaultBookId;
  const prefix = m[0].replace(/\.$/, "").toUpperCase();
  const found = bibleBooks.find(
    (b) => b.id === prefix || b.name.startsWith(prefix)
  );
  return found ? found.id : defaultBookId;
}

async function loadTabsData(bookId, chapter, tabId, tabData) {
  // ---------- Preflight: fetch chapter 1 to know total chapters ----------
  const preflight = new BibleDataManager({
    tabId: `preflight-${tabId}`,
    translation: "ESV",
    bookId,
    chapter: 1,
  });

  try {
    await preflight.fetch();
  } catch (e) {
    console.error(
      `[loadTabsData] Preflight fetch failed for ${bookId} ch1:`,
      e
    );
    return;
  }

  const getTotalChapters = (pf) => {
    const d = pf?.data || {};
    return d?.numberOfChapters ?? undefined;
  };

  const totalChapters = getTotalChapters(preflight);

  if (!Number.isFinite(totalChapters) || totalChapters <= 0) {
    console.warn(
      `[loadTabsData] Could not determine total chapters for ${bookId}. Data shape:`,
      preflight?.data
    );
    RemoveTab(tabId);
    return;
  }

  if (!Number.isFinite(chapter) || chapter < 1 || chapter > totalChapters) {
    console.warn(
      `[loadTabsData] Requested chapter ${chapter} is out of range for ${bookId} (1..${totalChapters}).`
    );
    RemoveTab(tabId);
    return;
  }

  // ---------- Main load: reuse preflight if chapter === 1 ----------
  const bible =
    chapter === 1
      ? preflight
      : new BibleDataManager({
          tabId,
          translation: "ESV",
          bookId,
          chapter,
        });

  if (chapter !== 1) {
    try {
      await bible.fetch();
    } catch (e) {
      console.error(
        `[loadTabsData] Fetch failed for ${bookId} ch${chapter}:`,
        e
      );
      RemoveTab(tabId);
      return;
    }
  }

  // ---------- After fetch ----------
  globalThis.BookId = bible.bookId;

  const { data, loading, error } = bible.getState();
  if (error) {
    console.error(
      `[loadTabsData] State has error for ${bookId} ch${chapter}:`,
      error
    );
    RemoveTab(tabId);
    return;
  }

  console.log(data, "the data loaded");

  const customeTabData = {
    id: tabId,
    data: {
      ...tabData,
      ...data,
    },
    taken: false,
  };

  UpdateTab(customeTabData);
  SetActiveTab(tabId);

  globalThis.GlobalChapter = (bible.data?.chapter ?? chapter) - 1;

  if (globalThis.studyNotesPresent) {
    UpdateApplication(globalThis.STUDYNOTES_PANEL_ID, {
      App: (
        <StudyNotes
          id={globalThis.STUDYNOTES_PANEL_ID}
          chapter={globalThis.GlobalChapter}
        />
      ),
      to: "panel",
    });
  }
}

// Fetch the study-note chapter for (bookId, chapter) — no caching, just fetch.
function fetchStudyNoteByBookChapter(bookId, chapter) {
  if (!bookId || !chapter) return;
  const mainBot = getBot("system", "studyNote.main");
  const url =
    mainBot?.tags[bookId] ??
    mainBot?.tags[String(bookId).toUpperCase()] ??
    null;
  if (!url) return; // no notes for this book
  try {
    os.getFile(url);
  } catch {
    /* ignore */
  }
}

/**
 * Peek previous & next using CurrentBibleObject.
 * We call openPrevious() then immediately openNext() to restore,
 * then openNext() and immediately openPrevious() to restore.
 * We read `res.data.{bookId,chapter}` from each call and fetch the note.
 */
async function prefetchNeighborsViaCurrentBibleObject() {
  const bible = globalThis.CurrentBibleObject || null;
  if (!bible) return;

  // --- Peek PREVIOUS ---
  let prevData = null;
  try {
    await bible.openPrevious(); // navigate to previous
    console.log("previous response: ", bible.data);
    prevData = bible.data;
    console.log("prevData: ", prevData);
  } catch {}

  if (prevData?.bookId && prevData?.chapter) {
    console.log(
      "prevData?.bookId: ",
      prevData?.bookId,
      " prevData?.chapter: ",
      prevData?.chapter
    );
    fetchStudyNoteByBookChapter(prevData.bookId, prevData.chapter);
  }

  // --- Peek NEXT ---
  let nextData = null;
  try {
    await bible.openNext(); // navigate to next
    console.log("next response: ", bible.data);
    nextData = bible.data;
    console.log("nextData: ", nextData);
  } catch {}

  if (nextData?.bookId && nextData?.chapter) {
    console.log(
      "nextData?.bookId: ",
      nextData?.bookId,
      " nextData?.chapter: ",
      nextData?.chapter
    );
    fetchStudyNoteByBookChapter(nextData.bookId, nextData.chapter);
  }
}

function StudyNotesWithoutWrap({ chapter, onStudyNoteChange }) {
  // Get extension bot for state management
  const mainBot = getBot("system", "studyNote.main");

  const bookId = globalThis.BookId;
  const currentChapter = chapter + 1;
  const [studyNote, setStudyNote] = useState([]);

  const [pageLoading, setPageLoading] = useState(true);
  const [showSpinner, setShowSpinner] = useState(false);

  const [sectionMap, setSectionMap] = useState({});
  const [citationData, setCitationData] = useState([]);
  const [nextCitationData, setNextCitationData] = useState([]);

  const containerRef = useRef(null);

  // —— New state for cycling through matches ——
  const [searchKey, setSearchKey] = useState(null);
  const [matches, setMatches] = useState([]);
  const [pointer, setPointer] = useState(0);
  const [highlightedPos, setHighlightedPos] = useState(null);

  //popup citation
  const [popup, setPopup] = useState(null);
  const [nextPopup, setNextPopup] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [canBeClosed, setCanBeClosed] = useState(false);

  // --- NEW: hover + loading control ---
  const [isLoading, setIsLoading] = useState(false);
  const hideTimerRef = useRef(null);
  const overPopupRef = useRef(false);
  const overCitationRef = useRef(false);
  const currentReqIdRef = useRef(0);
  const contextChapterRef = useRef(0);
  const hoverOpenTimerRef = useRef(null);
  const hoverTokenRef = useRef(0);

  // --- Back FAB fade-out control ---
  const [showBackFab, setShowBackFab] = useState(
    !!mainBot?.tags.previousTab?.tabId
  );
  const [backFabFading, setBackFabFading] = useState(false);
  const [backFabHovering, setBackFabHovering] = useState(false);

  const [lastDismissReason, setLastDismissReason] = useState("none");

  const [backFabAppearing, setBackFabAppearing] = useState(false);

  const appearCleanupTimerRef = useRef(null);
  const backFadeTimerRef = useRef(null); // waits 3s then starts fade
  const backCleanupTimerRef = useRef(null); // waits for CSS transition, then clears tag

  useEffect(() => {
    prefetchNeighborsViaCurrentBibleObject();
  }, [chapter, bookId]);

  function clearAppearTimer() {
    if (appearCleanupTimerRef.current) {
      clearTimeout(appearCleanupTimerRef.current);
      appearCleanupTimerRef.current = null;
    }
  }

  function clearBackTimers() {
    if (backFadeTimerRef.current) {
      clearTimeout(backFadeTimerRef.current);
      backFadeTimerRef.current = null;
    }
    if (backCleanupTimerRef.current) {
      clearTimeout(backCleanupTimerRef.current);
      backCleanupTimerRef.current = null;
    }
  }

  function clearHideTimer() {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }

  function scheduleHide() {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      // Only close if mouse is not over citation nor popup
      if (!overPopupRef.current && !overCitationRef.current) {
        handleClose();
      }
    }, 1500); // 1.5s as requested
  }

  function handleClose() {
    setShowModal(false);
    currentReqIdRef.current++; // cancel pending results
    setTimeout(() => {
      setPopup(null);
      // keep citationData; doesn’t hurt, but you can clear if you prefer
    }, 200);
  }

  globalThis.HandleClosePopup = handleClose;

  // ref to the currently highlighted verse DOM node
  const scrollRef = useRef(null);

  async function extractFromStudyNote({
    bookId,
    chapter,
    verseStart,
    verseEnd,
  }) {
    let newBookId = bookId;
    let current_note = null;
    console.log("start fetching study note: ", newBookId);
    if (globalThis.BookId !== newBookId || chapter !== currentChapter) {
      console.log("start fetching study note");
      const mainBot = getBot("system", "studyNote.main");
      const studyNoteDataURL = mainBot?.tags[newBookId.toUpperCase()] ?? null;
      console.log(studyNoteDataURL);
      if (studyNoteDataURL) {
        console.log("attempting to fetch the note...");
        const studyNoteData = await os.getFile(studyNoteDataURL);
        console.log("studyNoteData: ", studyNoteData);
        current_note = [studyNoteData[chapter - 1]] || [];
      }
    }

    const noteBook = current_note
      ? (current_note[0] ?? studyNote[0] ?? [])
      : (studyNote[0] ?? []);
    console.log("noteBook: ", noteBook);
    console.log("studyNote: ", studyNote);
    if (!noteBook?.sections?.length) {
      console.log("no sections inside the notebook!!!");
      return {
        bookId: newBookId,
        chapter,
        verseStart,
        verseEnd,
        sectionTitle: null,
        verses: [],
        source: "study-note",
      };
    }

    // Parse each section header like "3:16 Some title"
    const parsed = noteBook.sections.map((sec) => {
      const secStr = String(sec.section ?? "");
      const m = /(\d+):(\d+)(?:\s+(.*))?/.exec(secStr);
      return {
        ch: m ? Number(m[1]) : null,
        v: m ? Number(m[2]) : null,
        title: m ? (m[3] || "").trim() : "",
        content: Array.isArray(sec.content)
          ? sec.content
          : [String(sec.content ?? "")],
      };
    });

    // Only sections in the requested chapter and verse range
    const hits = parsed.filter(
      (s) =>
        s.ch === Number(chapter) &&
        s.v != null &&
        s.v >= verseStart &&
        s.v <= verseEnd
    );

    const verses = hits.map((h) => ({
      number: h.v,
      text: h.content.join(" ").trim(),
    }));

    const sectionTitle = hits[0]?.title || null;

    let output = {
      bookId: newBookId,
      chapter,
      verseStart,
      verseEnd,
      sectionTitle,
      verses,
      source: "study-note",
    };
    console.log("study note output: ", output);

    return output;
  }

  function normalizeBookId(bookId) {
    // if it starts with one or more digits followed by letters, insert a space
    return bookId.replace(/^(\d+)([A-Za-z])/, "$1 $2");
  }

  function denormalizeBookId(bookId) {
    // Remove spaces from book IDs for internal use (1 SA -> 1SA)
    return bookId.replace(/\s+/g, "");
  }

  async function fetchCitationDataForRefs(refs) {
    const reqId = ++currentReqIdRef.current;
    setIsLoading(true);
    try {
      const passages = await Promise.all(
        refs.map(async ({ bookId, chapter, verseStart, verseEnd, source }) => {
          const displayBookId = normalizeBookId(bookId); // For display in popup

          if (source === "study-note") {
            return await extractFromStudyNote({
              bookId: displayBookId,
              chapter,
              verseStart,
              verseEnd,
            });
          }

          const mgr = new BibleDataManager({
            tabId: null,
            translation: "ESV",
            bookId, // Use original bookId for BibleDataManager (1SA, 2SA, etc.)
            chapter,
          });
          await mgr.fetch();

          const section = mgr.data.content.find((sec) =>
            sec.verses.some(
              (v) => v.verseNumber >= verseStart && v.verseNumber <= verseEnd
            )
          );
          const sectionTitle = section?.heading || null;
          const allVerses = mgr.data.content.flatMap((sec) => sec.verses);

          const verses = allVerses
            .filter(
              (v) => v.verseNumber >= verseStart && v.verseNumber <= verseEnd
            )
            .map((v) => ({ number: v.verseNumber, text: v.text }));

          // Compute actual verseEnd from fetched verses (replaces 999 placeholder)
          const actualVerseEnd =
            verses.length > 0
              ? Math.max(...verses.map((v) => v.number))
              : verseEnd;

          return {
            bookId: displayBookId,
            chapter,
            verseStart,
            verseEnd: actualVerseEnd,
            sectionTitle,
            verses,
            source: source || "bible",
          };
        })
      );

      // Only commit if this is still the latest request
      if (reqId === currentReqIdRef.current) {
        setCitationData(passages);
        setIsLoading(false);
      }
    } catch (e) {
      if (reqId === currentReqIdRef.current) setIsLoading(false);
      // (optional) log error
    }
  }

  // whenever chapter changes, pull in the new notes
  useEffect(() => {
    let cancelled = false;
    const mainBot = getBot("system", "studyNote.main");

    const resetHighlights = () => {
      setSearchKey(null);
      setMatches([]);
      setPointer(0);
      setHighlightedPos(null);
    };

    const getStudyNote = async () => {
      setPageLoading(true);
      try {
        const studyNoteDataURL = mainBot?.tags[bookId] ?? null;

        if (!studyNoteDataURL) {
          if (cancelled) return;
          setStudyNote([]);
          setSectionMap({});
          globalThis.VerseSectionMap = {};
          resetHighlights();
          // Clear study note data in parent
          if (onStudyNoteChange) {
            onStudyNoteChange(null);
          }
          return;
        }

        const studyNoteData = await os.getFile(studyNoteDataURL);
        if (cancelled) return;

        const note = [studyNoteData[chapter]];
        console.log(note);
        setTagMask(mainBot, "currentStudyNote", note);
        setStudyNote(note);
        resetHighlights();

        // Expose studyNote data to parent component for editor
        if (onStudyNoteChange && note && note.length > 0) {
          onStudyNoteChange(note);
        }

        const map = {};
        (note ?? []).forEach((book, bIdx) => {
          if (book && book.sections) {
            book.sections.forEach((verse, vIdx) => {
              const raw = verse.section.toString();
              const cleaned = raw
                .replace(/\d+:\d+/g, "")
                .replace(/\./g, "")
                .replace(/\s+/g, " ")
                .trim();
              map[cleaned] = { bookIdx: bIdx, verseIdx: vIdx, original: raw };
            });
          }
        });

        if (cancelled) return;

        setSectionMap(map);
        globalThis.VerseSectionMap = map;

        window.dispatchEvent(
          new CustomEvent("sectionMapReady", { detail: map })
        );
      } catch (error) {
        if (cancelled) return;
        setStudyNote([]);
        setSectionMap({});
        globalThis.VerseSectionMap = {};
        resetHighlights();
        // Clear study note data in parent on error
        if (onStudyNoteChange) {
          onStudyNoteChange(null);
        }
      } finally {
        if (!cancelled) {
          setPageLoading(false);
        }
      }
    };

    getStudyNote();

    return () => {
      cancelled = true;
    };
  }, [chapter, bookId, onStudyNoteChange]);

  // debug/log after state actually updates
  useEffect(() => {
    console.log("📖 chapter:", chapter);
    console.log("🔄 studyNote:", studyNote);
    console.log("🔄 sectionMap:", sectionMap);
    if (chapter) {
      contextChapterRef.current = chapter;
    }
    if (containerRef.current) {
      containerRef.current.scrollIntoView({
        behavior: "auto",
        block: "start",
      });

      setTagMask(mainBot, "canHighlight", true);
      console.log("canHighlight is true now", mainBot?.tags.canHighlight);
    }
  }, [chapter, studyNote, sectionMap]);

  useEffect(() => {
    let timer;
    if (pageLoading) {
      timer = setTimeout(() => setShowSpinner(true), 2000);
    } else {
      setShowSpinner(false);
    }
    return () => clearTimeout(timer);
  }, [pageLoading]);

  // scroll **immediately** when highlight flips on
  useLayoutEffect(() => {
    if (!highlightedPos || !scrollRef.current) return;

    scrollRef.current.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });

    const timer = setTimeout(() => {
      setHighlightedPos(null);
    }, 8000);

    return () => clearTimeout(timer);
  }, [highlightedPos]);

  // unified highlight function
  const highlightSection = (rawKey) => {
    const stripRe = /[.,'"“”‘’]/g;
    const key = String(rawKey).replace(stripRe, ""); // strip dots
    let newMatches = matches;
    let newPointer = pointer;

    console.log("sent Key: ", key);

    // if brand‐new search key → rebuild matches
    if (key !== searchKey) {
      const byNumber = /^\d+$/.test(key);
      newMatches = [];

      mainBot?.tags.currentStudyNote?.forEach((book, bIdx) => {
        if (book && book.sections) {
          book.sections.forEach((verse, vIdx) => {
            if (byNumber) {
              console.log("attepmting to highlight by number: ", key);
              // match verse.section's "a:b" → compare part after ":"
              const m = /(\d+):(\d+)/.exec(verse.section.toString());
              console.log("matching: ", m);
              if (m && m[2] === key) {
                console.log("found a match!!");
                newMatches.push({ bookIdx: bIdx, verseIdx: vIdx });
              }
            } else {
              const token = verse.section.toString().replace(stripRe, "");
              console.log("token: ", token);
              if (token.includes(key)) {
                newMatches.push({ bookIdx: bIdx, verseIdx: vIdx });
              }
            }
          });
        }
      });

      newPointer = 0;
      setSearchKey(key);
      setMatches(newMatches);
      setPointer(0);
    } else if (matches.length) {
      // same key again → cycle pointer
      newPointer = (pointer + 1) % matches.length;
      setPointer(newPointer);
    }

    // finally highlight
    if (newMatches.length) {
      console.log(newMatches);
      setHighlightedPos(newMatches[newPointer]);
    }
  };

  // expose globally
  globalThis.HighlightStudyNoteSection = highlightSection;

  let timeout;

  function highlightSectionWord(rawKey) {
    if (timeout) clearTimeout(timeout);
    const stripRe = /[.,'"“”‘’]/g;
    const keyNorm = String(rawKey).replace(stripRe, "").trim().toLowerCase();
    globalThis.HighlightedSectionKey = keyNorm;
    // let everyone know it changed
    window.dispatchEvent(new CustomEvent("highlightedSectionKeyChanged"));

    // clear after 3s
    timeout = setTimeout(() => {
      globalThis.HighlightedSectionKey = "";
      window.dispatchEvent(new CustomEvent("highlightedSectionKeyChanged"));
    }, 8000);
  }

  let verseTimeout;
  let versesTimeout;

  function clearHighlights(category) {
    if (category === "verse") {
      clearTimeout(verseTimeout);
      globalThis.HighlightedVerseNumber = "";
      window.dispatchEvent(new CustomEvent("highlightedVerseChanged"));
    } else if (category === "verses") {
      clearTimeout(versesTimeout);
      globalThis.HighlightedVerses = "";
      window.dispatchEvent(new CustomEvent("highlightedVersesChanged"));
    }
  }

  // Helper: apply underline to verse elements in thePage by verse number(s)
  let _snUnderlineTimer = null;
  function applyVerseUnderline(verseNumbers) {
    // clear any previous underlines
    document
      .querySelectorAll(".sn-verse-underline")
      .forEach((el) => el.classList.remove("sn-verse-underline"));
    if (_snUnderlineTimer) {
      clearTimeout(_snUnderlineTimer);
      _snUnderlineTimer = null;
    }

    const nums = Array.isArray(verseNumbers) ? verseNumbers : [verseNumbers];
    let firstEl = null;

    nums.forEach((vn) => {
      const el = document.getElementById(`v-${vn}`);
      if (el) {
        el.classList.add("sn-verse-underline");
        if (!firstEl) firstEl = el;
      }
    });

    // scroll to the first highlighted verse
    if (firstEl) {
      firstEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    // auto-clear after 8s
    _snUnderlineTimer = setTimeout(() => {
      document
        .querySelectorAll(".sn-verse-underline")
        .forEach((el) => el.classList.remove("sn-verse-underline"));
    }, 8000);
  }

  // Helper: wait for verse DOM element to appear after navigation, then underline
  function waitForVerseAndUnderline(verseNumbers, maxWait = 5000) {
    const nums = Array.isArray(verseNumbers) ? verseNumbers : [verseNumbers];
    const firstNum = nums[0];
    const startTime = Date.now();

    function poll() {
      const el = document.getElementById(`v-${firstNum}`);
      if (el) {
        applyVerseUnderline(nums);
      } else if (Date.now() - startTime < maxWait) {
        setTimeout(poll, 200);
      }
    }
    // Start polling after a small initial delay
    setTimeout(poll, 300);
  }

  function highlightSectionNumber(rawNumber) {
    // cancel any pending clear
    if (verseTimeout) clearTimeout(verseTimeout);
    if (versesTimeout) clearHighlights("verses");
    // normalize to a simple string
    const numStr = String(rawNumber);

    console.log("called verse: ", numStr);

    // 1) store globally (for study note panel underline)
    globalThis.HighlightedVerseNumber = numStr;
    window.dispatchEvent(new CustomEvent("highlightedVerseChanged"));

    // 2) Apply underline in thePage via DOM (delay to run after React re-render)
    const verseNum = parseInt(numStr, 10);
    if (!isNaN(verseNum)) {
      setTimeout(() => applyVerseUnderline(verseNum), 50);
    }

    // 3) clear study note highlight after 8s
    verseTimeout = setTimeout(() => {
      globalThis.HighlightedVerseNumber = "";
      window.dispatchEvent(new CustomEvent("highlightedVerseChanged"));
    }, 8000);
  }

  // highlight a single verse, a range string, an array, or range object(s)
  function highlightVerses(payload) {
    if (verseTimeout) clearHighlights("verse");
    if (versesTimeout) clearTimeout(verseTimeout);

    globalThis.HighlightedVerses = payload;
    window.dispatchEvent(new CustomEvent("highlightedVersesChanged"));

    // Build array of verse numbers for DOM underline
    let verseNums = [];
    if (
      typeof payload === "object" &&
      payload.start != null &&
      payload.end != null
    ) {
      for (let v = payload.start; v <= payload.end; v++) verseNums.push(v);
    } else if (Array.isArray(payload)) {
      verseNums = payload.map((n) => parseInt(n, 10)).filter((n) => !isNaN(n));
    } else if (typeof payload === "string") {
      const m = payload.match(/^(\d+)\s*[-–]\s*(\d+)$/);
      if (m) {
        for (let v = +m[1]; v <= +m[2]; v++) verseNums.push(v);
      } else {
        const n = parseInt(payload, 10);
        if (!isNaN(n)) verseNums.push(n);
      }
    }

    if (verseNums.length) setTimeout(() => applyVerseUnderline(verseNums), 300);

    versesTimeout = setTimeout(() => {
      globalThis.HighlightedVerses = "";
      window.dispatchEvent(new CustomEvent("highlightedVersesChanged"));
    }, 8000);
  }

  function scheduleStudyNoteHighlight(payload) {
    setTagMask(mainBot, "canHighlight", false);
    console.log("canHighlight is false now: ", mainBot?.tags.canHighlight);
    globalThis.ScheduleHighlight(payload, highlightSection);
  }

  // Decide what to do when a popup heading is clicked
  async function handleCitationHeadingClick(passage, evt) {
    evt?.stopPropagation?.();

    const { source = "bible", verseStart, verseEnd, chapter, bookId } = passage;
    const internalBookId = denormalizeBookId(bookId); // Convert "1 SA" to "1SA" for internal use
    console.log("passage: ", passage);

    if (globalThis.BookId === internalBookId && currentChapter === chapter) {
      setTagMask(mainBot, "shouldHighlight", true);
    } else if (globalThis.BookId === internalBookId) {
      // Same book, different chapter: navigate in current tab
      HandleClosePopup();

      const currentTabId = ActiveTab;
      setTagMask(mainBot, "previousTab", {
        tabId: currentTabId,
        bookId: globalThis.BookId,
        chapter: currentChapter,
        tabData: {
          use: "thePage",
          type: "book",
          book: getBookNameById(globalThis.BookId),
          bookId: globalThis.BookId,
          chapter: currentChapter,
          translation: "ESV",
        },
      });

      // Use thePage's native open to navigate within the same tab
      await globalThis.Open(internalBookId, chapter);

      // Underline the cited verses after the new chapter loads
      const versesToHighlight = [];
      for (let v = verseStart; v <= (verseEnd || verseStart); v++)
        versesToHighlight.push(v);
      waitForVerseAndUnderline(versesToHighlight);
    } else {
      // GlobalLoadingDataFromSN(bookId, chapter);
      HandleClosePopup();

      const currentTab = ActiveTab;
      setTagMask(mainBot, "previousTab", {
        tabId: currentTab,
        bookId: globalThis.BookId,
        chapter: currentChapter,
        tabData: {
          use: "thePage",
          type: "book",
          book: getBookNameById(globalThis.BookId),
          bookId: globalThis.BookId,
          chapter: currentChapter,
          translation: "ESV",
        },
      });

      setTagMask(mainBot, "shouldHighlight", false);

      const same = (a, b) =>
        String(a ?? "").toLowerCase() === String(b ?? "").toLowerCase();

      function findFirstTabByBookIdInActiveSpace(bookId) {
        const all = GetTabsInSpace() || [];
        const hit = all.find((t) => t?.data && same(t.data.bookId, bookId));
        return hit ? { tabId: hit.id, data: hit.data } : null;
      }

      const existingTab = findFirstTabByBookIdInActiveSpace(internalBookId);

      let newTabData;
      let newTabId;

      if (existingTab) {
        newTabId = existingTab.tabId;
        newTabData = existingTab.data;
      } else {
        newTabId = uuid();
        newTabData = {
          use: "thePage",
          type: "book",
          book: getBookNameById(internalBookId),
          bookId: internalBookId,
          chapter: chapter,
          translation: "ESV",
        };

        AddTab({
          id: newTabId,
          taken: false,
          data: { ...newTabData },
        });
      }

      SetActiveTab(newTabId);

      await loadTabsData(internalBookId, chapter, newTabId, newTabData);

      // Underline the cited verses after the new tab loads
      const versesToHighlight = [];
      for (let v = verseStart; v <= (verseEnd || verseStart); v++)
        versesToHighlight.push(v);
      waitForVerseAndUnderline(versesToHighlight);

      // const allTabsInSpace = GetTabsInSpace();

      // console.log("allTabsInSpace: ", allTabsInSpace.length);
    }

    if (source === "bible") {
      const payload = {
        start: verseStart,
        end: verseEnd,
      };

      highlightVerses(payload);
    } else {
      console.log("clicked on the heading for note");
      scheduleStudyNoteHighlight(String(verseStart));
    }
  }

  // Decide what to do when a popup verse is clicked
  async function handleCitationVerseClick(passage, evt, verseNumber) {
    evt?.stopPropagation?.();

    const { source = "bible", verseStart, verseEnd, chapter, bookId } = passage;
    const internalBookId = denormalizeBookId(bookId); // Convert "1 SA" to "1SA" for internal use
    console.log("passage: ", passage);

    if (globalThis.BookId === internalBookId && currentChapter === chapter) {
      setTagMask(mainBot, "shouldHighlight", true);
      os.toast("you are already opening this book.", 2);
      if (source === "study-note") {
        console.log("is study note");
        console.log("clicked on the verse for note");
        highlightSection(String(verseNumber));
      } else {
        console.log("is bible");
        highlightSectionNumber(String(verseNumber));
      }
    } else if (globalThis.BookId === internalBookId) {
      // Same book, different chapter: navigate in current tab
      HandleClosePopup();

      const currentTabId = ActiveTab;
      setTagMask(mainBot, "previousTab", {
        tabId: currentTabId,
        bookId: globalThis.BookId,
        chapter: currentChapter,
        tabData: {
          use: "thePage",
          type: "book",
          book: getBookNameById(globalThis.BookId),
          bookId: globalThis.BookId,
          chapter: currentChapter,
          translation: "ESV",
        },
      });

      // Use thePage's native open to navigate within the same tab
      await globalThis.Open(internalBookId, chapter);

      // Underline the cited verse(s) after the new chapter loads
      const verseNumsToHighlight = [];
      for (let v = verseStart; v <= (verseEnd || verseStart); v++)
        verseNumsToHighlight.push(v);
      waitForVerseAndUnderline(verseNumsToHighlight);

      if (source === "study-note") {
        scheduleStudyNoteHighlight(String(verseStart));
      } else {
        highlightSectionNumber(String(verseNumber));
      }
    } else {
      // await GlobalLoadingDataFromSN(bookId, chapter).then(() => {
      //     if (source === 'study-note') {
      //         console.log("is study note");
      //         console.log("clicked on the verse for note");
      //         scheduleStudyNoteHighlight(String(verseStart));
      //         // highlightSection(String(verseNumber));
      //     } else {
      //         console.log("is bible");
      //         highlightSectionNumber(String(verseNumber));
      //     }
      // })

      HandleClosePopup();

      const currentTab = ActiveTab;
      setTagMask(mainBot, "previousTab", {
        tabId: currentTab,
        bookId: globalThis.BookId,
        chapter: currentChapter,
        tabData: {
          use: "thePage",
          type: "book",
          book: getBookNameById(globalThis.BookId),
          bookId: globalThis.BookId,
          chapter: currentChapter,
          translation: "ESV",
        },
      });

      setTagMask(mainBot, "shouldHighlight", false);

      const same = (a, b) =>
        String(a ?? "").toLowerCase() === String(b ?? "").toLowerCase();

      function findFirstTabByBookIdInActiveSpace(bookId) {
        const all = GetTabsInSpace() || [];
        console.log("all: ", all);
        const hit = all.find((t) => t?.data && same(t.data.bookId, bookId));
        console.log("hit: ", hit);
        return hit ? { tabId: hit.id, data: hit.data } : null;
      }

      const existingTab = findFirstTabByBookIdInActiveSpace(internalBookId);

      let newTabData;
      let newTabId;

      if (existingTab) {
        console.log("existingTab: ", existingTab);
        newTabId = existingTab.tabId;
        newTabData = existingTab.data;
      } else {
        newTabId = uuid();
        newTabData = {
          use: "thePage",
          type: "book",
          book: getBookNameById(internalBookId),
          bookId: internalBookId,
          chapter: chapter,
          translation: "ESV",
        };

        AddTab({
          id: newTabId,
          taken: false,
          data: { ...newTabData },
        });
      }

      SetActiveTab(newTabId);

      await loadTabsData(internalBookId, chapter, newTabId, newTabData);

      // Underline the cited verse(s) after the new tab loads
      const verseNumsToHighlight = [];
      for (let v = verseStart; v <= (verseEnd || verseStart); v++)
        verseNumsToHighlight.push(v);
      waitForVerseAndUnderline(verseNumsToHighlight);

      if (source === "study-note") {
        console.log("is study note");
        console.log("clicked on the verse for note");
        scheduleStudyNoteHighlight(String(verseStart));
        // highlightSection(String(verseNumber));
      } else {
        console.log("is bible");
        highlightSectionNumber(String(verseNumber));
      }
    }
  }

  function changeGlobalHighlighting(flag) {
    const isBool = (val) => typeof val === "boolean";
    if (isBool(flag)) {
      setTagMask(mainBot, "shouldHighlight", flag);
    } else {
      setTagMask(mainBot, "shouldHighlight", true);
    }
  }

  globalThis.ChangeGlobalHighlighting = changeGlobalHighlighting;

  // if (!studyNote || studyNote.length === 0 || !studyNote[0]) {
  //     return (
  //         <div className="judeTextPage">
  //             <div className="verseText">
  //                 No study note for this book: <strong>{bookId}</strong>
  //             </div>
  //         </div>
  //     );
  // }

  let hoverTimer;
  function onCitationEnter(refText, triggerEl) {
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(async () => {
      const refs = parseCitationReferences(refText, bookId);
      // fetch in background; don’t open yet
      await Promise.all(refs.map((r) => prefetchChapter(r.bookId, r.chapter)));
    }, 160);
  }
  function onCitationLeave() {
    clearTimeout(hoverTimer);
  }

  const ANIM_MS = 200;

  function switchPopup(newPopup) {
    if (!newPopup) return;

    if (!popup) {
      setPopup(newPopup);
      setShowModal(true);
      return;
    }

    setShowModal(false);
    setTimeout(() => {
      setPopup(newPopup);
      setShowModal(true);
    }, ANIM_MS);
  }

  function clearHoverOpenTimer() {
    if (hoverOpenTimerRef.current) {
      clearTimeout(hoverOpenTimerRef.current);
      hoverOpenTimerRef.current = null;
    }
  }

  // schedule opening the popup after 500ms if still hovering the same target
  function scheduleOpenPopupOnHover(e, text) {
    clearHoverOpenTimer();
    const myToken = ++hoverTokenRef.current;

    hoverOpenTimerRef.current = setTimeout(() => {
      // if another hover started/ended, abort
      if (hoverTokenRef.current !== myToken) return;

      // (same body you currently run on MouseEnter)
      // overCitationRef.current = true;
      // clearHideTimer();

      const { clientX, clientY } = e;
      const containerRect = containerRef.current?.getBoundingClientRect() || {
        width: 0,
      };
      const targetEl = e.target;
      console.log("e: ", e);
      console.log("targetEl: ", targetEl);
      const targetRect = targetEl.getBoundingClientRect();
      const gap = 5;

      const margin = 15;
      const popupWidth = Math.min(containerRect.width * 0.6, 480);
      const { offsetLeft, offsetTop, offsetWidth, offsetHeight } = e.target;
      const centerPivotX = offsetLeft + offsetWidth / 4;
      const ideal = centerPivotX - popupWidth / 2;
      const realLeft = Math.max(
        margin,
        Math.min(ideal, containerRect.width - 15 - margin - popupWidth)
      );

      // ---------- isBelow from viewport distance ----------
      const distanceFromViewportTop = targetRect.top;
      const isBelow = distanceFromViewportTop < 300;
      const relY = isBelow ? offsetTop + offsetHeight + gap : offsetTop - gap;

      const refs = parseCitationReferences(
        text,
        bookId,
        contextChapterRef.current + 1
      );
      const newPopup = {
        text,
        refs,
        clientX,
        clientY,
        relX: realLeft,
        relY,
        margin: offsetHeight,
        isBelow,
      };

      setNextPopup(newPopup);
      switchPopup(newPopup);
      fetchCitationDataForRefs(refs);
    }, 300); // 0.3s intent
  }

  const removeStudyNoteBackButton = () => {
    clearBackTimers();
    setBackFabFading(true);
    setBackFabHovering(false);
    setLastDismissReason("close");
    // Clear tags immediately so shouldShowBackFab becomes false right away.
    // The useEffect guards against interrupting an active fade, so the
    // visual fade-out still completes before the element is unmounted.
    setTagMask(mainBot, "previousTab", {});
    setTagMask(mainBot, "_prevTabCache", {});
    backCleanupTimerRef.current = setTimeout(() => {
      setShowBackFab(false);
      setBackFabFading(false);
    }, 400);
  };

  globalThis.RemoveStudyNoteBackButton = removeStudyNoteBackButton;

  async function handleBackFabClick() {
    setBackFabHovering(false);

    const prev = mainBot?.tags.previousTab?.tabId
      ? mainBot.tags.previousTab
      : mainBot?.tags._prevTabCache?.tabId
        ? mainBot.tags._prevTabCache
        : null;

    if (prev) {
      if (prev.bookId === globalThis.BookId) {
        await globalThis.Open(prev.bookId, prev.chapter);
      } else {
        SetActiveTab(prev.tabId);
        await loadTabsData(prev.bookId, prev.chapter, prev.tabId, prev.tabData);
      }
    }

    removeStudyNoteBackButton();
  }

  // derive current visibility from the tag each render
  const shouldShowBackFab = !!mainBot?.tags.previousTab?.tabId;

  // whenever it appears, show it, then fade after 3s, then clear the tag
  useEffect(() => {
    if (!shouldShowBackFab) {
      // If a dismiss-fade is in progress (backFabFading=true), don't cancel
      // it — let the 400ms cleanup timer from removeStudyNoteBackButton fire.
      if (!backFabFading) {
        clearBackTimers();
        setShowBackFab(false);
        setBackFabFading(false);
      }
      return;
    }

    setShowBackFab(true);

    // if not hovering, arm the 3s fade timer; if hovering, do nothing
    clearBackTimers();
    if (!backFabHovering) {
      backFadeTimerRef.current = setTimeout(() => {
        setBackFabFading(true);
        backCleanupTimerRef.current = setTimeout(() => {
          setTagMask(mainBot, "_prevTabCache", mainBot?.tags.previousTab || {});
          setTagMask(mainBot, "previousTab", {});
          setShowBackFab(false);
          setBackFabFading(false);
          setLastDismissReason("timeout");
        }, 400);
      }, 3000);
    }

    return clearBackTimers;
  }, [shouldShowBackFab, backFabHovering, backFabFading]);

  function onBackFabMouseEnter() {
    setBackFabHovering(true);
    clearBackTimers();
    setBackFabFading(false);
  }

  function onBackFabMouseLeave() {
    setBackFabHovering(false);
  }

  function onBackHotspotMouseEnter() {
    if (lastDismissReason === "timeout" && mainBot?.tags._prevTabCache?.tabId) {
      // restore cached target, arm fade-in
      setTagMask(mainBot, "previousTab", mainBot.tags._prevTabCache);

      // prevent the 3s idle timer from arming while pointer is in the area
      setBackFabHovering(true);
      clearBackTimers();
      setBackFabFading(false);

      // mount + animate in
      setBackFabAppearing(true);
      setShowBackFab(true);
      setBackFabFading(false);
      setLastDismissReason("none");

      clearAppearTimer();
      // drop the 'appear' flag after the CSS animation completes
      appearCleanupTimerRef.current = setTimeout(() => {
        setBackFabAppearing(false);
      }, 400); // keep in sync with CSS animation duration
    }
  }

  // cleanup on unmount
  useEffect(
    () => () => {
      clearHoverOpenTimer();
      clearBackTimers();
      clearAppearTimer();
    },
    []
  );

  const shouldRender = popup && showModal;

  return (
    <div
      ref={containerRef}
      className="judeTextPage"
      onClick={(e) => {
        // clearHideTimer();
        const clickedCitation = e.target.closest(".studyCitation");
        const insidePopup = e.target.closest(".popup-container");
        if (popup && !insidePopup && !clickedCitation) {
          handleClose();
        }
      }}
    >
      {showSpinner && (
        <div
          className="sn-centered-loading"
          aria-busy="true"
          aria-live="polite"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none", // block clicks beneath? keep as none
            zIndex: 2,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "20px",
            }}
          >
            <div className="sn-spinner" />
            <div
              style={{
                color: "#000",
                fontSize: "16px",
                fontFamily: "sans-serif",
              }}
            >
              Loading study notes...
            </div>
          </div>
        </div>
      )}
      {lastDismissReason === "timeout" && (
        <div
          className="sn-back-fab-hotspot"
          onMouseEnter={onBackHotspotMouseEnter}
          aria-hidden
        />
      )}
      {showBackFab && (
        <button
          className={`sn-back-fab fade-in ${backFabFading ? "fade-out" : ""} ${backFabAppearing ? "appear" : ""}`}
          onClick={handleBackFabClick}
          onMouseEnter={onBackFabMouseEnter}
          onMouseLeave={onBackFabMouseLeave}
          aria-label="Back to previous tab"
          title="Back to previous tab"
        >
          <span className="sn-back-fab-icon" aria-hidden>
            ↩
          </span>
          <span className="sn-back-fab-text">Back</span>
        </button>
      )}
      {studyNote && studyNote.length > 0 ? (
        studyNote.map((book, bookIdx) => {
          const [c1, setC1] = useState(false);
          return (
            <div key={bookIdx} className="studyTextContainer">
              {book &&
                book.sections &&
                book.sections.map((verse, vIdx) => {
                  const isCurrent =
                    highlightedPos?.bookIdx === bookIdx &&
                    highlightedPos?.verseIdx === vIdx;

                  return (
                    <div
                      key={vIdx}
                      ref={isCurrent ? scrollRef : null}
                      className={`verse ${isCurrent ? "highlighted" : ""}`}
                    >
                      <h3 className={`verseNumber`}>
                        {(() => {
                          const sec = verse.section.toString();
                          // find verse reference with optional range (e.g., "1:1-2:3" or "3:16")
                          // Updated to capture ranges like "1:1-2:3" properly
                          const m = sec.match(
                            /(\d+:\d+(?:[-–]\d+(?::\d+)?)?)(?:\s+(.*))?/
                          );

                          if (!m)
                            return (
                              <>
                                <span
                                  className="clickableCursor"
                                  style={{ marginLeft: "4px" }}
                                  onClick={() => highlightSectionWord(sec)}
                                >
                                  {sec}
                                </span>
                              </>
                            );

                          // m[1] = full verse reference (e.g., "1:1-2:3" or "3:16")
                          // m[2] = optional tail text (e.g., "Some phrase")
                          const verseRef = m[1]; // e.g. "1:1-2:3" or "3:16"
                          const tail = m[2] || ""; // "Some phrase" or ''

                          // Extract the first verse number for highlighting (e.g., "1" from "1:1-2:3")
                          const firstVerseMatch = verseRef.match(/:(\d+)/);
                          const firstVerseNum = firstVerseMatch
                            ? firstVerseMatch[1]
                            : verseRef;

                          // Extract the end verse number for range highlighting (e.g., "5" from "4:1-5" or "4:1–5")
                          const rangeMatch = verseRef.match(/:(\d+)[-–](\d+)/);
                          const startVerse = parseInt(firstVerseNum, 10);
                          const endVerse = rangeMatch
                            ? parseInt(rangeMatch[2], 10)
                            : startVerse;

                          // Get the book name prefix (e.g., "GENESIS " from "GENESIS 1:1-2:3")
                          const before = sec.slice(0, m.index).trim() || "";

                          return (
                            <>
                              <span
                                className="clickableCursor"
                                onClick={() => {
                                  if (endVerse > startVerse) {
                                    highlightVerses({
                                      start: startVerse,
                                      end: endVerse,
                                    });
                                  } else {
                                    highlightSectionNumber(firstVerseNum);
                                  }
                                }}
                              >
                                {before} {verseRef}
                              </span>

                              {tail && (
                                <span
                                  className="clickableCursor"
                                  style={{ marginLeft: "4px" }}
                                  onClick={() => highlightSectionWord(tail)}
                                >
                                  {tail}
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </h3>

                      {/* Render content with list detection */}
                      {(() => {
                        const fullContent = verse.content.join(" ");
                        const segments = detectAndSplitLists(fullContent);

                        // Helper to render text with citations
                        // Pass current book and chapter for self-reference detection
                        const currentChapter = contextChapterRef.current + 1;
                        const renderTextWithCitations = (text, keyPrefix) =>
                          splitWithCitations(text, bookId, currentChapter).map(
                            (chunk, i) =>
                              chunk.type === "plain" ? (
                                <span
                                  key={`${keyPrefix}-${i}`}
                                  className="verseText"
                                >
                                  {chunk.text}
                                </span>
                              ) : (
                                <span
                                  key={`${keyPrefix}-${i}`}
                                  className="studyCitation clickableCursor"
                                  onMouseEnter={(e) => {
                                    e.stopPropagation();
                                    scheduleOpenPopupOnHover(e, chunk.text);
                                  }}
                                  onMouseLeave={() => {
                                    clearHoverOpenTimer();
                                    overCitationRef.current = false;
                                  }}
                                  onClick={(e) => {
                                    console.log("text: ", chunk.text);
                                    e.stopPropagation();
                                    overCitationRef.current = true;
                                    const { clientX, clientY } = e;
                                    const containerRect =
                                      containerRef.current.getBoundingClientRect() || {
                                        width: 0,
                                      };
                                    const targetEl = e.currentTarget;
                                    const targetRect =
                                      targetEl.getBoundingClientRect();
                                    const margin = 15;
                                    const gap = 5;
                                    const popupWidth = Math.min(
                                      containerRect.width * 0.6,
                                      480
                                    );
                                    const {
                                      offsetLeft,
                                      offsetTop,
                                      offsetWidth,
                                      offsetHeight,
                                    } = e.target;
                                    const centerPivotX =
                                      offsetLeft + offsetWidth / 4;
                                    const ideal = centerPivotX - popupWidth / 2;
                                    const realLeft = Math.max(
                                      margin,
                                      Math.min(
                                        ideal,
                                        containerRect.width -
                                          15 -
                                          margin -
                                          popupWidth
                                      )
                                    );
                                    const distanceFromViewportTop =
                                      targetRect.top;
                                    const isBelow =
                                      distanceFromViewportTop < 300;
                                    const relY = isBelow
                                      ? offsetTop + offsetHeight + gap
                                      : offsetTop - gap;
                                    // Use contextBook from plain text if available (e.g., "in Leviticus (19:9)")
                                    const effectiveBookId =
                                      chunk.contextBook || bookId;
                                    const refs = parseCitationReferences(
                                      chunk.text,
                                      effectiveBookId,
                                      contextChapterRef.current + 1
                                    );
                                    const newPopup = {
                                      text: chunk.text,
                                      refs,
                                      clientX,
                                      clientY,
                                      relX: realLeft,
                                      relY,
                                      margin: offsetHeight,
                                      isBelow,
                                    };
                                    setNextPopup(newPopup);
                                    switchPopup(newPopup);
                                    fetchCitationDataForRefs(refs);
                                  }}
                                >
                                  {chunk.text}
                                </span>
                              )
                          );

                        return segments.map((segment, segIdx) => {
                          if (segment.type === "list") {
                            return (
                              <ol key={`list-${segIdx}`} className="sn-list">
                                {segment.items.map((item, itemIdx) => (
                                  <li key={itemIdx} className="sn-list-item">
                                    {renderTextWithCitations(
                                      item,
                                      `list-${segIdx}-${itemIdx}`
                                    )}
                                  </li>
                                ))}
                              </ol>
                            );
                          }
                          // text segment
                          return (
                            <span key={`text-${segIdx}`}>
                              {renderTextWithCitations(
                                segment.content,
                                `text-${segIdx}`
                              )}
                            </span>
                          );
                        });
                      })()}
                    </div>
                  );
                })}
            </div>
          );
        })
      ) : (
        <div className="judeTextPage">
          <div
            className="verseText"
            style={{ padding: "20px", textAlign: "center" }}
          >
            {!pageLoading && `No study notes available for this book.`}
          </div>
        </div>
      )}

      {shouldRender && (
        <div
          className="popup-container"
          style={{
            top: popup ? `${popup.relY}px` : "-9999px",
            left: popup ? `${popup.relX}px` : "0px",
            transform: showModal
              ? `${popup.isBelow ? "translateY(0)" : "translateY(-100%)" + " scale(1)"}`
              : `${popup.isBelow ? "translateY(0)" : "translateY(-100%)" + " scale(0.9)"}`,
            opacity: showModal ? 1 : 0,
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
          onMouseEnter={(e) => {
            e.stopPropagation();
            overPopupRef.current = true;
            // clearHideTimer();
          }}
          onMouseLeave={(e) => {
            overPopupRef.current = false;
            // scheduleHide();
          }}
        >
          {isLoading && (
            <div className="cite-loading">
              <div className="spinner" />
            </div>
          )}

          {!isLoading &&
            citationData.map((passage, i) => (
              <div key={i} className="cite">
                <div
                  className="cite-heading"
                  onClick={(e) => handleCitationHeadingClick(passage, e)}
                  style={{ cursor: "pointer" }}
                  title={
                    passage.source === "study-note"
                      ? "Jump to note"
                      : "Open in Bible"
                  }
                >
                  {passage.bookId} {passage.chapter}:{passage.verseStart}
                  {passage.verseEnd !== passage.verseStart
                    ? `–${passage.verseEnd}`
                    : ""}
                  {passage.source === "study-note" && (
                    <span
                      className={`cite-source ${passage.source === "study-note" ? "from-note" : "from-bible"}`}
                    >
                      {passage.source === "study-note" ? "NOTE" : "BIBLE"}
                    </span>
                  )}
                </div>

                {!!passage.sectionTitle && (
                  <div className="cite-section-title">
                    {passage.sectionTitle}
                  </div>
                )}

                {passage.verses.map((v) => (
                  <p
                    key={v.number}
                    className="cite-verse"
                    onClick={(e) =>
                      handleCitationVerseClick(passage, e, v.number)
                    }
                    style={{ cursor: "pointer" }}
                  >
                    [{v.number}] {v.text}
                  </p>
                ))}

                {i < citationData.length - 1 && (
                  <div className="cite-divider" />
                )}
              </div>
            ))}
        </div>
      )}

      <style>{getStyleOf("studyNotes.css")}</style>
    </div>
  );
}

function StudyNotes({ id, chapter: propChapter }) {
  // Get extension bot for state management
  const mainBot = getBot("system", "studyNote.main");

  // Manage studyNotesPresent flag — true while panel is mounted, false on unmount
  useEffect(() => {
    globalThis.studyNotesPresent = true;
    return () => {
      globalThis.studyNotesPresent = false;
    };
  }, []);

  // Track book and chapter changes - use prop if provided, otherwise use globals
  const [bookId, setBookId] = useState(globalThis.BookId);
  const [chapter, setChapter] = useState(
    propChapter ?? globalThis.GlobalChapter ?? 0
  );

  // Update when prop changes (from UpdateApplication)
  useEffect(() => {
    if (propChapter !== undefined && propChapter !== chapter) {
      setChapter(propChapter);
    }
  }, [propChapter]);

  // Poll for changes to global book/chapter
  useEffect(() => {
    const checkChanges = () => {
      if (globalThis.BookId !== bookId) {
        setBookId(globalThis.BookId);
      }
      // Only update from globals if prop is not provided
      if (propChapter === undefined) {
        const globalChapter = globalThis.GlobalChapter ?? 0;
        if (globalChapter !== chapter) {
          setChapter(globalChapter);
        }
      }
    };

    const interval = setInterval(checkChanges, 100);
    return () => clearInterval(interval);
  }, [bookId, chapter, propChapter]);

  const initialTabs = [
    { id: "notes", label: "Study Notes", closeable: false },
    { id: "devotion", label: "Devotional", closeable: false }, // Apologist
    { id: "discover", label: "Discovery", closeable: false }, // SgSearch
  ];

  const initialTab = mainBot?.tags.studyNotesActiveTab || "notes";
  const [tabs, setTabs] = useState(initialTabs);
  const [active, setActive] = useState(initialTab);
  const [searchType, setSearchType] = useState(() => {
    return (
      globalThis.StudyNoteSearchType ||
      localStorage.getItem("studyNoteSearchType") ||
      "apologist"
    );
  });
  const [devotionalPreviewUrl, setDevotionalPreviewUrl] = useState("");
  const [enableEditor, setEnableEditor] = useState(false);
  const [currentStudyNoteData, setCurrentStudyNoteData] = useState(null);
  const initialGlobalSearch = globalThis.GlobalSearch ?? "galations 5";
  const initialLevel = globalThis.GlobalSearchLevel || "chapter";
  const [searchQuery, setSearchQuery] = useState(initialGlobalSearch);
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [searchLevel, setSearchLevel] = useState(initialLevel);
  const [baselineQuery, setBaselineQuery] = useState(
    globalThis.StudyNoteParentSearch || initialGlobalSearch
  );
  const [searchLabel, setSearchLabel] = useState(
    globalThis.GlobalSearchLabel ||
      globalThis.StudyNoteParentSearch ||
      initialGlobalSearch
  );

  useEffect(() => {
    setTagMask(mainBot, "studyNotesActiveTab", active);
  }, [active]);

  useEffect(() => {
    globalThis.GlobalSearch = searchQuery;
  }, [searchQuery]);

  useEffect(() => {
    globalThis.GlobalSearchLevel = searchLevel;
  }, [searchLevel]);

  useEffect(() => {
    if (baselineQuery) {
      globalThis.StudyNoteParentSearch = baselineQuery;
    }
  }, [baselineQuery]);

  useEffect(() => {
    if (searchLabel) {
      globalThis.GlobalSearchLabel = searchLabel;
    }
  }, [searchLabel]);

  // Persist searchType across verse changes
  useEffect(() => {
    globalThis.StudyNoteSearchType = searchType;
    localStorage.setItem("studyNoteSearchType", searchType);
  }, [searchType]);

  const updateStudyNoteSearch = useCallback(
    (rawQuery, options = {}) => {
      const trimmed = (rawQuery ?? "").trim();
      if (!trimmed) return;

      const {
        forceSearchType,
        activateDiscover = false,
        forceRefresh = false,
        level,
        label: labelOverride,
      } = options;

      const resolvedLevel = level || searchLevel || "chapter";

      if (
        forceSearchType &&
        (forceSearchType === "apologist" || forceSearchType === "tapos")
      ) {
        setSearchType(forceSearchType);
      }

      if (activateDiscover) {
        setActive("discover");
      }

      globalThis.GlobalSearch = trimmed;
      globalThis.GlobalSearchLevel = resolvedLevel;

      if (forceRefresh || trimmed !== searchQuery) {
        setSearchQuery(trimmed);
      }

      if (resolvedLevel !== searchLevel) {
        setSearchLevel(resolvedLevel);
      }

      if (resolvedLevel === "chapter") {
        setBaselineQuery(trimmed);
      }

      if (labelOverride) {
        setSearchLabel(labelOverride);
      } else if (resolvedLevel === "chapter") {
        setSearchLabel(trimmed);
      } else if (baselineQuery) {
        setSearchLabel(baselineQuery);
      } else {
        setSearchLabel(trimmed);
      }

      setSearchTrigger((prev) => prev + 1);
    },
    [setActive, setSearchType, searchLevel, searchQuery, baselineQuery]
  );

  useEffect(() => {
    globalThis.UpdateStudyNoteSearch = updateStudyNoteSearch;
    globalThis.GetStudyNoteSearchType = () => searchType;
    globalThis.GetStudyNoteSearchLevel = () => searchLevel;
    globalThis.GetStudyNoteBaselineQuery = () => baselineQuery;

    return () => {
      globalThis.UpdateStudyNoteSearch = null;
      globalThis.GetStudyNoteSearchType = null;
      globalThis.GetStudyNoteSearchLevel = null;
      globalThis.GetStudyNoteBaselineQuery = null;
    };
  }, [updateStudyNoteSearch, searchType, searchLevel, baselineQuery]);

  // Expose current tab globally so thePage can check before updating
  useEffect(() => {
    globalThis.StudyNoteActiveTab = active;
  }, [active]);

  // Functions to manage preview in devotional tab
  const openPreviewTab = (url, title) => {
    // Set the URL for the devotional tab to load
    setDevotionalPreviewUrl(url);
    // Switch to devotional tab
    setActive("devotion");
  };

  const closePreviewTab = () => {
    // Reset devotional tab to default
    setDevotionalPreviewUrl("");
  };

  // Expose globally for Apologist to use
  useEffect(() => {
    globalThis.StudyNoteOpenPreview = openPreviewTab;
    globalThis.StudyNoteClosePreview = closePreviewTab;

    return () => {
      globalThis.StudyNoteOpenPreview = null;
      globalThis.StudyNoteClosePreview = null;
    };
  }, []);

  // Force re-render when global search changes
  useEffect(() => {
    let lastSearch = globalThis.GlobalSearch ?? "";
    if (!lastSearch && searchQuery) {
      globalThis.GlobalSearch = searchQuery;
      lastSearch = searchQuery;
    }

    const interval = setInterval(() => {
      const nextSearch = globalThis.GlobalSearch ?? "";
      const nextLevel =
        globalThis.GlobalSearchLevel || searchLevel || "chapter";
      const nextLabel =
        globalThis.GlobalSearchLabel ||
        (nextLevel === "chapter" ? nextSearch : searchLabel);

      if (nextSearch !== lastSearch) {
        lastSearch = nextSearch;
        setSearchQuery(nextSearch);
        setSearchTrigger((prev) => prev + 1);
      }

      if (nextLevel !== searchLevel) {
        setSearchLevel(nextLevel);
      }

      if (nextLevel === "chapter" && nextSearch) {
        setBaselineQuery(nextSearch);
      }

      if (nextLabel && nextLabel !== searchLabel) {
        setSearchLabel(nextLabel);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [searchQuery, searchLevel, searchLabel]);

  // Prepare editor data structure
  const editorData = useMemo(() => {
    const currentBookId = globalThis.BookId;
    const currentChapter = (chapter ?? globalThis.GlobalChapter ?? 0) + 1;
    const bookName = getBookNameById(currentBookId);

    if (!currentBookId || !currentChapter) return null;

    return {
      book: bookName,
      bookId: currentBookId,
      chapter: currentChapter,
      translation: "ESV",
    };
  }, [chapter, bookId]);

  // Tilde key handler - context-aware behavior
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === "`") {
        event.preventDefault();

        if (active === "notes") {
          // Toggle editor on notes tab
          setEnableEditor((prev) => !prev);
        } else if (active === "discover") {
          // Existing behavior: switch search type
          setSearchType((prev) =>
            prev === "apologist" ? "tapos" : "apologist"
          );
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [active, setSearchType]);

  return (
    <div className="sn-tabs-wrap">
      <div className="sn-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`sn-tab ${active === t.id ? "is-active" : ""}`}
            onClick={() => setActive(t.id)}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="sn-panels">
        <div className={`sn-panel ${active === "notes" ? "show" : "hide"}`}>
          {editorData && enableEditor ? (
            <TextEditor
              enableEditor={enableEditor}
              setEnableEditor={setEnableEditor}
              data={editorData}
              studyNotes={
                currentStudyNoteData && currentStudyNoteData.length > 0
                  ? currentStudyNoteData
                  : [
                      {
                        header: `${editorData.book} ${editorData.chapter}`,
                        sections: [],
                      },
                    ]
              }
              content={
                <StudyNotesWithoutWrap
                  chapter={chapter}
                  onStudyNoteChange={setCurrentStudyNoteData}
                />
              }
              tab={null}
            />
          ) : (
            <StudyNotesWithoutWrap
              chapter={chapter}
              onStudyNoteChange={setCurrentStudyNoteData}
            />
          )}
        </div>

        <div className={`sn-panel ${active === "devotion" ? "show" : "hide"}`}>
          <div className="sg-searchWrap">
            <TableTalkEmbed url={devotionalPreviewUrl} />
          </div>
        </div>

        <div className={`sn-panel ${active === "discover" ? "show" : "hide"}`}>
          <div className="sg-searchWrap">
            {searchType === "apologist" ? (
              <Apologist
                search={searchQuery}
                trigger={searchTrigger}
                level={searchLevel}
                baselineQuery={baselineQuery}
                label={searchLabel}
              />
            ) : (
              <Tapos
                search={searchQuery}
                trigger={searchTrigger}
                level={searchLevel}
                baselineQuery={baselineQuery}
                label={searchLabel}
              />
            )}
          </div>
        </div>
      </div>

      <style>{getStyleOf("studyNotes.css")}</style>
    </div>
  );
}

globalThis.GlobalStudyNotes = StudyNotes;

return StudyNotes;
