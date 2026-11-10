"use client";

import { motion } from "framer-motion";

type FormBuddyProps = {
  name: string;
  nameFocused: boolean;
  hasSignature: boolean;
  consented: boolean;
  submitting: boolean;
  signed: boolean;
  reduceMotion: boolean;
};

export default function FormBuddy({
  name,
  nameFocused,
  hasSignature,
  consented,
  submitting,
  signed,
  reduceMotion,
}: FormBuddyProps) {
  const firstName = name.trim().split(/\s+/)[0];
  const mood = signed
    ? "signed"
    : submitting
      ? "sending"
      : consented && hasSignature && firstName
        ? "ready"
        : hasSignature
          ? "signature"
          : firstName
            ? "named"
            : nameFocused
              ? "typing"
              : "hello";
  const message = {
    signed: "All set! Your promise is safely on the agreement.",
    sending: "Sending your promise with care…",
    ready: "Everything is ready. You’ve got this!",
    signature: firstName
      ? `Lovely signature, ${firstName}! One little checkbox left.`
      : "Lovely signature! Add your name when you’re ready.",
    named: `Nice to meet you, ${firstName}! Add your signature below.`,
    typing: "Psst… write the name you’d like on your agreement.",
    hello: "Hi, I’m Pip! I’ll keep you company while you sign.",
  }[mood];
  const reduced = reduceMotion ? { duration: 0 } : undefined;

  return (
    <div className={`form-buddy form-buddy-${mood}`} aria-live="polite">
      <motion.svg
        className="form-buddy-art"
        viewBox="0 0 100 100"
        role="img"
        aria-label="Pip the signing helper"
        animate={reduceMotion ? undefined : { y: [0, -3, 0], rotate: mood === "ready" || mood === "signed" ? [0, -5, 5, 0] : 0 }}
        transition={reduceMotion ? undefined : { duration: mood === "ready" || mood === "signed" ? 0.6 : 2.4, repeat: mood === "ready" || mood === "signed" ? 1 : Infinity, ease: "easeInOut" }}
      >
        <ellipse cx="49" cy="91" rx="31" ry="6" fill="#263b3512" />
        <motion.ellipse
          cx="34" cy="27"
          rx="10" ry="22"
          fill="#f3d9cf"
          stroke="#a9665b"
          strokeWidth="2"
          transform="rotate(-16 34 27)"
          animate={mood === "ready" || mood === "signed" ? { rotate: [-16, -30, -16] } : undefined}
          transition={reduced ?? { duration: 0.55, repeat: mood === "ready" || mood === "signed" ? 1 : 0 }}
          style={{ transformOrigin: "34px 40px" }}
        />
        <ellipse cx="66" cy="27" rx="10" ry="22" fill="#f3d9cf" stroke="#a9665b" strokeWidth="2" transform="rotate(16 66 27)" />
        <ellipse cx="34" cy="28" rx="4" ry="12" fill="#d99c99" transform="rotate(-16 34 28)" />
        <ellipse cx="66" cy="28" rx="4" ry="12" fill="#d99c99" transform="rotate(16 66 28)" />
        <ellipse cx="50" cy="58" rx="33" ry="30" fill="#fffdf8" stroke="#a9665b" strokeWidth="2" />
        {mood === "typing" ? (
          <>
            <path d="M37 54q4 4 8 0M55 54q4 4 8 0" fill="none" stroke="#263b35" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M47 64q3 3 6 0" fill="none" stroke="#a9665b" strokeWidth="2" strokeLinecap="round" />
          </>
        ) : mood === "signed" ? (
          <>
            <path d="m36 51 4 4 7-8M54 51l4 4 7-8" fill="none" stroke="#557663" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M45 65q5 7 10 0" fill="none" stroke="#a9665b" strokeWidth="2.5" strokeLinecap="round" />
          </>
        ) : (
          <>
            <motion.ellipse cx="40" cy="52" rx="2.6" ry="3.6" fill="#263b35" animate={reduceMotion ? undefined : { scaleY: [1, 1, 0.12, 1] }} transition={reduceMotion ? undefined : { duration: 3.2, repeat: Infinity, times: [0, 0.88, 0.94, 1] }} />
            <motion.ellipse cx="60" cy="52" rx="2.6" ry="3.6" fill="#263b35" animate={reduceMotion ? undefined : { scaleY: [1, 1, 0.12, 1] }} transition={reduceMotion ? undefined : { duration: 3.2, repeat: Infinity, times: [0, 0.88, 0.94, 1] }} />
            <ellipse cx="32" cy="61" rx="5" ry="2.5" fill="#e9b9ae" opacity=".7" />
            <ellipse cx="68" cy="61" rx="5" ry="2.5" fill="#e9b9ae" opacity=".7" />
            {mood === "ready" ? (
              <path d="M44 63q6 8 12 0" fill="none" stroke="#a9665b" strokeWidth="2.5" strokeLinecap="round" />
            ) : (
              <ellipse cx="50" cy="63" rx="2.5" ry="3" fill="#a9665b" />
            )}
          </>
        )}
        {mood === "ready" || mood === "signed" ? (
          <motion.path d="m80 17 2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#d2a35f" initial={{ scale: 0 }} animate={{ scale: [0, 1.15, 1] }} transition={reduced ?? { duration: 0.45 }} />
        ) : null}
      </motion.svg>
      <motion.p
        key={mood + message}
        className="form-buddy-message"
        initial={reduceMotion ? false : { opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={reduced ?? { duration: 0.22 }}
      >
        <span className="form-buddy-name">PIP</span>
        {message}
      </motion.p>
    </div>
  );
}
