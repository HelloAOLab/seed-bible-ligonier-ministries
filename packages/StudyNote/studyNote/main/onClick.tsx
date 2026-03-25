// onClick.tsx — Upload study note JSON files to ao lab storage
// Each file's URL is stored as a tag on thisBot, named by the book abbreviation (e.g. AMO, GEN, COL)

// Mapping from filename prefixes to standard uppercase abbreviations
const bookNameToAbbrev = {
    "Gen": "GEN", "Ex": "EXO", "Lev": "LEV", "Num": "NUM", "Deut": "DEU",
    "Josh": "JOS", "Judg": "JDG", "Ruth": "RUT",
    "1Sam": "1SA", "2Sam": "2SA", "1Kings": "1KI", "2Kings": "2KI",
    "1Chr": "1CH", "2Chr": "2CH", "Ezra": "EZR", "Neh": "NEH", "Philem": "PHM",
    "Esth": "EST", "Job": "JOB", "Ps": "PSA", "Prov": "PRO",
    "Eccl": "ECC", "Song": "SNG", "Is": "ISA", "Jer": "JER",
    "Lam": "LAM", "Ezek": "EZK", "Dan": "DAN",
    "Hos": "HOS", "Joel": "JOL", "Amos": "AMO", "Obad": "OBA",
    "Jonah": "JON", "Mic": "MIC", "Nah": "NAM", "Hab": "HAB",
    "Zeph": "ZEP", "Hag": "HAG", "Zech": "ZEC", "Mal": "MAL",
    "Matt": "MAT", "Mark": "MRK", "Luke": "LUK", "John": "JHN",
    "Acts": "ACT", "Rom": "ROM",
    "1Cor": "1CO", "2Cor": "2CO", "Gal": "GAL", "Eph": "EPH",
    "Phil": "PHP", "Col": "COL",
    "1Thess": "1TH", "2Thess": "2TH", "1Tim": "1TI", "2Tim": "2TI",
    "Titus": "TIT", "Heb": "HEB", "James": "JAS",
    "1Pet": "1PE", "2Pet": "2PE",
    "1John": "1JN", "2John": "2JN", "3John": "3JN",
    "Jude": "JUD", "Rev": "REV",
};

function getBookAbbrev(rawName) {
    // Direct match
    if (bookNameToAbbrev[rawName]) return bookNameToAbbrev[rawName];
    // Case-insensitive match
    const lower = rawName.toLowerCase();
    for (const [key, val] of Object.entries(bookNameToAbbrev)) {
        if (key.toLowerCase() === lower) return val;
    }
    // Fallback: uppercase the raw name
    console.warn(`No abbreviation mapping for "${rawName}", using uppercase fallback.`);
    return rawName.toUpperCase();
}

const authBot = await os.requestAuthBot();
if (!authBot) {
    os.toast("Login required to upload files.");
    return;
}

const recordKeyResult = await os.getPublicRecordKey("studyNoteV2");
const recordKey = recordKeyResult.recordKey;
console.log("Record key generated:", recordKey);

const files = await os.showUploadFiles();

if (!files || files.length === 0) {
    os.toast("No files selected.");
    return;
}

let successCount = 0;
let failCount = 0;

for (const file of files) {
    const fileName = file.name; // e.g. "Amos_studyNote.json"
    const rawBookName = fileName.split("_")[0]; // e.g. "Amos"
    const bookId = getBookAbbrev(rawBookName); // e.g. "AMO"

    if (!rawBookName) {
        console.warn("Could not extract book ID from file name:", fileName);
        failCount++;
        continue;
    }

    try {
        console.log(`Uploading ${fileName} → tag: ${bookId}...`);

        const result = await os.recordFile(recordKey, file.data, {
            description: `studyNoteV2_${bookId}`,
            mimeType: file.mimeType || "application/json",
        });

        let url = null;

        if (result.success) {
            url = result.url;
        } else if (result.errorCode === "file_already_exists") {
            url = result.existingFileUrl;
            console.log(`File already exists for ${bookId}, using existing URL.`);
        } else {
            console.error(`Failed to upload ${fileName}:`, result);
            failCount++;
            continue;
        }

        // Store the URL as a tag named by the book abbreviation
        tags[bookId] = url;
        console.log(`✅ ${bookId} → ${url}`);
        successCount++;
    } catch (err) {
        console.error(`Error uploading ${fileName}:`, err);
        failCount++;
    }
}

os.toast(`Upload complete: ${successCount} succeeded, ${failCount} failed.`);
console.log("All uploads finished.", { successCount, failCount });
