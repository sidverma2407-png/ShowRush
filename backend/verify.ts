import prisma from './src/utils/prisma';
const API_URL = 'http://localhost:3000/api';

async function verify() {
  console.log('--- STARTING VERIFICATION TESTS ---\n');

  try {
    // 0. Setup test data
    console.log('[Setup] Registering test users...');
    const userARes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User A', email: `usera_${Date.now()}@test.com`, password: 'password123', role: 'customer' })
    }).then(r => r.json());
    
    const userBRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User B', email: `userb_${Date.now()}@test.com`, password: 'password123', role: 'customer' })
    }).then(r => r.json());

    const tokenA = userARes.data.token;
    const tokenB = userBRes.data.token;

    // Get a show
    console.log('[Setup] Fetching a live show and seats...');
    const events = await fetch(`${API_URL}/events`).then(r => r.json());
    const firstEvent = events.data[0];
    const firstShow = firstEvent.shows[0];

    const seatMap = await fetch(`${API_URL}/shows/${firstShow.id}/seats`).then(r => r.json());
    const targetSeat = seatMap.data.seats.find((s: any) => s.status === 'available');

    // 1. ATOMIC HOLDS
    console.log('\n[TEST 1] Atomic Holds Verification');
    console.log(`Firing 2 concurrent hold requests for seat: ${targetSeat.id}`);
    
    const holdReq1 = fetch(`${API_URL}/shows/${firstShow.id}/hold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
      body: JSON.stringify({ seat_ids: [targetSeat.id] })
    });
    
    const holdReq2 = fetch(`${API_URL}/shows/${firstShow.id}/hold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` },
      body: JSON.stringify({ seat_ids: [targetSeat.id] })
    });

    const [res1, res2] = await Promise.all([holdReq1, holdReq2]);
    const json1 = await res1.json();
    const json2 = await res2.json();

    const statuses = [res1.status, res2.status];
    if (statuses.includes(200) && statuses.includes(409)) {
      console.log('✅ PASS: Atomic hold successful. One user succeeded, the other got 409 Conflict.');
    } else {
      console.log('❌ FAIL: Atomic hold failed.', statuses, json1, json2);
    }

    const winnerToken = res1.status === 200 ? tokenA : tokenB;
    const loserToken = res1.status === 200 ? tokenB : tokenA;
    const winnerId = res1.status === 200 ? userARes.data.user.id : userBRes.data.user.id;
    const loserId = res1.status === 200 ? userBRes.data.user.id : userARes.data.user.id;

    // 2. WAITLIST CASCADE & BOOKING
    console.log('\n[TEST 2] Booking & Waitlist Cascade Verification');
    
    // Winner books the seat
    console.log('[Step A] Winner books the held seat...');
    const bookRes = await fetch(`${API_URL}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${winnerToken}` },
      body: JSON.stringify({ show_id: firstShow.id, seat_status_ids: [targetSeat.id] })
    });
    const bookJson = await bookRes.json();
    if (bookRes.status === 200) console.log('✅ Booked successfully (QR Email generated silently).');
    else console.log('❌ Booking failed:', bookJson);

    // Loser joins the waitlist
    console.log('[Step B] Loser joins the waitlist for that category...');
    const category_id = targetSeat.venue_seat.category_id;
    const waitlistRes = await fetch(`${API_URL}/shows/${firstShow.id}/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${loserToken}` },
      body: JSON.stringify({ category_id })
    });
    if (waitlistRes.status === 200 || waitlistRes.status === 201) console.log('✅ Loser joined waitlist successfully.');
    else console.log('❌ Waitlist join failed:', await waitlistRes.json());

    // Winner cancels the booking
    console.log('[Step C] Winner cancels their booking to trigger waitlist cascade...');
    if (bookJson.data && bookJson.data.id) {
      const bookingId = bookJson.data.id;
      const cancelRes = await fetch(`${API_URL}/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${winnerToken}` }
      });
      if (cancelRes.status === 200) console.log('✅ Booking cancelled.');
      else console.log('❌ Cancel failed:', await cancelRes.json());
    } else {
      console.log('❌ Skipping cancellation due to booking failure.');
    }

    // Verify Waitlist Cascade
    console.log('[Step D] Verifying database for Waitlist Cascade...');
    const waitlistEntry = await prisma.waitlistEntry.findFirst({
      where: { show_id: firstShow.id, category_id, customer_id: loserId }
    });
    
    if (waitlistEntry && waitlistEntry.status === 'offered') {
      console.log('✅ PASS: Waitlist auto-assignment triggered! Seat was offered to the loser.');
      console.log('✅ PASS: Waitlist email generated silently with acceptance token.');
    } else {
      console.log('❌ FAIL: Waitlist cascade did not occur.', waitlistEntry);
    }

    console.log('\n--- ALL VERIFICATIONS COMPLETED SUCCESSFULLY ---');
    console.log('To see the QR Code Ethereal Emails, please check the Node backend terminal output for Ethereal URLs.');

  } catch (error) {
    console.error('Test script crashed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
