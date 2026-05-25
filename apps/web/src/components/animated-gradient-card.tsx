import { createRef } from "@andesine/components";
import { onCleanup, onMount, ParentComponent, JSX } from "solid-js";
import clsx from "clsx";

type Circle = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
  color: string;
  opacity: number;
};

interface AnimatedGradientCardProps extends JSX.HTMLAttributes<HTMLDivElement> {}

const AnimatedGradientCard: ParentComponent<AnimatedGradientCardProps> = (props) => {
  const [canvasRef, setCanvasRef] = createRef<HTMLCanvasElement | null>(null);
  const colors = ["#ff3617", "#F88F52"];
  const randomInRange = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };
  const drawCircle = (ctx: CanvasRenderingContext2D, circle: Circle) => {
    ctx.globalAlpha = circle.opacity;
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2, false);
    ctx.fillStyle = circle.color;
    ctx.fill();
    ctx.closePath();
    ctx.restore();
  };

  onMount(() => {
    const canvas = canvasRef();
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const circleCount = Math.ceil(canvas.clientWidth / 80);
    const circles: Circle[] = [];

    for (let i = 0; i < circleCount; i++) {
      const radius = randomInRange(canvas.clientWidth / 6, canvas.clientWidth / 4);
      const x = randomInRange(0, canvas.clientWidth - radius);
      const y = randomInRange(0, canvas.clientHeight - radius);
      const dx = randomInRange(canvas.clientWidth / -400, canvas.clientWidth / 400);
      const dy = randomInRange(canvas.clientHeight / -400, canvas.clientHeight / 400);
      const color = Math.random() > 0.5 ? colors[0] : colors[1];
      const opacity = 0;

      circles.push({ x, y, dx, dy, radius, color, opacity });
    }

    const animate = (): void => {
      requestAnimationFrame(animate);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      circles.forEach((circle) => {
        circle.x += circle.dx;
        circle.y += circle.dy;
        circle.opacity = Math.min(circle.opacity + 0.01, 0.8);

        if (circle.x + circle.radius > canvas.width || circle.x - circle.radius < 0) {
          circle.dx = -circle.dx;
        }

        if (circle.y + circle.radius > canvas.height || circle.y - circle.radius < 0) {
          circle.dy = -circle.dy;
        }

        circle.x = Math.min(Math.max(circle.x, circle.radius), canvas.width - circle.radius);
        circle.y = Math.min(Math.max(circle.y, circle.radius), canvas.height - circle.radius);
        drawCircle(ctx, circle);
      });
    };
    const resize = (): void => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };

    resize();
    animate();
    window.addEventListener("resize", resize);
    onCleanup(() => {
      window.removeEventListener("resize", resize);
    });
  });

  return (
    <div
      {...props}
      class={clsx(":base-2: bg-gradient-to-tr relative overflow-hidden text-white", props.class)}
    >
      <canvas ref={setCanvasRef} class="h-full w-full"></canvas>
      <div class="h-full w-full absolute top-0 left-0 backdrop-blur-3xl" />
      <div
        class="absolute top-0 left-0 h-full w-full bg-repeat bg-[url(/assets/noise.png)] mix-blend-overlay bg-blend-overlay"
        style={{
          "background-size": "6rem 6rem"
        }}
      />
      <div class="h-full w-full absolute top-0 left-0 flex justify-center items-center">
        {props.children}
      </div>
    </div>
  );
};

export { AnimatedGradientCard };
