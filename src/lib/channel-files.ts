export async function attachmentPayload(file: File) {
  if (file.size > 4_500_000) throw new Error(`${file.name}: supera 4.5 MB`);
  const text = /\.(txt|csv|json|xml|md|eml)$/i.test(file.name) || file.type.startsWith("text/");
  if (text) return { fileName: file.name, mime: file.type, text: await file.text() };
  if (!/\.pdf$/i.test(file.name) && !file.type.startsWith("image/")) {
    throw new Error(`${file.name}: formato no admitido; adjunta PDF, imagen o texto`);
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`No se pudo leer ${file.name}`));
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error(`No se pudo leer ${file.name}`));
    reader.readAsDataURL(file);
  });
  return { fileName: file.name, mime: file.type, dataUrl };
}