const cellSize = 30; 

const maze = [
    ['#','#','#','#','#','#','#','#','#','#','#','#','#','#','#','#','#','#','#','#',],
    ['#','Y','#','R','#','','P1','#','R','#','P3','','','#','','','','','','#',],
    ['#','','','','','','#','','','#','','#','','','#','','#','P5','#','#',],
    ['#','','#','','#','#','','#','','#','','#','#','','R','','','#','R','#'],
    ['#','','','','','#','','','','#','','','','','#','#','','#','','#'],
    ['#','R','','#','#','','','#','#','','','#','','#','','','','','','#'],
    ['#','#','','#','','#','','#','','','#','','','','','P7','#','','#','#'],
    ['#','','','#','','','','#','','#','#','','#','#','','#','','#','#','#'],
    ['#','#','','#','','P9','','#','#','P11','','','','','#','','','','P13','#'],
    ['#','','','P15','#','#','','#','P10','#','R','#','#','#','','','#','R','#','#'],
    ['#','#','#','#','','','','','','','','','','','','#','','','','#'],
    ['#','P2','','','','#','','#','R','#','#','#','#','R','#','','','#','#','#'],
    ['#','#','','#','#','#','','#','','#','P8','','','','','','#','P6','','#'],
    ['#','P16','R','P14','','#','','#','','','#','','#','','#','#','P17','#','','#'],
    ['#','#','','#','#','','','#','#','','#','','','R','#','','','','','#'],
    ['#','','','','','','#','','','','#','','#','#','','','#','#','#','#'],
    ['#','','#','R','#','#','#','','#','','#','','#','','','#','','','','#'],
    ['#','','#','','','','#','','#','R','','','#','','#','','#','','#','#'],
    ['#','','','P12','#','','','','','P4','#','R','','#','P18','','','','G','#'],
    ['#','#','#','#','#','#','#','#','#','#','#','#','#','#','#','#','#','#','#','#',],
];

const pairs = { 'P1': 'P2','P2':'P1','P3':'P4','P4':'P3','P5':'P6','P6':'P5','P7':'P8','P8':'P7','P9':'P10','P10':'P9','P11':'P12','P12':'P11','P13':'P14','P14':'P13','P15':'P16','P16':'P15','P17':'P18','P18':'P17'};

const imagePaths = {
    player: 'images/player.png',
    playerHurt: 'images/player-hurt.png',   
    portal: 'images/portal.png',  
    start: 'images/start.png',   
    danger: 'images/gato.png', 
    finish: 'images/finish.png',      
    finishHurt: 'images/finish-hurt.png', 
    wall: 'images/wall.png'       
};

const images = {};
function loadImages() {
    return Promise.all(Object.entries(imagePaths).map(([key, src]) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => { images[key] = img; resolve(); };
            img.onerror = () => resolve();
            img.src = src;
        });
    }));
}

const canvas = document.getElementById('maze');
const ctx = canvas.getContext('2d');

canvas.width = maze[0].length * cellSize; 
canvas.height = maze.length * cellSize;

let startX, startY, finishX, finishY;
const teleporters = {};
for (let y = 0; y < maze.length; y++) {
    for (let x = 0; x < maze[y].length; x++) {
        if (maze[y][x] === 'Y') { startX = x; startY = y; }
        if (maze[y][x] === 'G') { finishX = x; finishY = y; }
        if (maze[y][x].startsWith('P')) { teleporters[maze[y][x]] = { x, y }; }
    }
}
let playerX = startX, playerY = startY;
let hoverCellX = -1, hoverCellY = -1;
let hoverAlpha = 0;
let wasHoveringDanger = false;
let wasHoveringNice = false;
const previewSize = 90;
const hoverLerp = 0.18;

let hurtTimer = 0;
let hurtX = -1, hurtY = -1;
let hurtType = ''; // 'player' or 'finish'

const bgMusic = new Audio('sounds/newjeans.mp3');
const niceSound = new Audio('sounds/nice.mp3');
const yaySound = new Audio('sounds/yay.mp3');
const oofSound = new Audio('sounds/oof.mp3');
const dangerSound = new Audio('sounds/screaming-cat.mp3');

bgMusic.loop = true;
bgMusic.volume = 0.5;
bgMusic.play().catch(() => {});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX, my = (e.clientY - rect.top) * scaleY;
    hoverCellX = Math.floor(mx / cellSize);
    hoverCellY = Math.floor(my / cellSize);
    const isDanger = hoverCellY >= 0 && hoverCellY < maze.length && hoverCellX >= 0 && hoverCellX < maze[0].length && maze[hoverCellY][hoverCellX] === 'R';
    const isPlayerCell = hoverCellY >= 0 && hoverCellY < maze.length && hoverCellX >= 0 && hoverCellX < maze[0].length && hoverCellX === playerX && hoverCellY === playerY;
    const isFinish = hoverCellY >= 0 && hoverCellY < maze.length && hoverCellX >= 0 && hoverCellX < maze[0].length && maze[hoverCellY][hoverCellX] === 'G';
    const isNice = (isPlayerCell || isFinish) && !isDanger;
    if (isDanger && !wasHoveringDanger) dangerSound.play().catch(() => {});
    if (isNice && !wasHoveringNice) niceSound.play().catch(() => {});
    wasHoveringDanger = isDanger;
    wasHoveringNice = isNice;
    animate();
});
canvas.addEventListener('mouseleave', () => { hoverCellX = -1; hoverCellY = -1; wasHoveringDanger = false; wasHoveringNice = false; animate(); });

