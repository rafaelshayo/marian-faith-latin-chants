//"use strict";
// Converts the Biblica Open Kiswahili Contemporary Version (eBible.org id: swhonen, CC BY-SA 4.0)
// USFM files in swahili/src/ into the tab-separated chapter\tverse\ttext files used by getReading(),
// named after the Latin book names (same convention as douay-rheims/ and aelf/).
// Usage: node extract-swahili.js   (from the jgabc directory, after unzipping swhonen_usfm.zip into swahili/src/)
var fs = require("fs");

var bookNames = {
  GEN:"Genesis", EXO:"Exodus", LEV:"Leviticus", NUM:"Numeri", DEU:"Deuteronomium",
  JOS:"Josue", JDG:"Judicum", RUT:"Ruth",
  "1SA":"Regum 1", "2SA":"Regum 2", "1KI":"Regum 3", "2KI":"Regum 4",
  "1CH":"Paralipomenon 1", "2CH":"Paralipomenon 2",
  EZR:"Esdræ", NEH:"Nehemiæ", EST:"Esther", JOB:"Job", PSA:"Psalmi",
  PRO:"Proverbia", ECC:"Ecclesiastes", SNG:"Canticum Canticorum",
  ISA:"Isaias", JER:"Jeremias", LAM:"Lamentationes", EZK:"Ezechiel", DAN:"Daniel",
  HOS:"Osee", JOL:"Joel", AMO:"Amos", OBA:"Abdias", JON:"Jonas", MIC:"Michæa",
  NAM:"Nahum", HAB:"Habacuc", ZEP:"Sophonias", HAG:"Aggæus", ZEC:"Zacharias", MAL:"Malachias",
  MAT:"Matthæus", MRK:"Marcus", LUK:"Lucas", JHN:"Joannes", ACT:"Actus Apostolorum",
  ROM:"Ad Romanos", "1CO":"Ad Corinthios 1", "2CO":"Ad Corinthios 2",
  GAL:"Ad Galatas", EPH:"Ad Ephesios", PHP:"Ad Philippenses", COL:"Ad Colossenses",
  "1TH":"Ad Thessalonicenses 1", "2TH":"Ad Thessalonicenses 2",
  "1TI":"Ad Timotheum 1", "2TI":"Ad Timotheum 2", TIT:"Ad Titum", PHM:"Ad Philemonem",
  HEB:"Ad Hebræos", JAS:"Jacobi", "1PE":"Petri 1", "2PE":"Petri 2",
  "1JN":"Joannis 1", "2JN":"Joannis 2", "3JN":"Joannis 3", JUD:"Judæ", REV:"Apocalypsis"
};

// paragraph/poetry markers whose text continues the current verse
var regexContinuation = /^(p|m|mi|nb|pc|pi\d*|pm[ocr]?|q\d*|qm\d*|qr|qc|li\d*|tr)$/;
// structural/heading markers whose text is discarded
var regexSkip = /^(id|h|toc\d*|mt\d*|c[lp]?|s\d*|sp|r|ms\d*|mr|b|d|rem|ide|usfm|sts)$/;

function cleanVerseText(text) {
  return text
    .replace(/\\f\b[\s\S]*?\\f\*/g, "")          // footnotes \f + \fr ... \f*
    .replace(/\\x\b[\s\S]*?\\x\*/g, "")          // cross-references
    .replace(/\\\+?[a-z]+\d*\*/g, "")            // character-marker closers (\nd* \wj* \it* ...)
    .replace(/\\\+?[a-z]+\d*\s?/g, "")           // character-marker openers and stray inline markers (\tc1 ...)
    .replace(/\s+/g, " ")
    .trim();
}

var files = fs.readdirSync("swahili/src").filter(function(f) { return /\.usfm$/.test(f); });
var written = 0;
files.forEach(function(file) {
  var src = fs.readFileSync("swahili/src/" + file, "utf8").replace(/^﻿/, "");
  var idMatch = src.match(/\\id (\w+)/);
  var code = idMatch && idMatch[1];
  var book = bookNames[code];
  if(!book) {
    console.info("skipping " + file + " (unmapped book code " + code + ")");
    return;
  }
  var chapter = 0;
  var verses = [];   // {chapter, verse, text}
  var current = null;
  src.split(/\r?\n/).forEach(function(line) {
    var match = /^\\(\S+)\s?(.*)$/.exec(line.trim());
    if(!match) {
      if(current && line.trim()) current.text += " " + line.trim();
      return;
    }
    var marker = match[1], rest = match[2];
    if(marker == "c") {
      chapter = parseInt(rest);
      current = null;
    } else if(marker == "v") {
      var vMatch = /^(\d+)\s*(.*)$/.exec(rest);
      if(!vMatch) return;
      current = { chapter: chapter, verse: parseInt(vMatch[1]), text: vMatch[2] };
      verses.push(current);
    } else if(regexContinuation.test(marker)) {
      if(current && rest) current.text += " " + rest;
    } else if(regexSkip.test(marker)) {
      if(marker != "b") current = null; // headings end the verse; \b is just spacing
    } else if(current && rest) {
      // unknown marker with text (e.g. footnote continuation lines): keep the text, cleanVerseText strips markers
      current.text += " \\" + marker + " " + rest;
    }
  });
  var out = verses.map(function(v) {
    return v.chapter + "\t" + v.verse + "\t" + cleanVerseText(v.text);
  }).join("\n") + "\n";
  fs.writeFileSync("swahili/" + book + ".txt", out, {encoding: "utf8"});
  written++;
  console.info("wrote swahili/" + book + ".txt (" + verses.length + " verses)");
});
console.info("done: " + written + " books");
