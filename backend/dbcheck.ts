import prisma from './src/utils/prisma';
async function test() {
  try {
    const seat = await prisma.seatStatus.findFirst({ where: { status: 'held' } });
    if (!seat) return console.log('No held seats found.');
    
    console.log('Found seat:', seat.id);
    const seatArray = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM seat_status WHERE id = $1 FOR UPDATE`, seat.id);
    console.log('Query array:', seatArray);
  } catch (e) {
    console.error('Error during query:', e);
  } finally {
    await prisma.$disconnect();
  }
}
test();