function hasHoverPreview() {
    if (hoverCellX < 0 || hoverCellY < 0 || hoverCellY >= maze.length || hoverCellX >= maze[0].length) return false;
    const cell = maze[hoverCellY][hoverCellX];
    const isPlayerCell = hoverCellX === playerX && hoverCellY === playerY;
    return (cell === 'R' && images.danger) || (cell === 'G' && images.finish) || (isPlayerCell && images.player);
}
function animate() {
    const show = hasHoverPreview();
    hoverAlpha += (show ? hoverLerp : -hoverLerp);
    hoverAlpha = Math.max(0, Math.min(1, hoverAlpha));
    if (hurtTimer > 0) hurtTimer -= 16; // Approximate frame time
    draw();
    if ((hoverAlpha > 0 && hoverAlpha < 1) || hurtTimer > 0) requestAnimationFrame(animate);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < maze.length; y++) {
        for (let x = 0; x < maze[y].length; x++) {
            let cell = maze[y][x];
            const px = x * cellSize, py = y * cellSize;
            if (cell === '#') {
                if (images.wall) ctx.drawImage(images.wall, px, py, cellSize, cellSize);
                else { ctx.fillStyle = '#222'; ctx.fillRect(px, py, cellSize, cellSize); }
            } else if (cell === 'Y') {
                if (images.start) ctx.drawImage(images.start, px, py, cellSize, cellSize);
                else { ctx.fillStyle = 'yellow'; ctx.fillRect(px, py, cellSize, cellSize); }
            } else if (cell === 'G') {
                if (images.finish) ctx.drawImage(images.finish, px, py, cellSize, cellSize);
                else { ctx.fillStyle = '#27ae60'; ctx.fillRect(px, py, cellSize, cellSize); }
            } else if (cell === 'R') {
                if (images.danger) ctx.drawImage(images.danger, px, py, cellSize, cellSize);
                else { ctx.fillStyle = '#e74c3c'; ctx.fillRect(px, py, cellSize, cellSize); }
            } else if (cell.startsWith('P')) {
                if (images.portal) ctx.drawImage(images.portal, px, py, cellSize, cellSize);
                else { ctx.fillStyle = '#8e44ad'; ctx.fillRect(px, py, cellSize, cellSize); }
            } else {
                ctx.fillStyle = 'white';
                ctx.fillRect(px, py, cellSize, cellSize);
            }
        }
    }
    const px = playerX * cellSize + 5, py = playerY * cellSize + 5, ps = cellSize - 10;
    if (images.player) ctx.drawImage(images.player, px, py, ps, ps);
    else { ctx.fillStyle = '#3498db'; ctx.fillRect(px, py, ps, ps); }

    if (hurtTimer > 0 && hurtX >= 0 && hurtY >= 0) {
        let img = null;
        if (hurtType === 'player' && images.playerHurt) img = images.playerHurt;
        if (img) {
            const cx = hurtX * cellSize + cellSize / 2, cy = hurtY * cellSize + cellSize / 2;
            const s = previewSize;
            ctx.drawImage(img, cx - s / 2, cy - s / 2, s, s);
        }
    }

    // Draw finish-hurt at finish position when player is hurt
    if (hurtTimer > 0 && hurtType === 'player' && images.finishHurt) {
        const cx = finishX * cellSize + cellSize / 2, cy = finishY * cellSize + cellSize / 2;
        const s = previewSize;
        ctx.drawImage(images.finishHurt, cx - s / 2, cy - s / 2, s, s);
    }

    if (hoverAlpha > 0 && hoverCellX >= 0 && hoverCellY >= 0 && hoverCellY < maze.length && hoverCellX < maze[0].length) {
        const cell = maze[hoverCellY][hoverCellX];
        const isPlayerCell = hoverCellX === playerX && hoverCellY === playerY;
        let img = null;
        if (cell === 'R' && images.danger) img = images.danger;
        else if (cell === 'G' && images.finish) img = images.finish;
        else if (isPlayerCell && images.player) img = images.player;
        if (img) {
            const cx = hoverCellX * cellSize + cellSize / 2, cy = hoverCellY * cellSize + cellSize / 2;
            const s = cellSize + (previewSize - cellSize) * hoverAlpha;
            ctx.globalAlpha = hoverAlpha;
            ctx.drawImage(img, cx - s / 2, cy - s / 2, s, s);
            ctx.globalAlpha = 1;
        }
    }
}

loadImages().then(() => animate());

document.addEventListener('keydown', (e) => {
    let dx = 0, dy = 0;
    const key = e.key.toLowerCase();
    if (key === 'w') dy = -1;
    else if (key === 's') dy = 1;
    else if (key === 'a') dx = -1;
    else if (key === 'd') dx = 1;
    else return;

    let nx = playerX + dx, ny = playerY + dy;
    if (ny >= 0 && ny < maze.length && nx >= 0 && nx < maze[0].length && maze[ny][nx] !== '#') {
        playerX = nx; playerY = ny;
        let cell = maze[playerY][playerX];
        if (cell === 'R') {
            hurtX = playerX; hurtY = playerY;
            hurtType = 'player';
            hurtTimer = 1000;
            playerX = startX; playerY = startY;
            oofSound.play().catch(() => {});
        } else if (cell === 'G') {
            hurtX = playerX; hurtY = playerY;
            hurtType = 'finish';
            hurtTimer = 1000;
            yaySound.play().catch(() => {});
            yaySound.addEventListener('ended', () => {
                window.location.href = 'goal.html';
            }, { once: true });
            animate();
            return;
        } else {
            if (cell in pairs) {
                playerX = teleporters[pairs[cell]].x;
                playerY = teleporters[pairs[cell]].y;
            }
            // Removed walkSound.play();
        }
        animate();
    }
});