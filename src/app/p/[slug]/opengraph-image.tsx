import { ImageResponse } from "next/og";
import { unstable_rethrow } from "next/navigation";
import { getPollBySlug } from "@/lib/store-server";
import { computeRankedWindows, formatDateHeader } from "@/lib/slotted-data";
import { logServerIssue } from "@/lib/server-log";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let poll = null;
  try {
    poll = await getPollBySlug(slug);
  } catch (error) {
    unstable_rethrow(error);
    logServerIssue(error);
  }

  const title = poll?.title || "Group Poll";
  const duration = poll?.durationMinutes || 30;
  const participantCount = poll?.participants.length || 1;
  const status = poll?.status || "OPEN";
  const topWin = poll ? computeRankedWindows(poll)[0] : null;
  const bestLabel = topWin
    ? `${formatDateHeader(topWin.date).fullLabel} (${topWin.totalAttendingCount}/${topWin.totalParticipants} free)`
    : `${poll?.candidateDates.length || 3} candidate days`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#F6F5F2",
          color: "#141413",
          padding: "64px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: "#141413",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#F6F5F2",
                fontSize: "20px",
                fontWeight: 700,
              }}
            >
              II
            </div>
            <span style={{ fontSize: "28px", fontWeight: 600 }}>slotted</span>
          </div>

          <div
            style={{
              padding: "8px 20px",
              borderRadius: "9999px",
              backgroundColor: status === "LOCKED" ? "#059669" : "#141413",
              color: "#FFFFFF",
              fontSize: "18px",
              fontWeight: 600,
            }}
          >
            {status} · {duration}m
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#FFFFFF",
            borderRadius: "28px",
            border: "2px solid #E2E0D8",
            padding: "48px",
            gap: "18px",
          }}
        >
          <div style={{ fontSize: "56px", fontWeight: 600, lineHeight: 1.1 }}>
            {title}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "24px",
              fontSize: "24px",
              color: "#575550",
            }}
          >
            <span>{participantCount} responded</span>
            <span>·</span>
            <span style={{ color: "#059669", fontWeight: 600 }}>
              {bestLabel}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "20px",
            color: "#8A8780",
          }}
        >
          <span>Paint your available hours</span>
          <span>slotted.app/p/{slug}</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
