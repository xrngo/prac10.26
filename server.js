require('dotenv').config();
const path = require('path');
const http = require('http');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const express = require('express');
const multer = require('multer');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT']
    }
});

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_auction_key_2026';
const PORT = 5000;
const prisma = new PrismaClient();

// Настройка папки uploads для картинок
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Хранилище таймеров для автозакрытия лотов
const lotTimers = new Map();

io.on('connection', (socket) => {
    socket.on('join_lot', (lotId) => socket.join(`lot_${lotId}`));
    socket.on('leave_lot', (lotId) => socket.leave(`lot_${lotId}`));
});

async function finalizeLot(lotId) {
    try {
        lotTimers.delete(lotId);
        const lot = await prisma.lot.findUnique({
            where: { id: lotId },
            include: {
                bids: { orderBy: [{ amount: 'desc' }, { created_at: 'asc' }], take: 1 }
            }
        });

        if (!lot || lot.status !== 'active') return;

        const remaining = new Date(lot.end_time).getTime() - Date.now();
        if (remaining > 0) {
            scheduleLotClosing(lot.id, lot.end_time);
            return;
        }

        const topBid = lot.bids[0] || null;
        const winnerId = topBid ? topBid.user_id : null;

        const updatedLot = await prisma.lot.update({
            where: { id: lot.id },
            data: { status: 'completed', winner_id: winnerId },
            include: {
                winner: { select: { id: true, username: true } },
                seller: { select: { id: true, username: true } },
                category: true,
                images: true,
                bids: { include: { user: { select: { id: true, username: true } } }, orderBy: { created_at: 'desc' } }
            }
        });

        io.to(`lot_${lot.id}`).emit('lot_ended', {
            lot_id: lot.id,
            status: 'completed',
            winner: updatedLot.winner,
            lot: updatedLot
        });
        io.emit('lot_ended', {
            lot_id: lot.id,
            status: 'completed',
            winner: updatedLot.winner,
            lot: updatedLot
        });
    } catch (error) {
        console.error(`Ошибка закрытия лота ${lotId}:`, error);
    }
}

function scheduleLotClosing(lotId, endTime) {
    if (lotTimers.has(lotId)) clearTimeout(lotTimers.get(lotId));
    const delay = new Date(endTime).getTime() - Date.now();
    if (delay <= 0) {
        finalizeLot(lotId);
    } else {
        const timerId = setTimeout(() => finalizeLot(lotId), Math.min(delay, 2147483647));
        lotTimers.set(lotId, timerId);
    }
}

async function initActiveLotTimers() {
    try {
        const activeLots = await prisma.lot.findMany({ where: { status: 'active' }, select: { id: true, end_time: true } });
        activeLots.forEach(lot => scheduleLotClosing(lot.id, lot.end_time));
    } catch (e) {
        console.error("Ошибка инициализации таймеров:", e);
    }
}

// --- API ---

app.get('/api/categories', async (req, res) => {
    try {
        const categories = await prisma.category.findMany();
        res.json(categories);
    } catch (e) {
        res.status(500).json({ error: "Ошибка получения категорий" });
    }
});

app.get('/api/lots', async (req, res) => {
    try {
        const lots = await prisma.lot.findMany({
            include: {
                category: true,
                images: true,
                seller: { select: { id: true, username: true } },
                winner: { select: { id: true, username: true } },
                bids: { include: { user: { select: { id: true, username: true } } }, orderBy: { created_at: 'desc' } }
            },
            orderBy: { end_time: 'asc' }
        });
        res.json(lots);
    } catch (e) {
        res.status(500).json({ error: "Ошибка получения лотов" });
    }
});

app.get('/api/lots/:id', async (req, res) => {
    try {
        const lot = await prisma.lot.findUnique({
            where: { id: req.params.id },
            include: {
                category: true,
                images: true,
                seller: { select: { id: true, username: true } },
                winner: { select: { id: true, username: true } },
                bids: { include: { user: { select: { id: true, username: true } } }, orderBy: { created_at: 'desc' } }
            }
        });
        if (!lot) return res.status(404).json({ error: "Лот не найден" });
        res.json(lot);
    } catch (e) {
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) return res.status(400).json({ error: "Заполните все поля" });
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.create({ data: { username, email, password_hash: hashedPassword } });
        res.json({ message: "Успешно зарегистрирован" });
    } catch (e) {
        res.status(400).json({ error: "Email или имя уже заняты" });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: "Неверный email или пароль" });
        }
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, username: user.username, userId: user.id });
    } catch (e) {
        res.status(500).json({ error: "Ошибка входа" });
    }
});

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Требуется авторизация" });
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ error: "Недействительный токен" });
        req.userId = decoded.userId;
        next();
    });
}

app.get('/api/me', authenticateToken, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.userId } });
        if (!user) return res.status(404).json({ error: "Пользователь не найден" });
        res.json({ id: user.id, username: user.username, email: user.email });
    } catch (e) {
        res.status(500).json({ error: "Ошибка получения профиля" });
    }
});

app.put('/api/me', authenticateToken, async (req, res) => {
    try {
        const { username, email } = req.body;
        const updated = await prisma.user.update({
            where: { id: req.userId },
            data: { username, email }
        });
        res.json({ id: updated.id, username: updated.username, email: updated.email });
    } catch (e) {
        res.status(500).json({ error: "Ошибка обновления профиля" });
    }
});

