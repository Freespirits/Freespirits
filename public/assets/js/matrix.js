const canvas = document.getElementById('matrixCanvas');
const ctx = canvas?.getContext('2d');
const charset = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン0123456789$+-*/=^#&@%!';
const fontSize = 20;
const trailBase = 12;
let columns = 0;
let drops = [];
let animationId = null;
let lastFrameTime = 0;

function createDrop(columnIndex) {
    return {
        x: columnIndex * fontSize,
        y: Math.random() * window.innerHeight,
        speed: fontSize * (1.1 + Math.random() * 1.8),
        trailLength: trailBase + Math.floor(Math.random() * 10),
    };
}

function resizeCanvas() {
    if (!canvas || !ctx) {
        return;
    }

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    columns = Math.ceil(canvas.width / fontSize);
    drops = Array.from({ length: columns }, (_, index) => createDrop(index));
}

function drawMatrix(timestamp = 0) {
    if (!canvas || !ctx || drops.length === 0) {
        return;
    }

    const delta = Math.min(timestamp - lastFrameTime, 50);
    lastFrameTime = timestamp;
    const speedFactor = delta / 16.67 || 1;

    ctx.save();
    ctx.fillStyle = 'rgba(3, 4, 12, 0.12)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${fontSize}px 'Roboto Mono', monospace`;
    ctx.textBaseline = 'top';
    ctx.globalCompositeOperation = 'lighter';

    drops.forEach((drop, index) => {
        let currentDrop = drop;
        currentDrop.y += currentDrop.speed * speedFactor;

        if (currentDrop.y > canvas.height + currentDrop.trailLength * fontSize) {
            currentDrop = createDrop(index);
            currentDrop.y = -Math.random() * canvas.height * 0.5;
            drops[index] = currentDrop;
        }

        for (let layer = 0; layer < currentDrop.trailLength; layer++) {
            const char = charset.charAt(Math.floor(Math.random() * charset.length));
            const yPosition = currentDrop.y - layer * fontSize;

            if (yPosition < -fontSize) {
                break;
            }

            const intensity = 1 - layer / currentDrop.trailLength;
            const isHead = layer === 0;

            ctx.shadowBlur = isHead ? 24 : 0;
            ctx.shadowColor = isHead ? 'rgba(0, 255, 136, 0.9)' : 'transparent';

            if (isHead) {
                ctx.fillStyle = 'rgba(204, 255, 204, 1)';
            } else {
                ctx.fillStyle = `rgba(0, 255, 136, ${Math.max(intensity * 0.9, 0.1)})`;
            }

            ctx.fillText(char, currentDrop.x, yPosition);
        }
    });

    ctx.restore();
    animationId = requestAnimationFrame(drawMatrix);
}

export function startMatrixRain() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    if (animationId) {
        cancelAnimationFrame(animationId);
    }

    lastFrameTime = performance.now();
    animationId = requestAnimationFrame(drawMatrix);
}

