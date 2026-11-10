"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Download,
  Heart,
  LockKeyhole,
  PenLine,
  X,
} from "lucide-react";
import type { Agreement, Party } from "@/lib/agreement";
import { jsPDF } from "jspdf";
import WithdrawalControl from "@/components/WithdrawalControl";
import SignatureCanvas from "@/components/SignatureCanvas";
import CinematicJourney from "@/components/CinematicJourney";
import FormBuddy from "@/components/FormBuddy";
import {
  learnerCommitments,
  learnerPrivileges,
  mentorResponsibilities,
  specialConditions,
} from "@/lib/contract-content";

const partyNames: Record<Party, string> = {
  mentor: "The Mentor",
  student: "Pragati",
};
async function collectSigningEvidence(includeLocation: boolean) {
  const evidence: {
    battery?: { level: number; charging: boolean };
    location?: { latitude: number; longitude: number; accuracy: number };
  } = {};
  const batteryNavigator = navigator as Navigator & {
    getBattery?: () => Promise<{ level: number; charging: boolean }>;
  };
  try {
    const battery = await batteryNavigator.getBattery?.();
    if (battery) evidence.battery = { level: battery.level, charging: battery.charging };
  } catch {
    // Battery status is optional and unsupported in many browsers.
  }
  if (includeLocation && "geolocation" in navigator) {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { maximumAge: 60_000, timeout: 8_000, enableHighAccuracy: false }),
      );
      evidence.location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
    } catch {
      // A denied or unavailable location never prevents signing.
    }
  }
  return evidence;
}

