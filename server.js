require('dotenv').config();
const bcrypt = require('bcryptjs');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const app = express();
app.use(cors());
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());
app.get('/api/test', (req, res) => {
    res.json({ message: "Сервер аукциона успешно запущен и работает!" });
});
app.get('/', (req, res) => {
    res.send({ message: "главная" });
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
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
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
        
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ error: "Пользователь не найден" });
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: "Неверный пароль" });
        }
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
        
        res.json({ token, username: user.username });
    } catch (error) {
        res.status(500).json({ error: "Ошибка сервера при входе" });
    }
});

const PORT = process.env.PORT || 5000;


app.listen(PORT, () => {
    console.log(`порт http://localhost:${PORT}`);
});