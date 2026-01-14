// --- 特效引擎 (Canvas Fireworks & Confetti) ---
const FX = {
    canvas: document.getElementById('effects-canvas'),
    ctx: document.getElementById('effects-canvas').getContext('2d'),
    particles: [],
    animationId: null,

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },

    createFirework(x, y, color) {
        for (let i = 0; i < 30; i++) {
            const angle = (Math.PI * 2 * i) / 30;
            const velocity = 2 + Math.random() * 3;
            this.particles.push({
                x: x, y: y,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                life: 100,
                color: color,
                type: 'spark'
            });
        }
    },

    createRain() {
        for(let i=0; i<5; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: -10,
                vx: 0,
                vy: 2 + Math.random() * 2,
                life: 200,
                color: '#89cff0',
                type: 'rain'
            });
        }
    },

    loop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;

            if (p.type === 'spark') {
                p.vy += 0.05; // 重力
                this.ctx.fillStyle = p.color;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (p.type === 'rain') {
                this.ctx.strokeStyle = p.color;
                this.ctx.beginPath();
                this.ctx.moveTo(p.x, p.y);
                this.ctx.lineTo(p.x, p.y + 10);
                this.ctx.stroke();
            }

            if (p.life <= 0) this.particles.splice(i, 1);
        }
        
        this.animationId = requestAnimationFrame(() => this.loop());
    },

    startFireworks() {
        this.resize();
        this.particles = [];
        this.loop();
        // 自动随机发射
        this.interval = setInterval(() => {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * (this.canvas.height / 2);
            const colors = ['#ff0', '#f0f', '#0ff', '#58cc02', '#ff4b4b'];
            this.createFirework(x, y, colors[Math.floor(Math.random()*colors.length)]);
        }, 500);
    },

    startRain() {
        this.resize();
        this.particles = [];
        this.loop();
        this.interval = setInterval(() => this.createRain(), 50);
    },

    stop() {
        clearInterval(this.interval);
        cancelAnimationFrame(this.animationId);
        this.ctx.clearRect(0,0,this.canvas.width, this.canvas.height);
    }
};

// --- 设置逻辑 ---
const STORAGE_KEY = 'math_game_settings';

function loadSettings() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const data = JSON.parse(saved);
            config.count = data.count || 20;
            config.modes = data.modes || ['choice'];
            config.countdownEnabled = data.countdownEnabled || false;
            config.countdownSeconds = data.countdownSeconds || 10;
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
    }
}

function saveSettings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        count: config.count,
        modes: config.modes,
        countdownEnabled: config.countdownEnabled,
        countdownSeconds: config.countdownSeconds
    }));
}

function updateSettingsUI() {
    document.getElementById('q-count-display').innerText = config.count;
    document.getElementById('countdown-display').innerText = config.countdownSeconds;
    
    document.getElementById('mode-choice').classList.toggle('active', config.modes.includes('choice'));
    document.getElementById('mode-input').classList.toggle('active', config.modes.includes('input'));
    
    const countdownToggle = document.getElementById('countdown-toggle');
    const countdownSeconds = document.getElementById('countdown-seconds');
    if (config.countdownEnabled) {
        countdownToggle.innerText = '开启';
        countdownToggle.classList.add('active');
        countdownSeconds.style.opacity = '1';
        countdownSeconds.style.pointerEvents = 'auto';
    } else {
        countdownToggle.innerText = '关闭';
        countdownToggle.classList.remove('active');
        countdownSeconds.style.opacity = '0.5';
        countdownSeconds.style.pointerEvents = 'none';
    }
}

let config = { count: 20, modes: ['choice'], countdownEnabled: false, countdownSeconds: 10 };

loadSettings();
updateSettingsUI();

function adjustCount(delta) {
    let newVal = config.count + delta;
    if (newVal < 10) newVal = 10;
    if (newVal > 100) newVal = 100;
    config.count = newVal;
    document.getElementById('q-count-display').innerText = config.count;
    saveSettings();
}

