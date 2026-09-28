"use client";

import { useEffect, useRef, useState } from "react";

import {
  deleteVoiceNoteAction,
  uploadVoiceNoteAction
} from "@/features/attendance/server/visit-report-actions";
import type { VisitReportVoiceNoteItem } from "@/features/attendance/server/visit-report-service";
import {
  MAX_VOICE_NOTE_SECONDS as MAX_RECORDING_SECONDS,
  MAX_VOICE_NOTES_PER_REPORT
} from "@/features/attendance/lib/voice-notes";

type RecordedNote = {
  durationSeconds: number;
  id: string;
  url: string;
  status: "uploading" | "uploaded" | "failed" | "deleting";
  // Kept only until the upload succeeds, so a failed upload can be retried.
  file?: File;
};

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function fileExtension(mimeType: string) {
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}

export function VoiceNoteRecorder({
  initialNotes,
  reportId,
  storeId
}: {
  initialNotes: VisitReportVoiceNoteItem[];
  reportId: string;
  storeId: string;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<RecordedNote[]>(() =>
    initialNotes.flatMap((note) =>
      note.url
        ? [
            {
              durationSeconds: note.durationSeconds,
              id: note.id,
              url: note.url,
              status: "uploaded" as const
            }
          ]
        : []
    )
  );
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const discardRef = useRef(false);
  const elapsedRef = useRef(0);
  const noteUrlsRef = useRef<Set<string>>(new Set());
  const isBusy = notes.some((note) => note.status === "uploading" || note.status === "deleting");
  const canRecordMore = notes.length < MAX_VOICE_NOTES_PER_REPORT;

  useEffect(() => {
    if (!isRecording) {
      return;
    }

    const timer = window.setInterval(() => {
      setElapsedSeconds((seconds) => {
        const next = Math.min(seconds + 1, MAX_RECORDING_SECONDS);
        elapsedRef.current = next;
        if (next >= MAX_RECORDING_SECONDS) {
          recorderRef.current?.stop();
        }
        return next;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRecording]);

  useEffect(() => {
    const noteUrls = noteUrlsRef.current;
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      noteUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function updateNote(id: string, patch: Partial<RecordedNote>) {
    setNotes((current) => current.map((note) => (note.id === id ? { ...note, ...patch } : note)));
  }

  async function uploadNote(localId: string, file: File, durationSeconds: number) {
    setError(null);
    updateNote(localId, { status: "uploading" });

    const formData = new FormData();
    formData.set("reportId", reportId);
    formData.set("storeId", storeId);
    formData.set("durationSeconds", String(durationSeconds));
    formData.set("file", file);

    let result: Awaited<ReturnType<typeof uploadVoiceNoteAction>>;
    try {
      result = await uploadVoiceNoteAction(formData);
    } catch {
      result = { error: "Upload failed. Check your connection and retry.", note: null };
    }

    if (result.note) {
      const saved = result.note;
      setNotes((current) =>
        current.map((note) =>
          note.id === localId
            ? {
                durationSeconds: saved.durationSeconds,
                id: saved.id,
                url: note.url,
                status: "uploaded"
              }
            : note
        )
      );
    } else {
      updateNote(localId, { status: "failed" });
      setError(result.error);
    }
  }

  async function startRecording() {
    setError(null);

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Voice recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      discardRef.current = false;
      elapsedRef.current = 0;
      setElapsedSeconds(0);

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      });

      recorder.addEventListener("stop", () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setIsRecording(false);

        if (!discardRef.current && chunksRef.current.length > 0) {
          const mimeType = recorder.mimeType || "audio/webm";
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const file = new File([blob], `voice-note-${Date.now()}.${fileExtension(mimeType)}`, {
            type: mimeType
          });
          const url = URL.createObjectURL(blob);
          const id = crypto.randomUUID();
          const durationSeconds = Math.max(elapsedRef.current, 1);
          noteUrlsRef.current.add(url);
          setNotes((current) => [
            ...current,
            { durationSeconds, id, url, status: "uploading", file }
          ]);
          void uploadNote(id, file, durationSeconds);
        }

        chunksRef.current = [];
      });

      recorder.start();
      setIsRecording(true);
    } catch {
      setError("Microphone access is needed to record a voice note.");
    }
  }

  function stopRecording(discard = false) {
    discardRef.current = discard;
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }

  function dropNote(id: string) {
    setNotes((current) => {
      const note = current.find((item) => item.id === id);
      if (note && noteUrlsRef.current.has(note.url)) {
        URL.revokeObjectURL(note.url);
        noteUrlsRef.current.delete(note.url);
      }
      return current.filter((item) => item.id !== id);
    });
  }

  async function removeNote(note: RecordedNote) {
    setError(null);

    if (note.status === "failed") {
      dropNote(note.id);
      return;
    }

    updateNote(note.id, { status: "deleting" });
    const formData = new FormData();
    formData.set("reportId", reportId);
    formData.set("storeId", storeId);
    formData.set("noteId", note.id);

    let result: { error: string | null };
    try {
      result = await deleteVoiceNoteAction(formData);
    } catch {
      result = { error: "Delete failed. Check your connection and retry." };
    }

    if (result.error) {
      updateNote(note.id, { status: "uploaded" });
      setError(result.error);
    } else {
      dropNote(note.id);
    }
  }

  return (
    <section className="rounded-2xl border-2 border-garnet bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-garnet-tint text-garnet">
            <MicrophoneIcon className="h-5 w-5" />
          </span>
          <h2 className="text-lg font-bold text-text">Voice note</h2>
        </div>
        <span className="rounded-full bg-surface px-3 py-1 text-xs font-bold text-text-2">
          Optional
        </span>
      </div>

      {isRecording ? (
        <div className="mt-5">
          <div className="flex items-center justify-between gap-4 text-sm font-bold">
            <span className="flex items-center gap-2 text-danger">
              <span className="h-3 w-3 rounded-full bg-danger" /> Recording
            </span>
            <span className="font-mono text-text">
              {formatDuration(elapsedSeconds)} <span className="text-text-2">/ 02:00</span>
            </span>
          </div>

          <div className="mt-5 flex h-20 items-center justify-center gap-1 rounded-xl bg-surface px-5">
            {Array.from({ length: 25 }).map((_, index) => (
              <span
                className="w-1 rounded-full bg-garnet"
                key={index}
                style={{ height: `${18 + ((index * 17) % 42)}px` }}
              />
            ))}
          </div>
          <div className="mt-4 h-1 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-garnet transition-[width] duration-1000"
              style={{ width: `${(elapsedSeconds / MAX_RECORDING_SECONDS) * 100}%` }}
            />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              className="h-12 rounded-xl border border-border bg-card text-sm font-bold text-text transition hover:bg-surface"
              onClick={() => stopRecording(true)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="h-12 rounded-xl bg-garnet text-sm font-bold text-white transition hover:bg-garnet-dark"
              onClick={() => stopRecording()}
              type="button"
            >
              Stop &amp; save
            </button>
          </div>
          <p className="mt-4 text-center text-sm text-text-2">
            Speak naturally. You can re-record before submitting.
          </p>
        </div>
      ) : notes.length > 0 ? (
        <div className="mt-5 space-y-3">
          {notes.map((note, index) => (
            <div className="min-w-0 rounded-xl border border-border p-3" key={note.id}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="font-bold text-text">Note {index + 1}</span>
                  <span className="text-xs text-text-2">
                    {formatDuration(note.durationSeconds)}
                  </span>
                  {note.status === "uploading" ? (
                    <span className="text-xs text-text-2">· Uploading...</span>
                  ) : note.status === "deleting" ? (
                    <span className="text-xs text-text-2">· Deleting...</span>
                  ) : note.status === "failed" && note.file ? (
                    <button
                      className="text-xs font-bold text-danger underline"
                      onClick={() => uploadNote(note.id, note.file!, note.durationSeconds)}
                      type="button"
                    >
                      Retry upload
                    </button>
                  ) : (
                    <span className="text-xs text-text-2">· Saved</span>
                  )}
                </div>
                <button
                  aria-label={`Delete note ${index + 1}`}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-text-2 transition hover:bg-danger-tint hover:text-danger disabled:opacity-40"
                  disabled={note.status === "uploading" || note.status === "deleting"}
                  onClick={() => removeNote(note)}
                  type="button"
                >
                  <TrashIcon />
                </button>
              </div>
              <audio
                className="mt-2 block h-10 w-full min-w-0"
                controls
                preload="metadata"
                src={note.url}
              >
                <track kind="captions" />
              </audio>
            </div>
          ))}
          {canRecordMore ? (
            <button
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-garnet text-sm font-bold text-garnet transition hover:bg-garnet-tint disabled:opacity-50"
              disabled={isBusy}
              onClick={startRecording}
              type="button"
            >
              <MicrophoneIcon className="h-5 w-5" /> Record another
            </button>
          ) : (
            <p className="text-center text-xs leading-5 text-text-2">
              Maximum of {MAX_VOICE_NOTES_PER_REPORT} voice notes reached.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-5 text-center">
          <p className="text-left text-sm leading-6 text-text-2">
            Tell your manager what you saw today: customer questions, objections, competitor
            activity, stock or display issues.
          </p>
          <button
            aria-label="Start recording a voice note"
            className="mx-auto mt-5 grid h-24 w-24 place-items-center rounded-full bg-garnet text-white shadow-[0_12px_30px_-8px_rgba(142,42,59,0.65)] transition hover:scale-[1.03] hover:bg-garnet-dark"
            onClick={startRecording}
            type="button"
          >
            <MicrophoneIcon className="h-10 w-10" />
          </button>
          <p className="mt-4 font-bold text-text">Tap to record</p>
          <p className="text-sm text-text-2">Up to 2 minutes</p>
        </div>
      )}

      {error ? (
        <p className="mt-4 rounded-xl bg-danger-tint px-4 py-3 text-sm text-danger">{error}</p>
      ) : null}
    </section>
  );
}

function MicrophoneIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect height="11" rx="4" strokeWidth="2" width="7" x="8.5" y="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3m-3 0h6" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M4 7h16m-10 4v6m4-6v6M9 7l1-3h4l1 3m3 0-1 14H7L6 7"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
