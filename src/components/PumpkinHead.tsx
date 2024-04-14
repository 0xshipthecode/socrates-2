import { useRef } from "react";

interface PumpkinHeadProps {
  // empty
}

const PumpkinHead = (props: PumpkinHeadProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationController = useRef(-1);

  const drawPumpkin = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.translate(200, 200);
    ctx.scale(100, 100);

    ctx.fillStyle = "gray";
    ctx.beginPath();
    ctx.rect(-1, -1, 2, 2);
    ctx.fill();

    ctx.fillStyle = "rgb(255,150,0)";
    ctx.beginPath();
    ctx.ellipse(-0.6, 0.03, 0.35, 0.92, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0.6, 0.03, 0.35, 0.92, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgb(255,170,0)";
    ctx.beginPath();
    ctx.ellipse(-0.3, 0.03, 0.35, 0.93, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0.3, 0.03, 0.35, 0.93, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgb(255,190,0)";
    ctx.beginPath();
    ctx.ellipse(0.0, 0.03, 0.35, 0.94, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  const drawMouth = (ctx: CanvasRenderingContext2D) => {
    // empty
  };

  const drawEars = (ctx: CanvasRenderingContext2D) => {
    // empty
  };

  const drawFrame = () => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current!.getContext("2d")!;
    drawPumpkin(ctx);
  };

  requestAnimationFrame(drawFrame);

  return <canvas ref={canvasRef} width={400} height={400} />;
};

export default PumpkinHead;
