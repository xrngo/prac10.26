const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
DATABASE_URL="postgresql://postgres:12345@localhost:5432/auction_db?schema=public"
JWT_SECRET="super_secret_auction_key_2026"

async function main() {
    console.log('Очищаем старые данные для чистого старта...');
    await prisma.bid.deleteMany();
    await prisma.lot.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();

    console.log('Создаем новые тестовые данные...');

    const catElectronics = await prisma.category.create({ data: { name: 'Электроника' } });
    const testUser = await prisma.user.create({
        data: {
            username: 'Иван продавец',
            email: 'tests@test.com',
            password_hash: 'fake_hash_123'
        }
    });

    // тест лотs
    await prisma.lot.create({
        data: {
            title: 'Игровой монитор 300 Гц',
            description: 'Отличный монитор в идеальном состоянии, без битых пикселей.',
            starting_price: 15000,
            current_price: 15000,
            min_step: 500,          
            end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            category_id: catElectronics.id,
            seller_id: testUser.id
        }
    });

    console.log('база успешно заполнена тестовым лотом и пользователем');
}

main()
  .catch((e) => console.error("Ошибка:", e))
  .finally(async () => {
    await prisma.$disconnect();
  });