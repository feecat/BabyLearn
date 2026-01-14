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
let config = { count: 20, modes: ['choice'] };

function adjustCount(delta) {
    let newVal = config.count + delta;
    if (newVal < 10) newVal = 10;
    if (newVal > 100) newVal = 100;
    config.count = newVal;
    document.getElementById('q-count-display').innerText = config.count;
}

function toggleMode(mode) {
    const idx = config.modes.indexOf(mode);
    const el = document.getElementById('mode-' + mode);
    
    if (idx > -1) {
        if (config.modes.length > 1) { // 至少保留一个
            config.modes.splice(idx, 1);
            el.classList.remove('active');
        }
    } else {
        config.modes.push(mode);
        el.classList.add('active');
    }
}

// --- 游戏逻辑 ---
class MathGame {
    constructor() {
        this.state = {
            queue: [], // 题目队列
            currentIdx: 0,
            score: 0,
            userInput: '',
            isLocked: false // 防止重复点击
        };
        
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
            progress: document.getElementById('progress')
        };
    }

    start(chapterId) {
        this.state.score = 0;
        this.state.currentIdx = 0;
        this.generateQueue(chapterId);
        
        // 切换界面
        this.els.setup.style.display = 'none';
        this.els.game.style.display = 'flex';
        this.els.header.style.display = 'block';
        
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
        
        if (ch === 1) { // 比大小
            const a = rand(1, 20); const b = rand(1, 20);
            q.text = `${a} ◯ ${b}`;
            q.answer = a === b ? '=' : (a > b ? '>' : '<');
            q.type = 'compare';
        } else if (ch === 2) { // 加法
            const a = rand(0, 5); const b = rand(0, 5);
            q.text = `${a} + ${b} = ?`;
            q.answer = (a + b).toString();
            q.type = 'math';
        } else if (ch === 3) { // 减法
            const a = rand(1, 10); const b = rand(0, a);
            q.text = `${a} - ${b} = ?`;
            q.answer = (a - b).toString();
            q.type = 'math';
        } else { // 混合
            if (Math.random() > 0.5) {
                const a = rand(0, 10); const b = rand(0, 10);
                q.text = `${a} + ${b} = ?`;
                q.answer = (a+b).toString();
            } else {
                const a = rand(5, 20); const b = rand(0, a);
                q.text = `${a} - ${b} = ?`;
                q.answer = (a-b).toString();
            }
            q.type = 'math';
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
        this.els.question.innerText = q.text;
        const pct = (this.state.currentIdx / config.count) * 100;
        this.els.progress.style.width = `${pct}%`;
        
        // 根据当前题目的模式渲染
        if (q.mode === 'choice') {
            this.setupChoiceMode(q);
        } else {
            this.setupInputMode(q);
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

    checkInputAnswer() {
        if (!this.state.userInput) return;
        this.checkAnswer(this.state.userInput);
    }

    checkAnswer(val) {
        if (this.state.isLocked) return;
        this.state.isLocked = true; // 锁定防止连点

        const q = this.state.queue[this.state.currentIdx];
        const isCorrect = val === q.answer;
        
        // 播放简单音效
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
            fbTitle.innerText = "答错了 😕";
            fbDetail.innerText = `正确答案是: ${q.answer}`;
            nextBtn.style.color = "#ea2b2b";
        }
    }
    
    nextQuestion() {
        this.els.feedback.classList.remove('show');
        this.state.currentIdx++;
        // 延迟一点加载下一题，让反馈条收回去的动画顺滑
        setTimeout(() => this.loadCurrentQuestion(), 300);
    }

    playSound(correct) {
        // 使用 AudioContext 生成简单的 Beep 声，避免加载外部文件
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        if (correct) {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587, ctx.currentTime); // High pitch
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
        } else {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, ctx.currentTime); // Low pitch
            osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.2);
        }
        
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.stop(ctx.currentTime + 0.3);
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
        if (pct === 1) {
            emojiEl.innerText = '🏆';
            titleEl.innerText = '完美通关！';
            FX.startFireworks(); // 烟花
        } else if (pct >= 0.8) {
            emojiEl.innerText = '🎉';
            titleEl.innerText = '表现优异！';
            FX.startFireworks(); // 少量烟花
        } else if (pct >= 0.6) {
            emojiEl.innerText = '😃';
            titleEl.innerText = '还不错哦';
        } else {
            emojiEl.innerText = '🌧️';
            titleEl.innerText = '继续加油...';
            FX.startRain(); // 下雨
        }
    }
}

const game = new MathGame();