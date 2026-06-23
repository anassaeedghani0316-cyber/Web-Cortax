import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import { FileText, Trash2, Upload, CheckCircle2, AlertCircle, Loader2, FileSpreadsheet } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({ meta: [{ title: "Documents · Cortex Flow" }] }),
  component: DocumentsPage,
});

function pick(row: Record<string, any>, keys: string[]): string | undefined {
  for (const k of Object.keys(row)) {
    const norm = k.toLowerCase().replace(/[\s_-]/g, "");
    if (keys.includes(norm)) return row[k];
  }
  return undefined;
}

async function parseCsvToTransactions(
  file: File,
  userId: string,
  documentId: string,
): Promise<{ inserted: number; skipped: number }> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows: any[] = [];
        let skipped = 0;
        for (const raw of results.data as Record<string, any>[]) {
          const dateStr = pick(raw, ["date", "occurredon", "occureddate", "transactiondate", "postdate"]);
          const desc = pick(raw, ["description", "desc", "merchant", "name", "details", "memo"]) ?? "Transaction";
          const cat = pick(raw, ["category", "type", "tag"]) ?? "Other";
          const amtStr = pick(raw, ["amount", "value", "debit", "credit"]);
          const typeStr = pick(raw, ["type", "transactiontype", "kind"]);
          if (!dateStr || !amtStr) { skipped++; continue; }
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) { skipped++; continue; }
          const amt = parseFloat(String(amtStr).replace(/[^0-9.\-]/g, ""));
          if (isNaN(amt)) { skipped++; continue; }
          const inferredType =
            typeStr && /income|credit|deposit/i.test(typeStr) ? "income" :
            typeStr && /expense|debit|withdraw/i.test(typeStr) ? "expense" :
            amt < 0 ? "expense" : "income";
          rows.push({
            user_id: userId,
            document_id: documentId,
            occurred_on: d.toISOString().slice(0, 10),
            description: String(desc).slice(0, 200),
            category: String(cat).slice(0, 50),
            amount: Math.abs(amt),
            type: inferredType,
          });
        }
        if (rows.length > 0) {
          const { error } = await supabase.from("transactions").insert(rows);
          if (error) { resolve({ inserted: 0, skipped: skipped + rows.length }); return; }
        }
        resolve({ inserted: rows.length, skipped });
      },
      error: () => resolve({ inserted: 0, skipped: 0 }),
    });
  });
}

function DocumentsPage() {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data } = await supabase.from("financial_documents").select("*").order("upload_date", { ascending: false });
      return data ?? [];
    },
  });

  const upload = useCallback(async (files: File[]) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setUploading(true);
    setProgress(10);
    try {
      for (const file of files) {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
        const path = `${u.user.id}/${Date.now()}-${file.name}`;
        const { error: uErr } = await supabase.storage.from("financial-documents").upload(path, file);
        if (uErr) throw uErr;
        setProgress(50);
        const { data: docRow, error: dErr } = await supabase.from("financial_documents").insert({
          user_id: u.user.id,
          file_name: file.name,
          document_type: ext.toUpperCase(),
          file_path: path,
          status: "processed",
        }).select().single();
        if (dErr) throw dErr;
        setProgress(75);
        if (ext === "csv" && docRow) {
          const { inserted, skipped } = await parseCsvToTransactions(file, u.user.id, docRow.id);
          toast.success(`${file.name}: ${inserted} transactions imported${skipped ? `, ${skipped} skipped` : ""}`);
        } else {
          toast.success(`Uploaded ${file.name}`);
        }
      }
      setProgress(100);
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["recent-docs"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setTimeout(() => { setUploading(false); setProgress(0); }, 400);
    }
  }, [qc]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: upload,
    accept: { "application/pdf": [".pdf"], "text/csv": [".csv"] },
    multiple: true,
  });

  async function remove(doc: any) {
    if (!confirm(`Delete "${doc.file_name}"? This will also remove any imported transactions.`)) return;
    await supabase.storage.from("financial-documents").remove([doc.file_path]);
    // ON DELETE CASCADE on transactions.document_id removes linked transactions automatically
    await supabase.from("financial_documents").delete().eq("id", doc.id);
    qc.invalidateQueries({ queryKey: ["documents"] });
    qc.invalidateQueries({ queryKey: ["transactions"] });
    toast.success("Document and linked transactions deleted");
  }

  return (
    <AppShell>
      <div className="animate-fade-up space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Documents</h1>
          <p className="mt-1 text-sm text-muted-foreground">Upload bank statements and reports. PDF and CSV supported.</p>
        </div>

        <div
          {...getRootProps()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed bg-glass p-10 text-center backdrop-blur transition ${
            isDragActive ? "border-violet bg-violet/10" : "border-border hover:border-violet/40"
          }`}
        >
          <input {...getInputProps()} />
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl gradient-violet glow-violet">
            <Upload className="text-white" size={22} />
          </div>
          <p className="font-display text-lg font-semibold">
            {isDragActive ? "Drop to upload" : "Drop your PDF or CSV here"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">or click to browse — max 25MB per file</p>
          {uploading && (
            <div className="mx-auto mt-4 h-1.5 max-w-xs overflow-hidden rounded-full bg-white/10">
              <div className="h-full gradient-violet transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-glass backdrop-blur-xl">
          <div className="border-b border-border p-5">
            <h2 className="font-display text-lg font-semibold">Your documents</h2>
            <p className="text-xs text-muted-foreground">{docs.length} total</p>
          </div>
          {isLoading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <Loader2 className="mx-auto animate-spin" />
            </div>
          ) : docs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-glass">
                <FileText className="text-muted-foreground" size={20} />
              </div>
              <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="px-5 py-3 font-medium">File Name</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Uploaded</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d: any) => (
                    <tr key={d.id} className="border-b border-border/50 transition hover:bg-glass-hover">
                      <td className="px-5 py-3">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-3">
                            {d.document_type === "CSV" ? <FileSpreadsheet size={16} className="text-emerald" /> : <FileText size={16} className="text-violet" />}
                            <span className="font-medium">{d.file_name}</span>
                          </div>
                          <span className="pl-7 text-[11px] text-muted-foreground">
                            {formatDateTime(d.upload_date)}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{d.document_type}</td>
                      <td className="px-5 py-3 text-muted-foreground">{formatDateTime(d.upload_date)}</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button onClick={() => remove(d)} className="rounded-md p-1.5 text-muted-foreground transition hover:bg-rose/10 hover:text-rose">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} · ${time}`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: any; label: string }> = {
    processed: { cls: "bg-emerald/10 text-emerald border-emerald/30", icon: CheckCircle2, label: "Processed" },
    processing: { cls: "bg-amber/10 text-amber border-amber/30", icon: Loader2, label: "Processing" },
    failed: { cls: "bg-rose/10 text-rose border-rose/30", icon: AlertCircle, label: "Failed" },
  };
  const s = map[status] ?? map.processed;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${s.cls}`}>
      <Icon size={11} className={status === "processing" ? "animate-spin" : ""} />
      {s.label}
    </span>
  );
}
