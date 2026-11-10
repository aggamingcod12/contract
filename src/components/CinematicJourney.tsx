"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { FallingLeaves } from "falling-leaves/react";
import {
  learnerCommitments,
  learnerPrivileges,
  mentorResponsibilities,
  specialConditions,
} from "@/lib/contract-content";

const cards = [
  { label: "01 / 03", title: "A friendship, first.", body: "A small promise for two people who want to learn, grow and show up for each other." },
  { label: "02 / 03", title: "A learning journey.", body: "Clear guidance, kind encouragement and room to find your own pace." },
  { label: "03 / 03", title: "A very unofficial title.", body: "The Half Girlfriend Contract, made with care, consent and a little bit of Python." },
];

const agreementSections = [
  { number: "01", label: "MY DEMANDS · THE LEARNER", title: "Show up with curiosity and effort.", items: learnerCommitments },
  { number: "02", label: "MY RESPONSIBILITIES · THE MENTOR", title: "Guidance, patience and practical skills.", items: mentorResponsibilities },
  { number: "03", label: "HER PRIVILEGES", title: "Support for every step of the journey.", items: learnerPrivileges },
  { number: "04", label: "SPECIAL CONDITIONS", title: "Friendship, freedom and respect come first.", items: specialConditions },
];

export default function CinematicJourney({ reduceMotion }: { reduceMotion: boolean }) {
  const [started, setStarted] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [heartSpinning, setHeartSpinning] = useState(false);
  const revealProgress = useMotionValue(0);
  const heartScaleProgress = useTransform(
    revealProgress,
    [0, 0.12, 0.2, 0.34, 0.42, 0.56, 0.64, 0.79, 0.86, 1],
    [0.38, 0.62, 0.52, 0.84, 0.72, 1.05, 0.94, 1.28, 1.15, 1.48],
  );
  const heartScale = useSpring(heartScaleProgress, { stiffness: 190, damping: 22 });
  const heartRotation = useTransform(revealProgress, [0, 0.5, 1], [-14, 3, 0]);
  const revealRingScale = useTransform(revealProgress, [0, 1], [0.55, 1.2]);
  const revealProgressRef = useRef(0);
  const lastTouchY = useRef<number | null>(null);
  const spinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const card = cards[cardIndex];
  const shuffle = () => setCardIndex((index) => (index + 1) % cards.length);
  const start = () => {
    if (reduceMotion) {
      setStarted(true);
      return;
    }
    revealProgressRef.current = 0;
    revealProgress.set(0);
    setRevealing(true);
  };

  useEffect(() => {
    document.body.classList.toggle("intro-locked", !started);
    return () => document.body.classList.remove("intro-locked");
  }, [started]);

  useEffect(() => {
    const spinHeart = () => {
      setHeartSpinning(true);
      if (spinTimer.current) clearTimeout(spinTimer.current);
      spinTimer.current = setTimeout(() => setHeartSpinning(false), 850);
    };
    window.addEventListener("wheel", spinHeart, { passive: true });
    window.addEventListener("touchmove", spinHeart, { passive: true });
    return () => {
      window.removeEventListener("wheel", spinHeart);
      window.removeEventListener("touchmove", spinHeart);
      if (spinTimer.current) clearTimeout(spinTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!revealing) return;
    const advanceReveal = (delta: number) => {
      const next = Math.max(0, Math.min(1, revealProgressRef.current + delta / (window.innerHeight * 2)));
      revealProgressRef.current = next;
      revealProgress.set(next);
      if (next >= 1) {
        setStarted(true);
        setRevealing(false);
      }
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      advanceReveal(event.deltaY);
    };
    const onTouchStart = (event: TouchEvent) => {
      lastTouchY.current = event.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (event: TouchEvent) => {
      event.preventDefault();
      const currentY = event.touches[0]?.clientY;
      if (currentY !== undefined && lastTouchY.current !== null) {
        advanceReveal(lastTouchY.current - currentY);
        lastTouchY.current = currentY;
      }
    };
    const onTouchEnd = () => {
      lastTouchY.current = null;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const step = window.innerHeight * 0.12;
      if (["ArrowDown", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        advanceReveal(step);
      } else if (["ArrowUp", "PageUp"].includes(event.key)) {
        event.preventDefault();
        advanceReveal(-step);
      }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKeyDown);
      lastTouchY.current = null;
    };
  }, [revealing, revealProgress]);

  return (
    <>
    <section className={`hero-intro${started ? " is-started" : ""}${revealing ? " is-revealing" : ""}`} id="cinema" aria-label="The Half Girlfriend Contract introduction">
      <div className="hero-intro-glow" />
      {!reduceMotion && <FallingLeaves count={100} size={[8, 16]} speed={[0.22, 0.5]} wind={[-0.1, 0.18]} sway={[0.25, 0.65]} colors={["#FFC0CB ", "#FFC0CB ", "#FFC0CB "]} shapes={["ginkgo", "oval"]} opacity={0.32} zIndex={1} respectReducedMotion />}
      <div className="hero-intro-orbit" aria-hidden="true" />
      <div className={`hero-heart-stage${heartSpinning ? " is-spinning" : ""}`} aria-hidden="true">
        <div className="hero-heart-shadow" />
        <div className="hero-heart-3d">
          <svg className="hero-heart-art" viewBox="0 0 240 230" role="presentation">
            <defs>
              <linearGradient id="heart-gradient" x1="20%" y1="0%" x2="85%" y2="100%">
                <stop offset="0%" stopColor="#ffc5d4" />
                <stop offset="48%" stopColor="#ee7895" />
                <stop offset="100%" stopColor="#b83d65" />
              </linearGradient>
              <linearGradient id="heart-highlight" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fff" stopOpacity=".72" />
                <stop offset="100%" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M120 218C104 200 18 143 18 80 18 43 43 19 78 19c20 0 34 10 42 27 8-17 22-27 42-27 35 0 60 24 60 61 0 63-86 120-102 138Z" fill="#a9385c" opacity=".3" transform="translate(0 7)" />
            <path d="M120 210C104 192 18 135 18 72 18 35 43 11 78 11c20 0 34 10 42 27 8-17 22-27 42-27 35 0 60 24 60 61 0 63-86 120-102 138Z" fill="url(#heart-gradient)" stroke="#fff" strokeOpacity=".3" strokeWidth="2" />
            <path d="M47 61c4-17 17-26 33-26 12 0 21 5 28 14-7 3-13 9-17 18-8 17-20 35-31 34-13-1-18-20-13-40Z" fill="url(#heart-highlight)" opacity=".8" />
          </svg>
        </div>
      </div>
      <div className="hero-intro-copy">
        <span className="hero-intro-eyebrow"><Sparkles size={13} /> A LETTER FOR TWO PEOPLE</span>
        <h1>The Half Girlfriend <em>Contract ❤️💻</em></h1>
        <p>Love, logic and a learning journey made just for the two of you.</p>
        {!started && <motion.button suppressHydrationWarning className="hero-start-button" onClick={start} disabled={revealing} whileTap={{ scale: 0.97 }}>Let&apos;s start <ArrowRight size={17} /></motion.button>}
      </div>
      <AnimatePresence>
        {revealing && <motion.div
          className="cinematic-reveal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35 } }}
          transition={{ duration: 0.2 }}
          aria-hidden="true"
        >
          <div className="cinematic-reveal-glow" />
          <motion.div className="reveal-ring reveal-ring-one" style={{ scale: revealRingScale }} />
          <motion.div className="reveal-ring reveal-ring-two" style={{ scale: revealRingScale }} />
          <motion.div
            className="reveal-heart"
            style={{ scale: heartScale, rotate: heartRotation }}
          >
            <svg viewBox="0 0 240 230">
              <defs>
                <linearGradient id="reveal-heart-gradient" x1="20%" y1="0%" x2="85%" y2="100%">
                  <stop offset="0%" stopColor="#ffe0e8" />
                  <stop offset="48%" stopColor="#ee7895" />
                  <stop offset="100%" stopColor="#b83d65" />
                </linearGradient>
              </defs>
              <path d="M120 210C104 192 18 135 18 72 18 35 43 11 78 11c20 0 34 10 42 27 8-17 22-27 42-27 35 0 60 24 60 61 0 63-86 120-102 138Z" fill="url(#reveal-heart-gradient)" />
            </svg>
          </motion.div>
          <div className="reveal-message">
            <span>A PROMISE, MADE TOGETHER</span>
            <strong>Here&apos;s to your next chapter.</strong>
            <small>SCROLL TO REVEAL · 2 SCREEN-HEIGHTS</small>
          </div>
          <div className="reveal-progress-track">
            <motion.div className="reveal-progress-fill" style={{ scaleX: revealProgress }} />
          </div>
        </motion.div>}
      </AnimatePresence>
      <AnimatePresence>
        {started && <motion.div className="shuffle-deck" initial={{ opacity: 0, scale: 0.94, y: 28 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: reduceMotion ? 0 : 0.18, duration: reduceMotion ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] }}>
          <div className="shuffle-back shuffle-back-two" />
          <div className="shuffle-back shuffle-back-one" />
          <AnimatePresence mode="wait" initial={false}>
            <motion.button key={cardIndex} className="shuffle-card" onClick={shuffle} initial={reduceMotion ? false : { x: 110, rotate: 7, opacity: 0 }} animate={{ x: 0, rotate: 0, opacity: 1 }} exit={reduceMotion ? undefined : { x: -150, rotate: -10, opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }} aria-label="Shuffle to the next card">
              <span>{card.label}</span>
              <strong>{card.title}</strong>
              <p>{card.body}</p>
              <small>CLICK TO SHUFFLE <ArrowRight size={13} /></small>
            </motion.button>
          </AnimatePresence>
        </motion.div>}
      </AnimatePresence>
      {started && <a className="hero-review-link" href="#sign">Review the agreement <ArrowRight size={15} /></a>}
    </section>
    {started && <motion.section className="agreement-explore" aria-label="Agreement overview" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduceMotion ? 0 : 0.32, duration: reduceMotion ? 0 : 0.65 }}>
      <header className="agreement-explore-header">
        <span>THE HALF GIRLFRIEND CONTRACT 1.0</span>
        <h2>Knowledge, effort and <em>friendship.</em></h2>
        <p>A shared learning journey built on practical support, genuine consistency and the freedom to choose.</p>
      </header>
      <div className="contract-sections">
        {agreementSections.map((section, sectionIndex) => (
          <motion.article
            className={`contract-section-card${sectionIndex === 3 ? " boundary-card" : ""}`}
            key={section.number}
            initial={reduceMotion ? false : { opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: reduceMotion ? 0 : 0.6, delay: reduceMotion ? 0 : 0.04 }}
          >
            <span className="contract-section-label"><b>{section.number}</b>{section.label}</span>
            <h3>{section.title}</h3>
            <ul>
              {section.items.map((item, index) => (
                <motion.li
                  key={item}
                  initial={reduceMotion ? false : { opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: reduceMotion ? 0 : 0.35, delay: reduceMotion ? 0 : index * 0.055 }}
                >
                  <span>{item}</span>
                </motion.li>
              ))}
            </ul>
          </motion.article>
        ))}
      </div>
      <p className="contract-core-idea"><span>THE HEART OF IT</span>You provide knowledge, guidance and support; she provides genuine effort and consistency. Both share friendship, respect, freedom and fun. <b aria-hidden="true">♥</b></p>
    </motion.section>}
    </>
  );
}
