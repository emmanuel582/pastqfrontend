import { useEffect, useState } from "react";
import { motion } from "motion/react";

/* ─── A beautiful isometric-style 3D student character ───────────────────────
   Built entirely with CSS transforms and SVG — no external deps, 100% reliable.
   Uses perspective + rotateY to create a convincing 3D feel.
   Smoothly transitions between 6 student-life poses with spring animations. */

const SKIN = "#F5C4A1";
const HAIR = "#2E2A27";
const SHIRT = "#E67468";
const PANTS = "#7A6CB2";
const SHOE = "#2E2A27";
const ACCENT = "#D45B4F";

function StudentCharacter({ pose }: { pose: number }) {
  /* Each pose adjusts body parts independently */
  const poses: Record<number, {
    bodyTilt: number; headTilt: number;
    leftArmAngle: number; rightArmAngle: number;
    leftLegAngle: number; rightLegAngle: number;
    label: string;
  }> = {
    0: { bodyTilt: -3, headTilt: -8, leftArmAngle: -45, rightArmAngle: -35, leftLegAngle: 0, rightLegAngle: 0, label: "reading" },
    1: { bodyTilt: 5, headTilt: 5, leftArmAngle: -55, rightArmAngle: 55, leftLegAngle: -35, rightLegAngle: 35, label: "running" },
    2: { bodyTilt: 0, headTilt: 0, leftArmAngle: -160, rightArmAngle: -160, leftLegAngle: -20, rightLegAngle: 20, label: "celebrating" },
    3: { bodyTilt: 0, headTilt: 8, leftArmAngle: -5, rightArmAngle: -5, leftLegAngle: 0, rightLegAngle: 0, label: "headphones" },
    4: { bodyTilt: -5, headTilt: -12, leftArmAngle: -40, rightArmAngle: -25, leftLegAngle: 0, rightLegAngle: 0, label: "writing" },
    5: { bodyTilt: 0, headTilt: 0, leftArmAngle: -170, rightArmAngle: -170, leftLegAngle: -15, rightLegAngle: 15, label: "star" },
  };

  const p = poses[pose] || poses[0];

  return (
    <motion.div
      style={{ width: 160, height: 220, position: "relative", perspective: 600 }}
      animate={{ rotateY: [0, 8, 0, -8, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
    >
      <motion.div
        style={{ width: "100%", height: "100%", transformStyle: "preserve-3d", position: "relative" }}
        animate={{ rotate: p.bodyTilt }}
        transition={{ type: "spring", stiffness: 120, damping: 14 }}
      >
        {/* ── Shadow ── */}
        <motion.div
          className="absolute"
          style={{ bottom: 0, left: "50%", transform: "translateX(-50%)", width: 60, height: 12, borderRadius: "50%", background: "rgba(0,0,0,0.1)", filter: "blur(3px)" }}
          animate={{ scaleX: [1, 1.2, 1], opacity: [0.15, 0.08, 0.15] }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        {/* ── Left Leg ── */}
        <motion.div
          className="absolute"
          style={{ left: 58, bottom: 10, width: 16, height: 55, borderRadius: 8, background: PANTS, transformOrigin: "top center", zIndex: 1 }}
          animate={{ rotate: p.leftLegAngle }}
          transition={{ type: "spring", stiffness: 150, damping: 12 }}
        >
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 10, borderRadius: "0 0 6px 6px", background: SHOE }} />
        </motion.div>

        {/* ── Right Leg ── */}
        <motion.div
          className="absolute"
          style={{ left: 82, bottom: 10, width: 16, height: 55, borderRadius: 8, background: PANTS, transformOrigin: "top center", zIndex: 1 }}
          animate={{ rotate: p.rightLegAngle }}
          transition={{ type: "spring", stiffness: 150, damping: 12 }}
        >
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 10, borderRadius: "0 0 6px 6px", background: SHOE }} />
        </motion.div>

        {/* ── Body / Torso ── */}
        <div className="absolute" style={{ left: 48, bottom: 55, width: 60, height: 65, borderRadius: "16px 16px 10px 10px", background: `linear-gradient(135deg, ${SHIRT}, ${ACCENT})`, zIndex: 2, boxShadow: "inset -4px -4px 12px rgba(0,0,0,0.15), 2px 4px 8px rgba(0,0,0,0.1)" }}>
          {/* Collar */}
          <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 28, height: 12, borderRadius: "0 0 14px 14px", background: "white" }} />
          {/* Pocket */}
          <div style={{ position: "absolute", top: 28, right: 8, width: 14, height: 10, borderRadius: 3, border: `1px solid rgba(255,255,255,0.3)` }} />
        </div>

        {/* ── Left Arm ── */}
        <motion.div
          className="absolute"
          style={{ left: 36, bottom: 95, width: 14, height: 48, borderRadius: 7, background: SHIRT, transformOrigin: "top center", zIndex: 3, boxShadow: "1px 2px 4px rgba(0,0,0,0.1)" }}
          animate={{ rotate: p.leftArmAngle }}
          transition={{ type: "spring", stiffness: 130, damping: 12 }}
        >
          {/* Hand */}
          <div style={{ position: "absolute", bottom: -4, left: 1, width: 12, height: 12, borderRadius: "50%", background: SKIN }} />
        </motion.div>

        {/* ── Right Arm ── */}
        <motion.div
          className="absolute"
          style={{ left: 106, bottom: 95, width: 14, height: 48, borderRadius: 7, background: SHIRT, transformOrigin: "top center", zIndex: 3, boxShadow: "1px 2px 4px rgba(0,0,0,0.1)" }}
          animate={{ rotate: p.rightArmAngle }}
          transition={{ type: "spring", stiffness: 130, damping: 12 }}
        >
          <div style={{ position: "absolute", bottom: -4, left: 1, width: 12, height: 12, borderRadius: "50%", background: SKIN }} />
        </motion.div>

        {/* ── Head ── */}
        <motion.div
          className="absolute"
          style={{ left: 48, bottom: 115, width: 60, height: 60, zIndex: 4 }}
          animate={{ rotate: p.headTilt }}
          transition={{ type: "spring", stiffness: 100, damping: 14 }}
        >
          {/* Face */}
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: `radial-gradient(circle at 35% 35%, #FDDCC5, ${SKIN})`, position: "relative", boxShadow: "2px 4px 12px rgba(0,0,0,0.12)" }}>
            {/* Hair */}
            <div style={{ position: "absolute", top: -6, left: -3, right: -3, height: 36, borderRadius: "50% 50% 30% 30%", background: HAIR, zIndex: -1 }} />
            <div style={{ position: "absolute", top: -2, right: -2, width: 16, height: 20, borderRadius: "0 12px 4px 0", background: HAIR, zIndex: -1, transform: "rotate(15deg)" }} />

            {/* Eyes */}
            {p.label === "headphones" || p.label === "celebrating" || p.label === "star" ? (
              <>
                <div style={{ position: "absolute", top: 24, left: 14, width: 10, height: 3, borderRadius: 2, background: HAIR }} />
                <div style={{ position: "absolute", top: 24, right: 14, width: 10, height: 3, borderRadius: 2, background: HAIR }} />
              </>
            ) : (
              <>
                <div style={{ position: "absolute", top: 22, left: 15, width: 8, height: 8, borderRadius: "50%", background: HAIR }}>
                  <div style={{ position: "absolute", top: 1, left: 2, width: 3, height: 3, borderRadius: "50%", background: "white" }} />
                </div>
                <div style={{ position: "absolute", top: 22, right: 15, width: 8, height: 8, borderRadius: "50%", background: HAIR }}>
                  <div style={{ position: "absolute", top: 1, left: 2, width: 3, height: 3, borderRadius: "50%", background: "white" }} />
                </div>
              </>
            )}

            {/* Blush */}
            <div style={{ position: "absolute", top: 30, left: 6, width: 12, height: 6, borderRadius: "50%", background: "#E67468", opacity: 0.25 }} />
            <div style={{ position: "absolute", top: 30, right: 6, width: 12, height: 6, borderRadius: "50%", background: "#E67468", opacity: 0.25 }} />

            {/* Mouth */}
            {p.label === "celebrating" || p.label === "star" ? (
              <div style={{ position: "absolute", bottom: 11, left: "50%", transform: "translateX(-50%)", width: 14, height: 8, borderRadius: "0 0 10px 10px", background: "#C4494D" }} />
            ) : (
              <div style={{ position: "absolute", bottom: 13, left: "50%", transform: "translateX(-50%)", width: 10, height: 4, borderRadius: 4, background: "#D09585" }} />
            )}
          </div>

          {/* ── Headphones accessory ── */}
          {p.label === "headphones" && (
            <>
              <div style={{ position: "absolute", top: 2, left: -8, right: -8, height: 40, borderRadius: "50%", border: "4px solid #2E2A27", borderBottom: "none", zIndex: 5 }} />
              <div style={{ position: "absolute", top: 18, left: -14, width: 16, height: 20, borderRadius: 8, background: SHIRT, boxShadow: "inset -2px -2px 4px rgba(0,0,0,0.2)" }} />
              <div style={{ position: "absolute", top: 18, right: -14, width: 16, height: 20, borderRadius: 8, background: SHIRT, boxShadow: "inset -2px -2px 4px rgba(0,0,0,0.2)" }} />
            </>
          )}
        </motion.div>

        {/* ── Book accessory (for reading/writing poses) ── */}
        {(p.label === "reading" || p.label === "writing") && (
          <motion.div
            className="absolute"
            style={{ left: 6, bottom: 80, zIndex: 5 }}
            animate={{ rotate: [-3, 3, -3], y: [0, -4, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <div style={{ width: 30, height: 38, borderRadius: 4, background: "#7A6CB2", boxShadow: "2px 2px 6px rgba(0,0,0,0.15)", position: "relative" }}>
              <div style={{ position: "absolute", top: 3, left: 3, right: 3, bottom: 3, borderRadius: 2, background: "#FAF6F0" }} />
              {[8, 14, 20, 26].map((t, i) => (
                <div key={i} style={{ position: "absolute", top: t, left: 6, right: 6, height: 2, borderRadius: 1, background: "#DDDAD4" }} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Backpack (for running) ── */}
        {p.label === "running" && (
          <div className="absolute" style={{ left: 40, bottom: 55, width: 24, height: 30, borderRadius: "4px 4px 8px 8px", background: ACCENT, zIndex: 0, boxShadow: "inset -2px -2px 6px rgba(0,0,0,0.2)" }}>
            <div style={{ position: "absolute", top: 0, left: 4, width: 4, height: 20, borderRadius: 2, background: "#B8453A" }} />
            <div style={{ position: "absolute", top: 0, right: 4, width: 4, height: 20, borderRadius: 2, background: "#B8453A" }} />
          </div>
        )}

        {/* ── Sparkles for celebrating ── */}
        {(p.label === "celebrating" || p.label === "star") && (
          <>
            {[
              { x: 20, y: 70, delay: 0 },
              { x: 130, y: 80, delay: 0.4 },
              { x: 40, y: 130, delay: 0.8 },
              { x: 120, y: 140, delay: 1.2 },
            ].map((s, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{ left: s.x, bottom: s.y, width: 8, height: 8 }}
                animate={{ scale: [0, 1.5, 0], rotate: [0, 180], opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: s.delay }}
              >
                <svg viewBox="0 0 24 24" fill="#F5C842" width="100%" height="100%">
                  <polygon points="12,2 15,9 22,9 16,14 18,22 12,17 6,22 8,14 2,9 9,9" />
                </svg>
              </motion.div>
            ))}
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function Student3DScene({ pose }: { pose: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
      <StudentCharacter pose={pose} />
    </div>
  );
}