export default function Home() {
  const [agreement, setAgreement] = useState<Agreement | null>(null),
    [error, setError] = useState(""),
    [access, setAccess] = useState("");
  const [names, setNames] = useState<Record<Party, string>>({
    mentor: "",
    student: "Pragati",
  });
  const [signatures, setSignatures] = useState<Record<Party, string | null>>({
    mentor: null,
    student: null,
  });
  const [checks, setChecks] = useState<Record<Party, boolean>>({
    mentor: false,
    student: false,
  });
  const [busy, setBusy] = useState<Party | null>(null);
  const [nameFocused, setNameFocused] = useState(false);
  const [includeLocation, setIncludeLocation] = useState<Record<Party, boolean>>({ mentor: false, student: false });
  // Start with the same value on the server and first client render; read the device preference after hydration.
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const token =
      new URLSearchParams(location.hash.slice(1)).get("access") || "";
    setAccess(token);
    const load = async () => {
      try {
        const r = await fetch("/api/agreement");
        const d = await r.json();
        if (d.agreement) {
          let record = d.agreement;
          if (token && record.status === "fully_signed") {
            const full = await fetch("/api/agreement/signed", {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (full.ok) record = (await full.json()).agreement;
          }
          setAgreement(record);
        } else if (d.error) setError(d.error);
      } catch {
        setError("Could not connect to agreement storage.");
      }
    };
    void load();
    const t = setInterval(() => void load(), 10000);
    return () => clearInterval(t);
  }, []);
  const signed = Number(!!agreement?.mentor) + Number(!!agreement?.student);
  const status =
    agreement?.status === "withdrawn"
      ? "Withdrawn"
      : signed === 2
        ? "Fully signed"
        : signed === 1
          ? "Partially signed"
          : "Awaiting signatures";
  const submit = async (party: Party) => {
    setBusy(party);
    setError("");
    try {
      const r = await fetch("/api/sign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access}`,
        },
        body: JSON.stringify({
          party,
          name: names[party],
          image: signatures[party],
          agreed: checks[party],
          evidence: await collectSigningEvidence(includeLocation[party]),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not save signature");
      setAgreement(d.agreement);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save signature");
    } finally {
      setBusy(null);
    }
  };
  const download = (final: boolean) => {
    if (
      final &&
      (signed !== 2 ||
        agreement?.status !== "fully_signed" ||
        !agreement.mentor?.image ||
        !agreement.student?.image)
    )
      return;
    const doc = new jsPDF({ format: "a4", unit: "mm" });
    const id = agreement?.id || "HG-2026-XXXXX";
    const navy = [33, 42, 61] as const;
    const addHeader = (page: number) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(110);
      doc.text(`THE HALF GIRLFRIEND CONTRACT  •  ${id}`, 20, 14);
      doc.text(`${page} / 4`, 190, 14, { align: "right" });
      doc.setDrawColor(210);
      doc.line(20, 18, 190, 18);
    };
    const heading = (s: string, y: number) => {
      doc.setTextColor(...navy);
      doc.setFont("times", "bold");
      doc.setFontSize(19);
      doc.text(s, 20, y);
      doc.setTextColor(40);
    };
    const para = (s: string, y: number, size = 11) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(size);
      doc.setTextColor(45);
      const lines = doc.splitTextToSize(s, 168);
      doc.text(lines, 20, y);
      return y + lines.length * 5.5;
    };
    const list = (items: string[], y: number) =>
      items.reduce((at, item, i) => para(`${i + 1}. ${item}`, at, 10.5), y);
    addHeader(1);
    doc.setFont("times", "bold");
    doc.setFontSize(25);
    doc.setTextColor(...navy);
    doc.text("FRIENDSHIP & MENTORSHIP", 20, 45);
    doc.text("AGREEMENT", 20, 56);
    if (!final) {
      doc.setTextColor(190, 60, 80);
      doc.setFontSize(13);
      doc.text("DRAFT — AWAITING SIGNATURES", 20, 67);
    }
    doc.setTextColor(50);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Agreement ID: ${id}`, 20, 82);
    doc.text(
      `Created: ${agreement?.created_at ? new Date(agreement.created_at).toLocaleDateString() : "Pending setup"}`,
      20,
      89,
    );
    doc.setDrawColor(210);
    doc.line(20, 98, 190, 98);
    heading("The parties", 112);
    para(
      `Party A — The Mentor: ${agreement?.mentor?.name || "Awaiting signature"}`,
      123,
    );
    para(
      `Party B — Pragati: ${agreement?.student?.name || "Awaiting signature"}`,
      133,
    );
    heading("Purpose", 151);
    para(
      "You provide knowledge, guidance and support; she provides genuine effort and consistency. Both share friendship, respect, freedom and fun. This is a voluntary, non-legal friendship and mentorship agreement.",
      162,
    );
    doc.addPage();
    addHeader(2);
    heading("Commitments & responsibilities", 35);
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text("My demands — The Learner", 20, 47);
    list(learnerCommitments, 57);
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text("My responsibilities — The Mentor", 20, 112);
    list(mentorResponsibilities, 122);
    doc.addPage();
    addHeader(3);
    heading("Privileges & conditions", 35);
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text("Her privileges", 20, 47);
    list(learnerPrivileges, 57);
    heading("Special conditions", 112);
    list(specialConditions, 124);
    doc.addPage();
    addHeader(4);
    heading("Declaration & signatures", 37);
    para(
      "Both parties confirm that they have read and understood this agreement and voluntarily accept its terms with mutual respect, friendship, honesty and a little bit of craziness.",
      50,
    );
    doc.setFont("times", "italic");
    doc.setFontSize(14);
    doc.text(
      "“Signed with friendship, dedication and questionable romantic intentions.”",
      20,
      75,
    );
    const blocks = [
      { party: "mentor" as Party, y: 108 },
      { party: "student" as Party, y: 160 },
    ];
    for (const b of blocks) {
      const s = agreement?.[b.party];
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(partyNames[b.party], 20, b.y);
      doc.setDrawColor(180);
      doc.line(20, b.y + 29, 105, b.y + 29);
      doc.setFont("helvetica", "normal");
      doc.text(s?.name || "Pending", 20, b.y + 36);
      doc.setFontSize(9);
      doc.text(
        s?.signed_at ? new Date(s.signed_at).toLocaleString() : "Not signed",
        20,
        b.y + 42,
      );
      if (s?.image)
        try {
          doc.addImage(s.image, "PNG", 112, b.y - 3, 65, 32);
        } catch {}
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(
      `Status: ${final ? "FULLY SIGNED" : "DRAFT — AWAITING SIGNATURES"}`,
      20,
      222,
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(
      "Mutual Friendship & Mentorship Agreement | The Half Girlfriend Contract 1.0",
      105,
      284,
      { align: "center" },
    );
    doc.save(`${id}-${final ? "signed" : "draft"}.pdf`);
  };
  if (agreement?.status === "withdrawn") {
    return (
      <main className="withdrawn-view">
        <div className="withdrawn-panel">
          <span className="eyebrow">AGREEMENT WITHDRAWN</span>
          <h1>
            This agreement is
            <br />
            <em>closed.</em>
          </h1>
          <p>
            It was withdrawn by one of the parties. It can no longer be signed
            or executed.
          </p>
          <div className="withdrawn-meta">
            <span>AGREEMENT ID</span>
            <b>{agreement.id}</b>
          </div>
          <div className="withdrawn-meta">
            <span>PARTY A</span>
            <b>{agreement.mentor?.name || "Not signed"}</b>
          </div>
          <div className="withdrawn-meta">
            <span>PARTY B</span>
            <b>{agreement.student?.name || "Not signed"}</b>
          </div>
          <a className="button-dark" href="/">
            Return to agreement
          </a>
        </div>
      </main>
    );
  }

  return (
    <main id="top">
      {agreement && access && (
        <WithdrawalControl
          token={access}
          onWithdraw={setAgreement}
          onError={setError}
        />
      )}
      <CinematicJourney reduceMotion={reduceMotion} />
      <section className="status-section section-pad" id="sign">
        <div className="status-header">
          <div>
            <div className="eyebrow">THE LIVE AGREEMENT</div>
            <h2>
              A little status
              <br />
              <em>check-in.</em>
            </h2>
          </div>
          <div className="status-pill">
            <span className={signed === 2 ? "pulse done" : "pulse"} />
            {status}
          </div>
        </div>
        <div className="status-board">
          <div className="status-card">
            <span className="status-symbol">A</span>
            <div>
              <small>PARTY A</small>
              <h3>{agreement?.mentor?.name || "The Mentor"}</h3>
            </div>
            <span
              className={agreement?.mentor ? "signed-label" : "pending-label"}
            >
              {agreement?.mentor ? "SIGNED ✓" : "PENDING"}
            </span>
          </div>
          <div className="progress-line">
            <span style={{ width: `${signed * 50}%` }} />
          </div>
          <div className="status-card">
            <span className="status-symbol pink">B</span>
            <div>
              <small>PARTY B</small>
              <h3>{agreement?.student?.name || "Pragati"}</h3>
            </div>
            <span
              className={agreement?.student ? "signed-label" : "pending-label"}
            >
              {agreement?.student ? "SIGNED ✓" : "PENDING"}
            </span>
          </div>
          <div className="progress-meta">
            <span>{signed} / 2 SIGNATURES</span>
            <span>AGREEMENT ID: {agreement?.id || "HG-2026-XXXXX"}</span>
          </div>
        </div>
        <details className="review-document">
          <summary>Read the complete agreement before signing</summary>
          <div className="review-content">
            <h3>Purpose</h3>
            <p>This voluntary agreement establishes a special friendship and mentorship arrangement. Party A will provide knowledge, guidance and support; Party B will bring genuine effort and consistency. Both share friendship, respect, freedom and fun.</p>
            <h3>My demands — learner commitments</h3>
            <ol>{learnerCommitments.map((item) => <li key={item}>{item}</li>)}</ol>
            <h3>My responsibilities — Mentor</h3>
            <ol>{mentorResponsibilities.map((item) => <li key={item}>{item}</li>)}</ol>
            <h3>Her privileges</h3>
            <ol>{learnerPrivileges.map((item) => <li key={item}>{item}</li>)}</ol>
            <h3>Conditions, boundaries and withdrawal</h3>
            <ol>{specialConditions.map((item) => <li key={item}>{item}</li>)}</ol>
            <p>This begins when both people voluntarily sign. Either person may withdraw at any time without punishment, financial liability or emotional pressure. Mentorship may continue independently of the designation. Neither person owes romantic affection, physical intimacy or emotional availability.</p>
          </div>
        </details>
        {!agreement?.mentor || !agreement?.student ? (
          <>
            <div className="sign-grid">
              {(["student"] as Party[]).map((party) => {
                const saved = agreement?.[party];
                return (
                  <div className="sign-card" key={party}>
                    <div className="sign-card-head">
                      <PenLine size={18} />
                      <span>{partyNames[party]}</span>
                      <span
                        className={saved ? "signed-label" : "pending-label"}
                      >
                        {saved ? "SIGNED" : "PENDING"}
                      </span>
                    </div>
                    <FormBuddy
                      name={names[party]}
                      nameFocused={nameFocused}
                      hasSignature={!!signatures[party]}
                      consented={checks[party]}
                      submitting={busy === party}
                      signed={!!saved}
                      reduceMotion={reduceMotion}
                    />
                    {saved ? (
                      <div className="saved-sign">
                        <b>{saved.name}</b>
                        <small>
                          {new Date(saved.signed_at).toLocaleString()}
                        </small>
                      </div>
                    ) : (
                      <form
                        className="sign-form"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void submit(party);
                        }}
                      >
                        <label className="input-label">
                          Your full name
                          <input
                            suppressHydrationWarning
                            autoComplete="name"
                            required
                            value={names[party]}
                            onFocus={() => setNameFocused(true)}
                            onBlur={() => setNameFocused(false)}
                            onChange={(e) => setNames({ ...names, [party]: e.target.value })}
                            placeholder="Write your name"
                            maxLength={120}
                          />
                        </label>
                        <SignatureCanvas
                          onChange={(image) =>
                            setSignatures({ ...signatures, [party]: image })
                          }
                        />
                        <label className="consent">
                          <input
                            suppressHydrationWarning
                            type="checkbox"
                            required
                            checked={checks[party]}
                            onChange={(e) =>
                              setChecks({
                                ...checks,
                                [party]: e.target.checked,
                              })
                            }
                          />
                          <span>
                            I’ve read the agreement and choose to sign it
                            freely.
                          </span>
                        </label>
                        <label className="consent">
                          <input suppressHydrationWarning type="checkbox" checked={includeLocation[party]} onChange={(e) => setIncludeLocation({ ...includeLocation, [party]: e.target.checked })} />
                          <span>Optionally include my device location with this signature. Your browser will ask for permission.</span>
                        </label>
                        <button
                          suppressHydrationWarning
                          type="submit"
                          className="sign-button"
                          disabled={
                            busy !== null ||
                            !names[party].trim() ||
                            !signatures[party] ||
                            !checks[party]
                          }
                        >
                          {busy === party
                            ? "Saving securely…"
                            : "Sign the agreement"}
                          <ArrowUpRight size={16} />
                        </button>
                        <small className="access-hint">Browser details and network IP are recorded; battery and location are included when available and permitted.</small>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="download-row">
              <div>
                <b>Want a copy to read first?</b>
                <span>
                  A draft PDF is available while signatures are pending.
                </span>
              </div>
              <button
                suppressHydrationWarning
                onClick={() => download(false)}
                className="button-outline"
              >
                <Download size={16} /> Download preview
              </button>
            </div>
          </>
        ) : (
          <div className="celebration">
            <div className="celebration-seal">♡</div>
            <div className="eyebrow">TWO SIGNATURES. ONE LEARNING JOURNEY.</div>
            <h2>
              It’s official…
              <br />
              <em>well, officially unofficial!</em>
            </h2>
            <p>
              Two signatures. One learning journey. Unlimited possibilities.
            </p>
            {agreement.mentor?.image && agreement.student?.image ? (
              <div className="signed-pair">
                {(["mentor", "student"] as Party[]).map(
                  (p) =>
                    agreement?.[p] && (
                      <div className="signed-tile" key={p}>
                        <img
                          src={agreement[p]!.image}
                          alt={`${agreement[p]!.name} signature`}
                        />
                        <b>{agreement[p]!.name}</b>
                        <small>
                          {new Date(agreement[p]!.signed_at).toLocaleString()}
                        </small>
                      </div>
                    ),
                )}
              </div>
            ) : (
              <p>
                Open your personal signing link to view signatures and download
                the completed copy.
              </p>
            )}
            <button
              suppressHydrationWarning
              disabled={!agreement.mentor?.image || !agreement.student?.image}
              onClick={() => download(true)}
              className="button-dark"
            >
              <Download size={17} /> Download fully signed agreement
            </button>
          </div>
        )}
        {error && (
          <div role="alert" className="error-message">
            {error}
            <button suppressHydrationWarning onClick={() => setError("")} aria-label="Dismiss">
              <X size={16} />
            </button>
          </div>
        )}
        <div className="legal-note">
          <LockKeyhole size={14} />
          <span>
            This is a playful, voluntary friendship and mentorship agreement,
            not a legally enforceable romantic or obedience contract. No one
            owes affection, intimacy, or continued participation.
          </span>
        </div>
      </section>
      <footer>
        <a className="brand" href="#top">
          <span className="brand-icon">
            <Heart size={15} fill="currentColor" />
          </span>{" "}
          little things, big dreams
        </a>
        <span>MADE WITH CARE, A DASH OF PYTHON & LOTS OF HEART</span>
        <a href="/admin">Mentor sign in</a>
        <span>© 2026</span>
      </footer>
    </main>
  );
}
