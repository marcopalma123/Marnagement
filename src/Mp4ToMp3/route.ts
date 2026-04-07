import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { randomUUID } from "crypto";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const id = randomUUID();
  const inputPath = join(tmpdir(), `${id}.mp4`);
  const outputPath = join(tmpdir(), `${id}.mp3`);

  try {
    // Write uploaded file to temp disk
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(inputPath, buffer);

    // Convert MP4 → MP3 using ffmpeg
    await execAsync(
      `ffmpeg -i "${inputPath}" -vn -acodec libmp3lame -q:a 2 "${outputPath}"`
    );

    // Read the output and return it
    const mp3Buffer = await readFile(outputPath);

    return new NextResponse(mp3Buffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="${file.name.replace(/\.mp4$/i, "")}.mp3"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Conversion failed" }, { status: 500 });
  } finally {
    // Clean up temp files
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}