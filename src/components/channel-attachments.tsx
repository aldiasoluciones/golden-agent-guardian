import { Paperclip, X } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";

export function ChannelAttachments({ files, onChange, busy, channel }: {
  files: File[]; onChange: (files: File[]) => void; busy: boolean; channel: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  return <div className="space-y-2">
    <input ref={input} type="file" multiple hidden aria-label={`Archivos de ${channel}`} accept=".pdf,image/*,.txt,.csv,.json,.xml,.md,.eml" disabled={busy}
      onChange={(e) => { onChange([...files, ...Array.from(e.target.files ?? [])]); e.target.value = ""; }} />
    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
      <Paperclip /> Adjuntar archivo
    </Button>
    {files.length > 0 && <ul className="space-y-1" aria-label={`Adjuntos de ${channel}`}>
      {files.map((file, index) => <li key={`${index}-${file.name}`} className="flex min-w-0 items-center gap-2 text-xs">
        <Paperclip className="size-3 shrink-0 text-muted-foreground" /><span className="min-w-0 flex-1 break-all">{file.name}</span>
        <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0" title={`Quitar ${file.name}`} aria-label={`Quitar ${file.name}`} disabled={busy}
          onClick={() => onChange(files.filter((_, i) => i !== index))}><X /></Button>
      </li>)}
    </ul>}
  </div>;
}