function toggleMode(mode) {
    const idx = config.modes.indexOf(mode);
    const el = document.getElementById('mode-' + mode);
    
    if (idx > -1) {
        if (config.modes.length > 1) {
            config.modes.splice(idx, 1);
            el.classList.remove('active');
        }
    } else {
        config.modes.push(mode);
        el.classList.add('active');
    }
    saveSettings();
}

function toggleCountdown() {
    config.countdownEnabled = !config.countdownEnabled;
    const toggle = document.getElementById('countdown-toggle');
    const seconds = document.getElementById('countdown-seconds');
    
    if (config.countdownEnabled) {
        toggle.innerText = '开启';
        toggle.classList.add('active');
        seconds.style.opacity = '1';
        seconds.style.pointerEvents = 'auto';
    } else {
        toggle.innerText = '关闭';
        toggle.classList.remove('active');
        seconds.style.opacity = '0.5';
        seconds.style.pointerEvents = 'none';
    }
    saveSettings();
}

function adjustCountdownSeconds(delta) {
    let newVal = config.countdownSeconds + delta;
    if (newVal < 5) newVal = 5;
    if (newVal > 60) newVal = 60;
    config.countdownSeconds = newVal;
    document.getElementById('countdown-display').innerText = newVal;
    saveSettings();
}

// --- 游戏逻辑 ---
class MathGame {
    constructor() {
        this.state = {
            queue: [],
            currentIdx: 0,
            score: 0,
            userInput: '',
            isLocked: false
        };
        this.hideTimer = null;
        this.countdownTimer = null;
        this.countdownRemaining = 0;
        this.els = {
            setup: document.getElementById('setup-screen'),
            game: document.getElementById('game-screen'),
            header: document.getElementById('game-header'),
            question: document.getElementById('question-text'),
            options: document.getElementById('options-area'),
            keypad: document.getElementById('keypad-area'),
            inputArea: document.getElementById('input-area'),
            inputDisplay: document.getElementById('user-input-display'),
            submitBtn: document.getElementById('submit-btn'),
            feedback: document.getElementById('feedback'),
            progress: document.getElementById('progress'),
            countdownBarBg: document.getElementById('countdown-bar-bg'),
            countdownBar: document.getElementById('countdown-bar')
        };
    }

    start(chapterId) {
        this.state.score = 0;
        this.state.currentIdx = 0;
        this.generateQueue(chapterId);
        
        this.els.setup.style.display = 'none';
        this.els.game.style.display = 'flex';
        this.els.header.style.display = 'block';
        
        if (config.countdownEnabled) {
            this.els.countdownBarBg.style.display = 'block';
        } else {
            this.els.countdownBarBg.style.display = 'none';
        }
        
        this.loadCurrentQuestion();
    }

    // 生成题目队列（含混合模式算法）
    generateQueue(chapterId) {
        this.state.queue = [];
        const total = config.count;
        const modes = config.modes;
        
        // 1. 生成所有题目数据
        for (let i = 0; i < total; i++) {
            this.state.queue.push(this.createProblem(chapterId));
        }

        // 2. 分配答题模式 (Block Randomization)
        // 如果只有一个模式，全部统一
        if (modes.length === 1) {
            this.state.queue.forEach(q => q.mode = modes[0]);
        } else {
            // 混合模式：切分成若干块，每块长度 4~8
            let assignedCount = 0;
            while (assignedCount < total) {
                let blockSize = Math.floor(Math.random() * 5) + 4; // 4到8之间
                if (assignedCount + blockSize > total) blockSize = total - assignedCount;
                
                // 这一块用什么模式？随机选一个
                const blockMode = modes[Math.floor(Math.random() * modes.length)];
                
                for (let j = 0; j < blockSize; j++) {
                    this.state.queue[assignedCount + j].mode = blockMode;
                }
                assignedCount += blockSize;
            }
        }
    }

