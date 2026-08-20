import cron from 'node-cron';
import prisma from '../utils/prisma';
import { io } from '../index';
import { sendWaitlistOfferEmail } from '../utils/email';

export const startScheduler = () => {
  // 1. Hold Expiry Sweep (every minute)
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      
      const expiredHolds = await prisma.seatStatus.findMany({
        where: {
          status: 'held',
          hold_expires_at: { lt: now }
        }
      });

      if (expiredHolds.length > 0) {
        const ids = expiredHolds.map(h => h.id);
        await prisma.seatStatus.updateMany({
          where: { id: { in: ids } },
          data: { status: 'available', held_by: null, hold_expires_at: null }
        });

        // Broadcast updates
        for (const hold of expiredHolds) {
          const updated = await prisma.seatStatus.findUnique({ where: { id: hold.id } });
          io.to(hold.show_id).emit('seat_status_updated', updated);
        }
        console.log(`[Scheduler] Released ${expiredHolds.length} expired holds.`);
      }
    } catch (error) {
      console.error('[Scheduler] Hold expiry error', error);
    }
  });

  // 2. Waitlist Offer Expiry Sweep (every minute)
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      
      const expiredOffers = await prisma.waitlistEntry.findMany({
        where: {
          status: 'offered',
          offer_expires_at: { lt: now }
        }
      });

      for (const expiredOffer of expiredOffers) {
        // Mark as expired
        await prisma.waitlistEntry.update({
          where: { id: expiredOffer.id },
          data: { status: 'expired' }
        });

        const showId = expiredOffer.show_id;
        const catId = expiredOffer.category_id;
        const seatId = expiredOffer.offered_venue_seat_id!;

        // Find next in waitlist
        const nextEntry = await prisma.waitlistEntry.findFirst({
          where: { show_id: showId, category_id: catId, status: 'waiting' },
          orderBy: { position: 'asc' }
        });

        if (nextEntry) {
          const offerTTL = Number(process.env.WAITLIST_OFFER_TTL_MINUTES) || 15;
          const expiresAt = new Date(Date.now() + offerTTL * 60000);
          
          await prisma.waitlistEntry.update({
            where: { id: nextEntry.id },
            data: { status: 'offered', offered_venue_seat_id: seatId, offer_expires_at: expiresAt }
          });

          await prisma.seatStatus.update({
            where: { show_id_venue_seat_id: { show_id: showId, venue_seat_id: seatId } },
            data: { status: 'held', held_by: nextEntry.customer_id, hold_expires_at: expiresAt }
          });

          const user = await prisma.user.findUnique({ where: { id: nextEntry.customer_id } });
          const show = await prisma.show.findUnique({ where: { id: showId }, include: { event: true } });
          if (user && show) {
            await sendWaitlistOfferEmail(user.email, nextEntry.id, show);
          }
        } else {
          // Revert to available
          const reverted = await prisma.seatStatus.update({
            where: { show_id_venue_seat_id: { show_id: showId, venue_seat_id: seatId } },
            data: { status: 'available', held_by: null, hold_expires_at: null }
          });
          io.to(showId).emit('seat_status_updated', reverted);
        }
      }

      if (expiredOffers.length > 0) {
        console.log(`[Scheduler] Processed ${expiredOffers.length} expired waitlist offers.`);
      }
    } catch (error) {
      console.error('[Scheduler] Waitlist expiry error', error);
    }
  });
};
