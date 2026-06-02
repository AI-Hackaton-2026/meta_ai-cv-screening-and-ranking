import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useUploadCandidates } from "@/lib/queries";

const ACCEPTED = { "application/pdf": [".pdf"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"] };

export function UploadZone({ jobId, onUploaded, compact = false }) {
  const [files, setFiles] = useState([]);
  const { mutateAsync: upload, isPending } = useUploadCandidates(jobId);

  const onDrop = useCallback((accepted) => {
    setFiles((prev) => {
      // Deduplicate by name
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...accepted.filter((f) => !names.has(f.name))];
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    multiple: true,
    noClick: compact,
  });

  const removeFile = (name) => setFiles((prev) => prev.filter((f) => f.name !== name));

  const handleUpload = async () => {
    if (!files.length) return;
    try {
      const result = await upload(files);
      const queued = result.queued ?? 0;
      const errors = result.errors ?? [];
      if (queued > 0) toast.success(`${queued} CV${queued > 1 ? "s" : ""} queued for scoring`);
      if (errors.length > 0) {
        const firstError = errors[0];
        const suffix = errors.length > 1 ? ` (+${errors.length - 1} more)` : "";
        toast.error(`${firstError.filename}: ${firstError.error}${suffix}`);
      }
      setFiles([]);
      onUploaded?.();
    } catch (error) {
      toast.error(error.response?.data?.detail ?? "Upload failed. Check backend connection.");
    }
  };

  if (compact) {
    return (
      <div className="mh-compact-upload">
        <div {...getRootProps({ className: "mh-compact-upload-input" })}>
          <input {...getInputProps()} />
        </div>
        <Button type="button" size="sm" onClick={open}>
          <UploadCloud size={14} />
          Upload CVs
        </Button>
        {files.length > 0 && (
          <>
            <span className="mh-upload-count">
              {files.length} CV{files.length !== 1 ? "s" : ""} selected
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUpload}
              loading={isPending}
              disabled={!files.length}
              className="mh-upload-confirm"
            >
              Confirm
            </Button>
            <button
              type="button"
              className="mh-compact-clear"
              onClick={() => setFiles([])}
              aria-label="Clear selected CVs"
              title="Clear selected CVs"
            >
              <X size={13} />
            </button>
          </>
        )}
      </div>
    );
  }

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
          <div className="mh-filelist-scroll">
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
          </div>
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