    createProblem(ch) {
        const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
        let q = {};
        
        if (ch === 0) { // 数字象形 - 数水果数量
            const fruits = ['🍎', '🍌', '🍇', '🍊', '🍓', '🍑', '🍒', '🥝'];
            const count = rand(3, 10);
            let fruitStr = '';
            let displayStr = '';
            for (let i = 0; i < count; i++) {
                const fruit = fruits[rand(0, fruits.length - 1)];
                fruitStr += fruit;
                displayStr += `<span style="font-size:1.5rem;">${fruit}</span>`;
            }
            q.text = fruitStr;
            q.textDisplay = displayStr;
            q.answer = count.toString();
            q.type = 'input';
        } else if (ch === -1) { // 数字加减 - 看图算加减
            const fruits = ['🍎', '🍌', '🍇', '🍊', '🍓', '🍑', '🍒', '🥝'];
            const opType = rand(1, 2); // 1=加法, 2=减法
            const fruit = fruits[rand(0, fruits.length - 1)];
            
            if (opType === 1) { // 加法: 🍎🍎 + �� = ?
                const a = rand(1, 5);
                const b = rand(1, 5);
                let left1 = '';
                for (let i = 0; i < a; i++) left1 += fruit;
                let left2 = '';
                for (let i = 0; i < b; i++) left2 += fruit;
                q.text = `${left1} + ${left2} = ?`;
                q.textDisplay = `<span style="font-size:1.5rem;">${left1} + ${left2} = ?</span>`;
                q.answer = (a + b).toString();
                q.type = 'input';
            } else { // 减法: 🍎🍎🍎🍎 - 🍎🍎 = ?
                const a = rand(3, 8);
                const b = rand(1, a - 1);
                let left = '';
                for (let i = 0; i < a; i++) left += fruit;
                let right = '';
                for (let i = 0; i < b; i++) right += fruit;
                q.text = `${left} - ${right} = ?`;
                q.textDisplay = `<span style="font-size:1.5rem;">${left} - ${right} = ?</span>`;
                q.answer = (a - b).toString();
                q.type = 'input';
            }
        } else if (ch === 1) { // 数字比大小
            const a = rand(1, 20); const b = rand(1, 20);
            q.text = `${a} ◯ ${b}`;
            q.answer = a === b ? '=' : (a > b ? '>' : '<');
            q.type = 'compare';
        } else if (ch === 2) { // 10以内加法
            const a = rand(0, 5); const b = rand(0, 5);
            q.text = `${a} + ${b} = ?`;
            q.answer = (a + b).toString();
            q.type = 'math';
        } else if (ch === 3) { // 10以内减法
            const a = rand(1, 10); const b = rand(0, a);
            q.text = `${a} - ${b} = ?`;
            q.answer = (a - b).toString();
            q.type = 'math';
        } else if (ch === 4) { // 10以内加减复合
            const subType = rand(1, 5);
            if (subType === 1) { // ( ) - b = c
                const b = rand(1, 9);
                const c = rand(0, 9 - b);
                const a = b + c;
                q.text = `( ) - ${b} = ${c}`;
                q.answer = a.toString();
                q.type = 'math';
            } else if (subType === 2) { // a + b = ( )
                const a = rand(0, 5); const b = rand(0, 5);
                q.text = `${a} + ${b} = ( )`;
                q.answer = (a + b).toString();
                q.type = 'math';
            } else if (subType === 3) { // a + ( ) = c
                const a = rand(0, 4); const c = rand(a + 1, 10);
                const b = c - a;
                q.text = `${a} + ( ) = ${c}`;
                q.answer = b.toString();
                q.type = 'math';
            } else if (subType === 4) { // a - b ( ) c + d
                const a = rand(1, 10); const b = rand(0, a);
                const c = rand(0, 10); const d = rand(0, 10);
                const left = a - b;
                const right = c + d;
                q.text = `${a} - ${b} ◯ ${c} + ${d}`;
                q.answer = left === right ? '=' : (left > right ? '>' : '<');
                q.type = 'compare';
            } else { // a + b ( ) c
                const a = rand(0, 10); const b = rand(0, 10 - a);
                const c = rand(0, 10);
                const left = a + b;
                q.text = `${a} + ${b} ◯ ${c}`;
                q.answer = left === c ? '=' : (left > c ? '>' : '<');
                q.type = 'compare';
            }
        } else if (ch === 5) { // 20以内加法
            const a = rand(0, 10); const b = rand(0, 20 - a);
            q.text = `${a} + ${b} = ?`;
            q.answer = (a + b).toString();
            q.type = 'math';
        } else if (ch === 6) { // 20以内减法
            const a = rand(10, 20); const b = rand(0, a);
            q.text = `${a} - ${b} = ?`;
            q.answer = (a - b).toString();
            q.type = 'math';
        } else if (ch === 7) { // 20以内加减复合
            const subType = rand(1, 6);
            if (subType === 1) { // ( ) - b = c
                const b = rand(1, 15);
                const c = rand(0, 20 - b);
                const a = b + c;
                q.text = `( ) - ${b} = ${c}`;
                q.answer = a.toString();
                q.type = 'math';
            } else if (subType === 2) { // a + b = ( )
                const a = rand(0, 10); const b = rand(0, 20 - a);
                q.text = `${a} + ${b} = ( )`;
                q.answer = (a + b).toString();
                q.type = 'math';
            } else if (subType === 3) { // a + ( ) = c
                const a = rand(0, 10); const c = rand(a, 20);
                const b = c - a;
                q.text = `${a} + ( ) = ${c}`;
                q.answer = b.toString();
                q.type = 'math';
            } else if (subType === 4) { // a - b ( ) c + d
                const a = rand(5, 20); const b = rand(0, a);
                const c = rand(0, 15); const d = rand(0, 20 - c);
                const left = a - b;
                const right = c + d;
                q.text = `${a} - ${b} ◯ ${c} + ${d}`;
                q.answer = left === right ? '=' : (left > right ? '>' : '<');
                q.type = 'compare';
            } else if (subType === 5) { // a - b = ( )
                const a = rand(10, 20); const b = rand(0, a);
                q.text = `${a} - ${b} = ( )`;
                q.answer = (a - b).toString();
                q.type = 'math';
            } else { // ( ) - b = c (另一形式)
                const a = rand(10, 20); const b = rand(1, a);
                const c = rand(0, a - b);
                q.text = `${a} - ${b} = ( )`;
                q.answer = c.toString();
                q.type = 'math';
            }
        } else if (ch === 8) { // 100以内加法
            const a = rand(0, 50); const b = rand(0, 100 - a);
            q.text = `${a} + ${b} = ?`;
            q.answer = (a + b).toString();
            q.type = 'math';
        } else if (ch === 9) { // 100以内减法
            const a = rand(20, 100); const b = rand(0, a);
            q.text = `${a} - ${b} = ?`;
            q.answer = (a - b).toString();
            q.type = 'math';
        } else if (ch === 10) { // 100以内加减复合
            const subType = rand(1, 6);
            if (subType === 1) { // ( ) - b = c
                const b = rand(1, 50);
                const c = rand(0, 100 - b);
                const a = b + c;
                q.text = `( ) - ${b} = ${c}`;
                q.answer = a.toString();
                q.type = 'math';
            } else if (subType === 2) { // a + b = ( )
                const a = rand(0, 50); const b = rand(0, 100 - a);
                q.text = `${a} + ${b} = ( )`;
                q.answer = (a + b).toString();
                q.type = 'math';
            } else if (subType === 3) { // a - b = ( )
                const a = rand(20, 100); const b = rand(0, a);
                q.text = `${a} - ${b} = ( )`;
                q.answer = (a - b).toString();
                q.type = 'math';
            } else if (subType === 4) { // a + ( ) = c
                const a = rand(0, 50); const c = rand(a, 100);
                const b = c - a;
                q.text = `${a} + ( ) = ${c}`;
                q.answer = b.toString();
                q.type = 'math';
            } else if (subType === 5) { // ( ) + b = c
                const b = rand(0, 50); const c = rand(b, 100);
                const a = c - b;
                q.text = `( ) + ${b} = ${c}`;
                q.answer = a.toString();
                q.type = 'math';
            } else { // a - b ( ) c + d
                const a = rand(20, 100); const b = rand(0, a);
                const c = rand(0, 50); const d = rand(0, 100 - c);
                const left = a - b;
                const right = c + d;
                q.text = `${a} - ${b} ◯ ${c} + ${d}`;
                q.answer = left === right ? '=' : (left > right ? '>' : '<');
                q.type = 'compare';
            }
        } else if (ch === 11) { // 10以内乘法
            const a = rand(1, 10);
            const b = rand(1, Math.min(10, Math.floor(100 / a)));
            q.text = `${a} × ${b} = ?`;
            q.answer = (a * b).toString();
            q.type = 'math';
        } else if (ch === 12) { // 10以内除法
            const b = rand(1, 10);
            const c = rand(1, 10);
            const a = b * c;
            q.text = `${a} ÷ ${b} = ?`;
            q.answer = c.toString();
            q.type = 'math';
        } else if (ch === 13) { // 10以内乘除复合
            const subType = rand(1, 6);
            if (subType === 1) { // a × b = ( )
                const a = rand(1, 10);
                const b = rand(1, Math.min(10, Math.floor(100 / a)));
                q.text = `${a} × ${b} = ( )`;
                q.answer = (a * b).toString();
                q.type = 'math';
            } else if (subType === 2) { // ( ) × b = c
                const b = rand(1, 10);
                const c = rand(1, Math.min(10, Math.floor(100 / b)));
                const a = c / b;
                q.text = `( ) × ${b} = ${c}`;
                q.answer = a.toString();
                q.type = 'math';
            } else if (subType === 3) { // a × ( ) = c
                const a = rand(1, 10);
                const c = rand(1, Math.min(10, Math.floor(100 / a)));
                const b = c / a;
                q.text = `${a} × ( ) = ${c}`;
                q.answer = b.toString();
                q.type = 'math';
            } else if (subType === 4) { // a ÷ b = ( )
                const b = rand(1, 10);
                const c = rand(1, 10);
                const a = b * c;
                q.text = `${a} ÷ ${b} = ( )`;
                q.answer = c.toString();
                q.type = 'math';
            } else if (subType === 5) { // ( ) ÷ b = c
                const b = rand(1, 10);
                const c = rand(1, 10);
                const a = b * c;
                q.text = `( ) ÷ ${b} = ${c}`;
                q.answer = a.toString();
                q.type = 'math';
            } else { // a ÷ ( ) = c
                const c = rand(1, 10);
                const a = rand(c, 100);
                const b = a / c;
                q.text = `${a} ÷ ( ) = ${c}`;
                q.answer = b.toString();
                q.type = 'math';
            }
        } else if (ch === 14) { // 20以内乘法
            const a = rand(1, 20);
            const b = rand(1, Math.min(20, Math.floor(100 / a)));
            q.text = `${a} × ${b} = ?`;
            q.answer = (a * b).toString();
            q.type = 'math';
        } else if (ch === 15) { // 20以内除法
            const b = rand(1, 20);
            const c = rand(1, Math.floor(100 / b));
            const a = b * c;
            q.text = `${a} ÷ ${b} = ?`;
            q.answer = c.toString();
            q.type = 'math';
        } else if (ch === 16) { // 20以内乘除复合
            const subType = rand(1, 6);
            if (subType === 1) { // a × b = ( )
                const a = rand(1, 20);
                const b = rand(1, Math.min(20, Math.floor(100 / a)));
                q.text = `${a} × ${b} = ( )`;
                q.answer = (a * b).toString();
                q.type = 'math';
            } else if (subType === 2) { // ( ) × b = c
                const b = rand(1, 20);
                const c = rand(1, Math.min(20, Math.floor(100 / b)));
                const a = c / b;
                q.text = `( ) × ${b} = ${c}`;
                q.answer = a.toString();
                q.type = 'math';
            } else if (subType === 3) { // a × ( ) = c
                const a = rand(1, 20);
                const c = rand(1, Math.min(20, Math.floor(100 / a)));
                const b = c / a;
                q.text = `${a} × ( ) = ${c}`;
                q.answer = b.toString();
                q.type = 'math';
            } else if (subType === 4) { // a ÷ b = ( )
                const b = rand(1, 20);
                const c = rand(1, Math.floor(100 / b));
                const a = b * c;
                q.text = `${a} ÷ ${b} = ( )`;
                q.answer = c.toString();
                q.type = 'math';
            } else if (subType === 5) { // ( ) ÷ b = c
                const b = rand(1, 20);
                const c = rand(1, Math.floor(100 / b));
                const a = b * c;
                q.text = `( ) ÷ ${b} = ${c}`;
                q.answer = a.toString();
                q.type = 'math';
            } else { // a ÷ ( ) = c
                const c = rand(1, 20);
                const a = rand(c, 100);
                const b = a / c;
                q.text = `${a} ÷ ( ) = ${c}`;
                q.answer = b.toString();
                q.type = 'math';
            }
        }
        return q;
    }

