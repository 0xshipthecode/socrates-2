import { useEffect, useRef } from "react";
import { useAudioLevel } from "../hooks/useAudioLevel";

interface PumpkinHeadProps {
  stream: MediaStream | undefined;
  // empty
}

const PumpkinHead = ({ stream }: PumpkinHeadProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationController = useRef(-1);
  const volume = useAudioLevel(stream);
  //TODO: this needs to be smarter and scale to ambient/speaker volume
  const mouthLevel = Math.min(volume * 2.5, 1.0);

  const drawPumpkin = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.translate(300, 300);
    ctx.scale(100, 100);

    drawHead(ctx);
    drawEyes(ctx);
    drawNose(ctx);
    drawMouth(ctx);

    ctx.restore();
  };

  const drawHead = (ctx: CanvasRenderingContext2D) => {
    ctx.save();

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

  const drawNose = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.translate(-0.1, -0.05);
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.moveTo(-0.05, 0);
    ctx.lineTo(0.05, -0.05);
    ctx.lineTo(0.05, 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(0.1, -0.05);
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.moveTo(0.05, 0);
    ctx.lineTo(-0.05, -0.05);
    ctx.lineTo(-0.05, 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const drawEyes = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.translate(-0.4, -0.4);
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.moveTo(-0.12, 0);
    ctx.lineTo(0.12, -0.12);
    ctx.lineTo(0.12, 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(0.4, -0.4);
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.moveTo(0.12, 0);
    ctx.lineTo(-0.12, -0.12);
    ctx.lineTo(-0.12, 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const drawMouth = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = "black";
    ctx.save();

    ctx.translate(0, 0.4);
    ctx.scale(1, 0.2 + mouthLevel);

    ctx.beginPath();
    ctx.moveTo(-0.6, 0);
    ctx.lineTo(-0.4, -0.17);
    ctx.lineTo(-0.2, -0.08);
    ctx.lineTo(0, -0.2);
    ctx.lineTo(+0.2, -0.08);
    ctx.lineTo(+0.4, -0.17);
    ctx.lineTo(0.6, 0);
    ctx.lineTo(+0.4, 0.17);
    ctx.lineTo(+0.2, 0.08);
    ctx.lineTo(0, 0.2);
    ctx.lineTo(-0.2, 0.08);
    ctx.lineTo(-0.4, 0.17);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  const drawEars = (ctx: CanvasRenderingContext2D) => {
    // draw ears just below eye level
  };

  useEffect(() => {
    const drawFrame = () => {
      if (!canvasRef.current) return;

      const ctx = canvasRef.current!.getContext("2d")!;
      drawPumpkin(ctx);
    };

    animationController.current = requestAnimationFrame(drawFrame);

    return () => {
      cancelAnimationFrame(animationController.current);
      animationController.current = -1;
    };
  });

  return <canvas ref={canvasRef} width={600} height={600} />;
};

export default PumpkinHead;
