"use client";

import { useRef, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AVATAR_BUCKET, AVATAR_MAX_BYTES, AVATAR_TYPES } from "@/lib/profile/avatar";
import { removeAvatar, setAvatar } from "@/lib/profile/actions";
import { createClient } from "@/lib/supabase/client";

const OUTPUT_SIZE = 512;

// Square-crops and shrinks the photo to 512px WebP so uploads stay small on mobile data.
async function toSquareWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = Math.min(OUTPUT_SIZE, side);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Encoding failed"))), "image/webp", 0.85),
  );
}

export function AvatarUploader({
  userId,
  name,
  path,
}: {
  userId: string;
  name: string;
  path: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    setDone(null);
    if (!AVATAR_TYPES.includes(file.type)) return setError("Choose a JPG, PNG or WebP image.");
    if (file.size > 10 * 1024 * 1024) return setError("That image is too large. Choose one under 10 MB.");

    startTransition(async () => {
      try {
        const blob = await toSquareWebp(file);
        if (blob.size > AVATAR_MAX_BYTES) return setError("That image is too large after resizing.");
        const objectPath = `${userId}/${Date.now()}.webp`;
        const bucket = createClient().storage.from(AVATAR_BUCKET);
        const { error: uploadError } = await bucket.upload(objectPath, blob, {
          contentType: "image/webp",
          upsert: false,
        });
        if (uploadError) return setError("Upload failed. Check your connection and try again.");
        const result = await setAvatar(objectPath);
        if (result.error) {
          await bucket.remove([objectPath]); // don't leave an unused public file behind
          setError(result.error);
        } else {
          setDone("Photo updated.");
        }
      } catch {
        setError("We couldn't read that image. Try a different photo.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <Avatar name={name} path={path} size={72} />
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={AVATAR_TYPES.join(",")}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={onFile}
            aria-label="Choose a profile photo"
          />
          <Button variant="outline" size="sm" disabled={pending} onClick={() => inputRef.current?.click()}>
            {pending ? "Uploading…" : path ? "Change photo" : "Add photo"}
          </Button>
          {path && (
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  await removeAvatar();
                  setDone("Photo removed.");
                });
              }}
            >
              Remove
            </Button>
          )}
        </div>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {done && !error && (
        <p role="status" className="text-sm font-medium text-success">
          {done}
        </p>
      )}
    </div>
  );
}