    loadCurrentQuestion() {
        if (this.state.currentIdx >= this.state.queue.length) {
            this.endGame();
            return;
        }

        const q = this.state.queue[this.state.currentIdx];
        this.state.userInput = '';
        this.state.isLocked = false;
        
        // 更新UI
        if (q.textDisplay) {
            this.els.question.innerHTML = q.textDisplay;
        } else {
            this.els.question.innerText = q.text;
        }
        const pct = (this.state.currentIdx / config.count) * 100;
        this.els.progress.style.width = `${pct}%`;
        
        // 根据当前题目的模式渲染
        if (q.mode === 'choice') {
            this.setupChoiceMode(q);
        } else {
            this.setupInputMode(q);
        }
        
        if (config.countdownEnabled) {
            this.startCountdown();
        }
    }

    setupChoiceMode(q) {
        this.els.inputArea.style.display = 'none';
        this.els.keypad.style.display = 'none';
        this.els.submitBtn.style.display = 'none';
        this.els.options.style.display = 'grid';

        // 生成干扰项
        let set = new Set([q.answer]);
        while(set.size < 4) {
            if(q.type === 'compare') {
                set.add('>'); set.add('<'); set.add('='); break;
            }
            let fake = parseInt(q.answer) + (Math.floor(Math.random()*5)-2);
            if(fake >= 0 && fake != q.answer) set.add(fake.toString());
        }
        
        const arr = Array.from(set).sort(() => Math.random() - 0.5);
        this.els.options.innerHTML = '';
        arr.forEach(val => {
            const btn = document.createElement('div');
            btn.className = 'btn btn-choice';
            btn.innerText = val;
            btn.onclick = () => this.checkAnswer(val);
            this.els.options.appendChild(btn);
        });
    }

