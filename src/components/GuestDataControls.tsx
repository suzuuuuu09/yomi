"use client";

import { useRef, useState } from "react";
import { getApiErrorMessage } from "@/lib/api-client";
import { importGuestLibrary } from "@/lib/guest-import";
import {
  clearGuestLibrary,
  exportGuestBackup,
  MAX_BACKUP_BYTES,
  restoreGuestBackup,
} from "@/lib/guest-library";
import { startAccountMode, startGuestMode } from "@/lib/library-mode";
import useLibraryStore from "@/store/useLibraryStore";
import styles from "./guest-data-controls.module.css";

export default function GuestDataControls({
  guest,
  userId,
}: {
  guest: boolean;
  userId?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      setMessage(
        getApiErrorMessage(
          error,
          "操作を完了できませんでした。元の記録は端末に残っています。",
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    const blob = new Blob([await exportGuestBackup()], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `yomi-guest-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage(
      "バックアップを書き出しました。ダウンロード先で保存を確認してください。",
    );
  };

  return (
    <section className={styles.controls} aria-label="ゲストの記録">
      <h3>{guest ? "端末の記録" : "ゲストの記録"}</h3>
      <p>
        別の端末・ブラウザーや、ログイン後のクラウドとは同期しません。ブラウザーのデータを消すと記録も消えます。
      </p>
      <fieldset disabled={busy}>
        <legend className={styles.srOnly}>ゲストの記録を管理</legend>
        <button type="button" onClick={() => void run(download)}>
          バックアップを書き出す
        </button>
        {guest ? (
          <>
            <button type="button" onClick={() => fileInput.current?.click()}>
              バックアップから復元
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".json,application/json"
              aria-label="復元するバックアップ"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                void run(async () => {
                  if (file.size > MAX_BACKUP_BYTES)
                    throw new Error("backup too large");
                  if (
                    !window.confirm(
                      "現在のゲストの記録をバックアップで置き換えます。必要なら先に「バックアップを書き出す」で現在の記録を保存してください。復元しますか？",
                    )
                  )
                    return;
                  await restoreGuestBackup(await file.text());
                  window.location.reload();
                });
              }}
            />
            <button
              type="button"
              onClick={() =>
                void run(async () => {
                  startAccountMode();
                  window.location.assign(userId ? "/app" : "/login");
                })
              }
            >
              {userId ? "アカウントの記録を開く" : "ログインして引き継ぐ"}
            </button>
          </>
        ) : (
          <>
            <p>
              引き継ぎは本ごとに一度だけ行います。同じISBNの本も別々に残し、後からゲスト側を編集しても反映しません。中断時は再試行できます。
            </p>
            <button
              type="button"
              onClick={() =>
                void run(async () => {
                  if (
                    !userId ||
                    !window.confirm(
                      "端末のゲストの記録を、現在ログイン中のアカウントへ引き継ぎますか？元の記録は端末に残ります。",
                    )
                  )
                    return;
                  await importGuestLibrary(userId);
                  await useLibraryStore.getState().fetchBooks();
                  await useLibraryStore.getState().fetchArchivedBooks();
                  setMessage(
                    "引き継ぎが完了しました。既に引き継いだ本は追加していません。元の記録は端末に残り、同期されません。",
                  );
                })
              }
            >
              ゲストの記録を引き継ぐ
            </button>
            <button
              type="button"
              onClick={() =>
                void run(async () => {
                  startGuestMode();
                  window.location.assign("/app");
                })
              }
            >
              ゲストの記録を開く
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() =>
            void run(async () => {
              if (
                !window.confirm(
                  "このブラウザーのゲストの本・メモ・読書ログをすべて削除します。クラウドの記録は残ります。削除しますか？",
                )
              )
                return;
              await clearGuestLibrary();
              if (guest) window.location.reload();
              else setMessage("端末のゲストの記録を削除しました。");
            })
          }
        >
          端末のゲストの記録を削除
        </button>
      </fieldset>
      {busy && <p role="status">処理中です…</p>}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
