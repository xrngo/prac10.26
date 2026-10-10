require('dotenv').config();
const path = require('path');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const express = require('express');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_auction_key_2026';
const PORT = 5000;


const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();


app.get('/api/test', (req, res) => {
    res.json({ message: "Сервер аукциона успешно запущен и работает!" });
});

app.get('/api/categories', async (req, res) => {
    try {
        const categories = await prisma.category.findMany();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: "Ошибка при получении категорий" });
    }
});

app.get('/api/lots', async (req, res) => {
    try {
        const lots = await prisma.lot.findMany({
            include: {
                category: true,
                seller: { 
                    select: { username: true }
                }
            }
        });
        res.json(lots);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Ошибка при получении лотов" });
    }
});

app.get('/api/lots/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const lot = await prisma.lot.findUnique({
            where: { id: id },
            include: {
                category: true,
                seller: { select: { username: true } },
                bids: { 
                    include: { user: { select: { username: true } } },
                    orderBy: { created_at: 'desc' }
                }
            }
        });

        if (!lot) {
            return res.status(404).json({ error: "Лот не найден" });
        }

        res.json(lot);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Ошибка сервера при поиске лота" });
    }
});

// --- авторизация

// 1 регистрация
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ error: "Все поля обязательны" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.create({
            data: {
                username,
                email,
                password_hash: hashedPassword
            }
        });
        
        res.json({ message: "Пользователь успешно зарегистрирован" });
    } catch (error) {
        res.status(400).json({ error: "Ошибка: возможно, такой email или имя уже заняты" });
    }
});

// 2 вход логин
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: "Укажите email и пароль" });
        }
        
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ error: "Пользователь не найден" });
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: "Неверный пароль" });
        }
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
        
        res.json({ token, username: user.username });
    } catch (error) {
        res.status(500).json({ error: "Ошибка сервера при входе" });
    }
});

// Аутентификация по JWT токену
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: "Токен не предоставлен, требуется авторизация" });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: "Недействительный или истекший токен" });
        }
        req.userId = decoded.userId;
        next();
    });
}

app.get('/api/me', authenticateToken, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.userId } });
        if (!user) {
            return res.status(404).json({ error: "Пользователь не найден" });
        }
        res.json({ id: user.id, username: user.username, email: user.email });
    } catch (error) {
        res.status(500).json({ error: "Ошибка при получении профиля" });
    }
});

// Создание нового лота
app.post('/api/lots', authenticateToken, async (req, res) => {
    try {
        const { title, description, starting_price, min_step, category_id, end_time } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ error: "Укажите название лота" });
        }
        if (!description || !description.trim()) {
            return res.status(400).json({ error: "Укажите описание лота" });
        }
        if (!category_id) {
            return res.status(400).json({ error: "Выберите категорию для лота" });
        }

        const priceNum = parseInt(starting_price, 10);
        if (isNaN(priceNum) || priceNum <= 0) {
            return res.status(400).json({ error: "Стартовая цена должна быть положительным числом" });
        }

        const stepNum = parseInt(min_step, 10) || 100;
        if (stepNum <= 0) {
            return res.status(400).json({ error: "Минимальный шаг ставки должен быть больше 0" });
        }

        let endDate;
        if (end_time) {
            endDate = new Date(end_time);
            if (isNaN(endDate.getTime()) || endDate.getTime() <= Date.now()) {
                return res.status(400).json({ error: "Время окончания аукциона должно быть позже текущего времени" });
            }
        } else {
            endDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
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
                status: 'active'
            }
        });

        const fullLot = await prisma.lot.findUnique({
            where: { id: lot.id },
            include: {
                category: true,
                seller: { select: { username: true } }
            }
        });

        res.status(201).json(fullLot || lot);
    } catch (error) {
        console.error("Ошибка при создании лота:", error);
        res.status(500).json({ error: "Ошибка сервера при создании лота" });
    }
});

// Serve frontend static build
const clientDistPath = path.join(__dirname, 'client/build');
app.use(express.static(clientDistPath));

app.use((req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'Endpoint not found' });
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
});

app.listen(PORT, 'localhost', () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