app.get('/api/my-bids', authenticateToken, async (req, res) => {
    try {
        const bids = await prisma.bid.findMany({
            where: { user_id: req.userId },
            include: { lot: { include: { winner: { select: { id: true, username: true } } } } },
            orderBy: { created_at: 'desc' }
        });
        res.json(bids);
    } catch (e) {
        res.status(500).json({ error: "Ошибка получения ставок" });
    }
});

// Загрузка файлов через CreateLot_2.jsx
app.post('/api/upload', authenticateToken, upload.array('images', 10), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) return res.status(400).json({ error: "Файлы не переданы" });
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const urls = req.files.map(file => `${baseUrl}/uploads/${file.filename}`);
        res.json({ urls });
    } catch (e) {
        res.status(500).json({ error: "Ошибка загрузки файлов" });
    }
});

app.post('/api/lots', authenticateToken, async (req, res) => {
    try {
        const { title, description, starting_price, min_step, category_id, end_time, images } = req.body;
        const priceNum = parseInt(starting_price, 10);
        const stepNum = parseInt(min_step, 10) || 500;
        const endDate = end_time ? new Date(end_time) : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

        let imageUrls = [];
        if (Array.isArray(images)) {
            imageUrls = images.map(url => String(url).trim()).filter(Boolean);
        }

        const lot = await prisma.lot.create({
            data: {
                title: title.trim(),
                description: description.trim(),
                starting_price: priceNum,
                current_price: priceNum,
                min_step: stepNum,
                end_time: endDate,
                category_id,
                seller_id: req.userId,
                status: 'active',
                ...(imageUrls.length > 0 && {
                    images: { create: imageUrls.map(url => ({ url })) }
                })
            },
            include: { category: true, images: true, seller: { select: { id: true, username: true } } }
        });

        scheduleLotClosing(lot.id, lot.end_time);
        io.emit('lot_created', lot);
        res.status(201).json(lot);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Ошибка создания лота" });
    }
});

app.post('/api/lots/:id/bids', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const bidAmount = parseInt(req.body.amount, 10);

    try {
        const result = await prisma.$transaction(async (tx) => {
            const lot = await tx.lot.findUnique({ where: { id } });
            if (!lot) throw { status: 404, message: "Лот не найден" };
            if (lot.status !== 'active' || new Date(lot.end_time) <= new Date()) {
                throw { status: 400, message: "Торги завершены" };
            }
            if (lot.seller_id === req.userId) {
                throw { status: 400, message: "Нельзя ставить на свой лот" };
            }

            const minRequired = lot.current_price + lot.min_step;
            if (bidAmount < minRequired) {
                throw { status: 400, message: `Минимальная ставка: ${minRequired} ₽` };
            }

            await tx.lot.update({
                where: { id: lot.id },
                data: { current_price: bidAmount, version: { increment: 1 } }
            });

            const newBid = await tx.bid.create({
                data: { lot_id: lot.id, user_id: req.userId, amount: bidAmount },
                include: { user: { select: { id: true, username: true } } }
            });

            const updatedLot = await tx.lot.findUnique({
                where: { id: lot.id },
                include: {
                    category: true,
                    images: true,
                    seller: { select: { id: true, username: true } },
                    winner: { select: { id: true, username: true } },
                    bids: { include: { user: { select: { id: true, username: true } } }, orderBy: { created_at: 'desc' } }
                }
            });

            return { newBid, updatedLot };
        });

        io.to(`lot_${id}`).emit('bid_placed', {
            lot_id: id,
            current_price: bidAmount,
            bid: result.newBid,
            lot: result.updatedLot
        });
        io.emit('bid_update', {
            lot_id: id,
            current_price: bidAmount,
            bid: result.newBid,
            lot: result.updatedLot
        });

        res.status(201).json({ message: "Ставка принята", lot: result.updatedLot });
    } catch (e) {
        if (e.status) return res.status(e.status).json({ error: e.message });
        console.error(e);
        res.status(500).json({ error: "Ошибка обработки ставки" });
    }
});

app.post('/api/lots/:id/buyout', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await prisma.$transaction(async (tx) => {
            const lot = await tx.lot.findUnique({ where: { id } });
            if (!lot) throw { status: 404, message: "Лот не найден" };
            if (lot.status !== 'active') throw { status: 400, message: "Торги уже завершены" };
            if (lot.seller_id === req.userId) throw { status: 400, message: "Нельзя выкупить свой лот" };

            const minStep = lot.min_step || 500;
            const buyoutPrice = Math.max(Math.round(lot.starting_price * 1.5), lot.current_price + minStep * 2);

            const updatedLot = await tx.lot.update({
                where: { id: lot.id },
                data: { status: 'completed', winner_id: req.userId, current_price: buyoutPrice },
                include: {
                    category: true,
                    images: true,
                    seller: { select: { id: true, username: true } },
                    winner: { select: { id: true, username: true } },
                    bids: { include: { user: { select: { id: true, username: true } } }, orderBy: { created_at: 'desc' } }
                }
            });
            return updatedLot;
        });

        io.to(`lot_${id}`).emit('lot_ended', { lot_id: id, status: 'completed', winner: result.winner, lot: result });
        io.emit('lot_ended', {lot_id: id, status: 'completed', winner: updatedLot.winner,lot: updatedLot });

        res.json({ message: "Лот выкуплен", lot: result });
    } catch (e) {
        if (e.status) return res.status(e.status).json({ error: e.message });
        res.status(500).json({ error: "Ошибка выкупа" });
    }
});

server.listen(PORT, 'localhost', () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
    initActiveLotTimers();
});