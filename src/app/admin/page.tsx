"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowUpRight, Heart, LogOut, LockKeyhole, PenLine } from "lucide-react";
import SignatureCanvas from "@/components/SignatureCanvas";
import type { Agreement } from "@/lib/agreement";

async function collectAdminEvidence(includeLocation: boolean) {
  const evidence: {
    battery?: { level: number; charging: boolean };
    location?: { latitude: number; longitude: number; accuracy: number };
  } = {};
  const batteryNavigator = navigator as Navigator & { getBattery?: () => Promise<{ level: number; charging: boolean }> };
  try {
    const battery = await batteryNavigator.getBattery?.();
    if (battery) evidence.battery = { level: battery.level, charging: battery.charging };
  } catch {}
  if (includeLocation && navigator.geolocation) {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { maximumAge: 60_000, timeout: 8_000, enableHighAccuracy: false }),
      );
      evidence.location = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy };
    } catch {}
  }
  return evidence;
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [includeLocation, setIncludeLocation] = useState(false);
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadAgreement = async () => {
    const response = await fetch("/api/agreement", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not load the agreement.");
    let record = result.agreement as Agreement;
    if (record.status === "fully_signed") {
      const full = await fetch("/api/agreement/signed", { cache: "no-store" });
      if (full.ok) record = (await full.json()).agreement as Agreement;
    }
    setAgreement(record);
  };

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/session", { cache: "no-store" })
      .then((response) => response.json())
      .then(async (result) => {
        if (!active) return;
        setAuthenticated(Boolean(result.authenticated));
        if (result.authenticated) await loadAgreement();
      })
      .catch(() => setError("Could not connect to the signing service."))
      .finally(() => active && setChecking(false));
    return () => { active = false; };
  }, []);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not sign in.");
      setAuthenticated(true);
      setPassword("");
      await loadAgreement();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  };

  const submitSignature = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          party: "mentor",
          name,
          image: signature,
          agreed,
          evidence: await collectAdminEvidence(includeLocation),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save the signature.");
      setAgreement(result.agreement as Agreement);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the signature.");
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    setAuthenticated(false);
    setAgreement(null);
  };

  return (
    <main className="admin-page">
      <a className="admin-brand" href="/"><span><Heart size={15} fill="currentColor" /></span> little things, big dreams</a>
      <section className="admin-card">
        <div className="eyebrow">MENTOR SIGNING ACCESS</div>
        <h1>{authenticated ? <>The Mentor<br /><em>signature.</em></> : <>Welcome<br /><em>back.</em></>}</h1>
        {checking ? <p className="admin-muted">Checking sign-in…</p> : !authenticated ? (
          <form onSubmit={login}>
            <p className="admin-muted">Sign in to review and sign the Mentor section of the agreement.</p>
            <label className="input-label">Admin password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required autoFocus /></label>
            <button className="sign-button" disabled={busy || !password}>{busy ? "Signing in…" : "Sign in"}<ArrowUpRight size={16} /></button>
          </form>
        ) : (
          <>
            <button className="admin-logout" onClick={() => void logout()}><LogOut size={14} /> Sign out</button>
            <p className="admin-muted">Review the agreement on the <a href="/#sign">public signing page</a>, then sign here as Party A.</p>
            {!agreement ? <p className="admin-muted">Loading agreement…</p> : agreement.status === "withdrawn" ? <p className="admin-error">This agreement has been withdrawn and cannot be signed.</p> : agreement.mentor ? (
              <div className="admin-signed"><span className="signed-label">SIGNED</span><b>{agreement.mentor.name}</b><small>{new Date(agreement.mentor.signed_at).toLocaleString()}</small>{agreement.mentor.image && <img src={agreement.mentor.image} alt="Mentor signature" />}</div>
            ) : (
              <div className="admin-sign-form">
                <div className="sign-card-head"><PenLine size={17} /><span>PARTY A · THE MENTOR</span><span className="pending-label">PENDING</span></div>
                <label className="input-label">Your full name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Write your name" maxLength={120} /></label>
                <SignatureCanvas onChange={setSignature} />
                <label className="consent"><input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} /><span>I’ve read the agreement and choose to sign it freely.</span></label>
                <label className="consent"><input type="checkbox" checked={includeLocation} onChange={(event) => setIncludeLocation(event.target.checked)} /><span>Optionally include my device location. Your browser will ask for permission.</span></label>
                <small className="access-hint">Browser details and network IP are recorded; battery and location are included when available and permitted.</small>
                <button className="sign-button" disabled={busy || !name.trim() || !signature || !agreed} onClick={() => void submitSignature()}>{busy ? "Saving signature…" : "Sign as the Mentor"}<ArrowUpRight size={16} /></button>
              </div>
            )}
          </>
        )}
        {error && <p className="admin-error" role="alert"><LockKeyhole size={14} />{error}</p>}
      </section>
    </main>
  );
}
