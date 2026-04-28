/**
 * @fileoverview Free voiceover generator for Gamma Stream Platform.
 * Uses Microsoft Edge TTS via the msedge-tts package — completely free,
 * no API key required. Uses the same neural voices as Edge browser read-aloud.
 *
 * Reads video scripts from videos/scripts/*.json and generates:
 *   videos/audio/[date]-[topic]-short.mp3          — short-form voiceover (Male)
 *   videos/audio/[date]-[topic]-long.mp3           — long-form voiceover (Female)
 *   videos/audio/[date]-[topic]-short-timing.json  — word timing for subtitles
 *   videos/audio/[date]-[topic]-long-timing.json   — word timing for subtitles
 *
 * Script JSON format:
 *   { "topic": "best-ai-tools", "date": "2026-04-26",
 *     "shortScript": "...", "longScript": "...", "voice": "en-US-GuyNeural" }
 *
 * Export:
 *   generateVoiceover(scriptText, outputPath, voice) → Promise<{ audioFile, timingFile, wordTimings }>
 *
 * Usage:
 *   node automation/voiceover-generator.js
 *   npm run voiceover
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');
const SCRIPTS_DIR = path.join(PROJECT_ROOT, 'videos', 'scripts');
const AUDIO_DIR = path.join(PROJECT_ROOT, 'videos', 'audio');

export const VOICE_MALE = 'en-US-GuyNeural';
export const VOICE_FEMALE = 'en-US-JennyNeural';

// Edge TTS metadata offsets are in 100-nanosecond ticks
const hnsToMs = (hns) => Math.round(hns / 10_000);

/**
 * Collect a Readable stream into a single Buffer.
 * Resolves on 'end' (normal push-null close) OR 'close' (stream.destroy()).
 * msedge-tts destroys the metadata stream rather than ending it, so we need both.
 * @param {import('stream').Readable} stream
 * @returns {Promise<Buffer>}
 */
function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve(Buffer.concat(chunks));
    };
    stream.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    stream.on('end', finish);
    stream.on('close', finish); // triggered when stream is destroyed (metadata stream)
    stream.on('error', (err) => { if (!settled) { settled = true; reject(err); } });
  });
}

/**
 * Collect the metadata stream into word-timing objects.
 * Each 'data' chunk from msedge-tts is an independent JSON object
 * { "Metadata": [...] }, so we parse per-chunk, not as one concatenated blob.
 * @param {import('stream').Readable|null} stream
 * @returns {Promise<object[]>}
 */
function collectWordTimings(stream) {
  if (!stream) return Promise.resolve([]);
  return new Promise((resolve, reject) => {
    const timings = [];
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve(timings);
    };
    stream.on('data', (chunk) => {
      try {
        const { Metadata } = JSON.parse(chunk.toString('utf8'));
        for (const item of Metadata ?? []) {
          if (item.Type === 'WordBoundary') {
            timings.push({
              word: item.Data.text.Text,
              startMs: hnsToMs(item.Data.Offset),
              durationMs: hnsToMs(item.Data.Duration),
              endMs: hnsToMs(item.Data.Offset + item.Data.Duration),
            });
          }
        }
      } catch { /* ignore malformed chunks */ }
    });
    stream.on('end', finish);
    stream.on('close', finish); // msedge-tts destroys the metadata stream; 'close' fires instead of 'end'
    stream.on('error', (err) => { if (!settled) { settled = true; reject(err); } });
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Synthesize text to an MP3 voiceover using Microsoft Edge TTS (free, no API key).
 * Also writes a word-timing JSON for downstream subtitle generation.
 *
 * @param {string} scriptText  The script content to synthesize
 * @param {string} outputPath  Absolute path for the output .mp3 file
 * @param {string} [voice]     Edge TTS voice name (default: en-US-GuyNeural)
 * @returns {Promise<{ audioFile: string, timingFile: string, wordTimings: object[] }>}
 */
export async function generateVoiceover(scriptText, outputPath, voice = VOICE_MALE) {
  console.log(`[voiceover] Voice: ${voice} | Script: ${scriptText.length} chars`);

  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, {
    wordBoundaryEnabled: true,
  });

  const { audioStream, metadataStream } = tts.toStream(scriptText);

  // Collect audio and metadata concurrently; close only after both streams settle
  const [audioBuffer, wordTimings] = await Promise.all([
    streamToBuffer(audioStream),
    collectWordTimings(metadataStream),
  ]);

  tts.close();

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, audioBuffer);
  console.log(`[voiceover] Audio  → ${path.relative(PROJECT_ROOT, outputPath)} (${(audioBuffer.length / 1024).toFixed(1)} KB)`);

  // Word-timing JSON lives next to the MP3 for easy discovery by subtitle tools
  const timingFile = outputPath.replace(/\.mp3$/, '-timing.json');
  const timingData = {
    voice,
    generatedAt: new Date().toISOString(),
    totalDurationMs: wordTimings.at(-1)?.endMs ?? 0,
    wordCount: wordTimings.length,
    words: wordTimings,
  };
  await fs.writeFile(timingFile, JSON.stringify(timingData, null, 2));
  console.log(`[voiceover] Timing → ${path.relative(PROJECT_ROOT, timingFile)} (${wordTimings.length} words)`);

  return { audioFile: outputPath, timingFile, wordTimings };
}

// ─── Main: batch-process all scripts in videos/scripts/ ──────────────────────

async function main() {
  await fs.mkdir(AUDIO_DIR, { recursive: true });

  let files;
  try {
    files = (await fs.readdir(SCRIPTS_DIR)).filter((f) => f.endsWith('.json'));
  } catch {
    console.error(`[voiceover] Scripts directory not found: ${SCRIPTS_DIR}`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.log('[voiceover] No .json script files found in', SCRIPTS_DIR);
    return;
  }

  console.log(`[voiceover] Found ${files.length} script(s)\n`);
  const results = [];

  for (const file of files) {
    const raw = await fs.readFile(path.join(SCRIPTS_DIR, file), 'utf-8');
    const { topic, date, shortScript, longScript, voice } = JSON.parse(raw);
    const base = path.join(AUDIO_DIR, `${date}-${topic}`);
    const maleVoice = voice ?? VOICE_MALE;

    console.log(`── ${topic} (${date})`);

    if (shortScript) {
      const result = await generateVoiceover(shortScript, `${base}-short.mp3`, maleVoice);
      results.push({ topic, type: 'short', ...result });
    }
    if (longScript) {
      // Long-form uses female voice for variety; script can override via the voice field
      const result = await generateVoiceover(longScript, `${base}-long.mp3`, VOICE_FEMALE);
      results.push({ topic, type: 'long', ...result });
    }
  }

  // Manifest consumed by subtitle generator and video editor automation
  const manifest = {
    generatedAt: new Date().toISOString(),
    count: results.length,
    voiceovers: results.map((r) => ({
      topic: r.topic,
      type: r.type,
      audioFile: path.relative(PROJECT_ROOT, r.audioFile),
      timingFile: path.relative(PROJECT_ROOT, r.timingFile),
      wordCount: r.wordTimings.length,
    })),
  };
  await fs.writeFile(path.join(AUDIO_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(`\n[voiceover] ✅ ${results.length} voiceover(s) complete`);
  for (const r of manifest.voiceovers) {
    console.log(`  ${r.type.padEnd(5)} ${r.audioFile}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('[voiceover] Fatal:', err);
    process.exit(1);
  });
}
