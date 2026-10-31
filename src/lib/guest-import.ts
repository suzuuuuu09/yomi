import { requestJson } from "@/lib/api-client";
import { exportGuestBackup } from "@/lib/guest-library";
import { GuestSnapshotSchema } from "@/lib/guest-schema";

export async function importGuestLibrary(
  expectedUserId: string,
): Promise<void> {
  const snapshot = GuestSnapshotSchema.parse(
    JSON.parse(await exportGuestBackup()),
  );
  for (const book of snapshot.books) {
    await requestJson(
      "/api/guest-import",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedUserId,
          libraryId: snapshot.libraryId,
          readingTimezone: snapshot.readingTimezone,
          readingDayOffset: snapshot.readingDayOffset,
          readingTimezoneRevision: snapshot.readingTimezoneRevision,
          book,
        }),
      },
      (value) => {
        if (
          typeof value !== "object" ||
          value === null ||
          !("ok" in value) ||
          value.ok !== true
        )
          throw new Error("invalid import response");
      },
    );
  }
}
