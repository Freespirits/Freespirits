const canvas = document.getElementById('matrixCanvas');
const ctx = canvas?.getContext('2d');
const charset = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン0123456789$+-*/=^#&@%!';
const fontSize = 18;
let columns = 0;
let drops = [];

function resizeCanvas() {
    if (!canvas) {
        return;
    }

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    columns = Math.floor(canvas.width / fontSize);
    drops = new Array(columns).fill(1);
}

function drawMatrix() {
    if (!canvas || !ctx || drops.length === 0) {
        return;
    }

    ctx.fillStyle = 'rgba(3, 4, 12, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${fontSize}px monospace`;

    drops.forEach((value, index) => {
        const text = charset.charAt(Math.floor(Math.random() * charset.length));
        const x = index * fontSize;
        const y = value * fontSize;

        ctx.shadowBlur = 15;
        ctx.shadowColor = 'var(--color-matrix-glow)';
        ctx.fillStyle = y < 120 ? 'rgba(204, 255, 204, 1)' : 'var(--color-matrix-glow)';
        ctx.fillText(text, x, y);
        ctx.shadowBlur = 0;

        if (y > canvas.height && Math.random() > 0.985) {
            drops[index] = 0;
        }

        drops[index] = drops[index] + 1;
    });
}

export function startMatrixRain() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    setInterval(drawMatrix, 33);
}