    setupInputMode(q) {
        this.els.options.style.display = 'none';
        this.els.inputArea.style.display = 'block';
        this.els.keypad.style.display = 'grid';
        this.els.submitBtn.style.display = 'block';
        this.els.inputDisplay.innerText = ''; // 清空显示
        this.els.inputDisplay.style.borderColor = '#e5e5e5';
        this.renderKeypad(q.type);
    }

    renderKeypad(type) {
        this.els.keypad.innerHTML = '';
        const keys = type === 'compare' ? ['>', '<', '=', '←'] : ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '←'];
        keys.forEach(k => {
            const btn = document.createElement('div');
            btn.className = 'btn';
            btn.innerText = k;
            if (k === '←') {
                btn.onclick = () => {
                    this.state.userInput = this.state.userInput.slice(0, -1);
                    this.els.inputDisplay.innerText = this.state.userInput;
                };
                btn.style.background = '#ffdce0';
                btn.style.color = '#ff4b4b';
            } else {
                btn.onclick = () => {
                    if (type === 'compare') this.state.userInput = k;
                    else if (this.state.userInput.length < 3) this.state.userInput += k;
                    this.els.inputDisplay.innerText = this.state.userInput;
                };
            }
            this.els.keypad.appendChild(btn);
        });
    }

    startCountdown() {
        this.stopCountdown();
        this.countdownRemaining = config.countdownSeconds;
        const total = config.countdownSeconds;
        this.els.countdownBar.style.width = '100%';
        this.els.countdownBar.className = '';
        
        this.countdownTimer = setInterval(() => {
            this.countdownRemaining -= 0.1;
            const pct = (this.countdownRemaining / total) * 100;
            this.els.countdownBar.style.width = `${pct}%`;
            
            if (this.countdownRemaining <= 3) {
                this.els.countdownBar.className = 'countdown-danger';
            } else if (this.countdownRemaining <= 5) {
                this.els.countdownBar.className = 'countdown-warning';
            } else {
                this.els.countdownBar.className = '';
            }
            
            if (this.countdownRemaining <= 0) {
                this.stopCountdown();
                if (!this.state.isLocked) {
                    this.checkAnswer(null);
                }
            }
        }, 100);
    }

    stopCountdown() {
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
        }
    }

    checkInputAnswer() {
        if (!this.state.userInput) return;
        this.checkAnswer(this.state.userInput);
    }

    checkAnswer(val) {
        if (this.state.isLocked) return;
        this.state.isLocked = true;
        this.stopCountdown();

        const q = this.state.queue[this.state.currentIdx];
        const isTimeout = val === null;
        const isCorrect = !isTimeout && val === q.answer;
        
        this.playSound(isCorrect);

        const fbTitle = document.getElementById('feedback-title');
        const fbDetail = document.getElementById('feedback-detail');
        const nextBtn = document.getElementById('next-btn');

        if (isCorrect) {
            this.state.score++;
            this.els.feedback.className = 'feedback-overlay show feedback-correct';
            fbTitle.innerText = "太棒了！🎉";
            fbDetail.innerText = "回答正确";
            nextBtn.style.color = "#58a700";
        } else {
            this.els.feedback.className = 'feedback-overlay show feedback-wrong';
            if (isTimeout) {
                fbTitle.innerText = "时间到！⏰";
                fbDetail.innerText = `正确答案是: ${q.answer}`;
            } else {
                fbTitle.innerText = "答错了 😕";
                fbDetail.innerText = `正确答案是: ${q.answer}`;
            }
            nextBtn.style.color = "#ea2b2b";
        }

        if (this.hideTimer) clearTimeout(this.hideTimer);
        this.hideTimer = setTimeout(() => this.nextQuestion(), 800);
        
        document.addEventListener('click', this.hideFeedbackHandler = (e) => {
            if (!e.target.closest('#next-btn') && !e.target.closest('.btn-choice')) {
                this.nextQuestion();
            }
        });
    }
    
    nextQuestion() {
        if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null; }
        this.stopCountdown();
        document.removeEventListener('click', this.hideFeedbackHandler);
        this.els.feedback.classList.remove('show');
        this.state.currentIdx++;
        setTimeout(() => this.loadCurrentQuestion(), 300);
    }

    playSound(correct) {
        const audio = correct ? document.getElementById('audio-right') : document.getElementById('audio-wrong');
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
        }
    }

    endGame() {
        this.els.game.style.display = 'none';
        this.els.header.style.display = 'none';
        document.getElementById('result-screen').style.display = 'block';
        
        const score = this.state.score;
        const total = config.count;
        const pct = score / total;
        
        document.getElementById('final-score').innerText = `${score} / ${total}`;
        
        const emojiEl = document.getElementById('result-emoji');
        const titleEl = document.getElementById('result-title');
        
        // 视觉反馈逻辑
        if (pct >= 0.9) {
            emojiEl.innerText = pct === 1 ? '🏆' : '🎉';
            titleEl.innerText = pct === 1 ? '完美通关！' : '表现优异！';
            FX.startFireworks();
            const audio = document.getElementById('audio-complete');
            if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
        } else if (pct >= 0.6) {
            emojiEl.innerText = '😃';
            titleEl.innerText = '还不错哦';
            const audio = document.getElementById('audio-mid');
            if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
        } else {
            emojiEl.innerText = '🌧️';
            titleEl.innerText = '继续加油...';
            FX.startRain();
            const audio = document.getElementById('audio-failed');
            if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
        }
    }
}

const game = new MathGame();