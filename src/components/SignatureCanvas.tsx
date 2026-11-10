"use client";

import { useEffect, useRef } from "react";

export default function SignatureCanvas({ onChange }: { onChange: (image: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const changedRef = useRef(false);
  const scaleRef = useRef(1);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const scale = Math.max(window.devicePixelRatio || 1, 1);
      scaleRef.current = scale;
      canvas.width = Math.round(bounds.width * scale);
      canvas.height = Math.round(bounds.height * scale);
      const context = canvas.getContext("2d");
      if (context) {
        context.setTransform(scale, 0, 0, scale, 0, 0);
        context.lineWidth = 2.2;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.strokeStyle = "#653850";
      }
      drawingRef.current = false;
      changedRef.current = false;
      onChangeRef.current(null);
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    changedRef.current = false;
    const location = point(event);
    context.beginPath();
    context.moveTo(location.x, location.y);
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const location = point(event);
    context.lineTo(location.x, location.y);
    context.stroke();
    changedRef.current = true;
  };

  const finish = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (changedRef.current) onChangeRef.current(event.currentTarget.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.setTransform(scaleRef.current, 0, 0, scaleRef.current, 0, 0);
    drawingRef.current = false;
    changedRef.current = false;
    onChangeRef.current(null);
  };

  return (
    <div className="signature-wrap">
      <canvas
        ref={canvasRef}
        aria-label="Draw your signature"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={finish}
      />
      <span className="signature-guide">Draw your signature here</span>
      <button suppressHydrationWarning className="clear-sign" type="button" onClick={clear}>Clear</button>
    </div>
  );
}
