import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, X, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useUploadCandidates } from "@/lib/queries";

const ACCEPTED = { "application/pdf": [".pdf"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"] };

export function UploadZone({ jobId, onUploaded }) {
  const [files, setFiles] = useState([]);
  const { mutateAsync: upload, isPending } = useUploadCandidates(jobId);

  const onDrop = useCallback((accepted) => {
    setFiles((prev) => {
      // Deduplicate by name
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...accepted.filter((f) => !names.has(f.name))];
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    multiple: true,
  });

  const removeFile = (name) => setFiles((prev) => prev.filter((f) => f.name !== name));

  const handleUpload = async () => {
    if (!files.length) return;
    try {
      const result = await upload(files);
      const queued = result.queued ?? 0;
      const errors = result.errors ?? [];
      if (queued > 0) toast.success(`${queued} CV${queued > 1 ? "s" : ""} queued for scoring`);
      if (errors.length > 0) toast.error(`${errors.length} file(s) failed to parse`);
      setFiles([]);
      onUploaded?.();
    } catch {
      toast.error("Upload failed. Check backend connection.");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Drop target */}
      <div
        {...getRootProps()}
        className={cn("mh-drop", isDragActive && "drag")}
      >
        <input {...getInputProps()} />
        <UploadCloud
          size={28}
          style={{ color: isDragActive ? "var(--primary)" : "var(--subtle-foreground)" }}
        />
        <div className="text-center">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {isDragActive ? "Drop CVs here" : "Drag & drop CVs, or click to browse"}
          </p>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            PDF or DOCX — single or batch
          </p>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="flex flex-col gap-1">
          {files.map((f) => (
            <div
              key={f.name}
              className="mh-filerow"
            >
              <FileText size={14} style={{ color: "var(--primary)" }} />
              <span className="flex-1 text-xs text-[var(--foreground)] truncate">{f.name}</span>
              <span className="text-xs text-[var(--muted-foreground)]">
                {(f.size / 1024).toFixed(0)} KB
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(f.name); }}
                className="p-0.5 rounded hover:bg-[var(--primary-medium)] transition-colors"
              >
                <X size={12} style={{ color: "var(--muted-foreground)" }} />
              </button>
            </div>
          ))}
          <Button
            onClick={handleUpload}
            loading={isPending}
            disabled={!files.length}
            className="mt-1"
          >
            <UploadCloud size={14} />
            Upload {files.length} CV{files.length > 1 ? "s" : ""}
          </Button>
        </div>
      )}
    </div>
  );
}
