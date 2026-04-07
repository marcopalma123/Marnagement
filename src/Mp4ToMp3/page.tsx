"use client";
import { useConvertToMp3 } from "@/hooks/useConvertToMp3";

export default function Home() {
  const { convert, loading, error } = useConvertToMp3();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) convert(file);
  };

  return (
    <div>
      <h1>MP4 → MP3 Converter</h1>
      <input type="file" accept="video/mp4" onChange={handleFileChange} />
      {loading && <p>Converting...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}