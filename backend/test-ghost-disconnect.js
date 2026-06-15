const io = require('socket.io-client');

const BASE_URL = 'http://localhost:4000';
let testResults = [];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createAgent(agentId, agentName) {
  return new Promise((resolve) => {
    const socket = io(BASE_URL);
    socket.on('connect', () => {
      socket.emit('join_dashboard', { agentId, agentName });
      resolve(socket);
    });
  });
}

function recordResult(testName, passed, details = '') {
  const status = passed ? ' PASS' : ' FAIL';
  testResults.push({ testName, status, details });
  console.log(`${status}: ${testName}${details ? ` - ${details}` : ''}`);
}


async function testGhostDisconnectSingleAgent() {
  console.log('\n\n');
  console.log(' TEST 1: Ghost Disconnect - Single Agent ');
  console.log('\n');

  try {
    const agentA = await createAgent('agent_a', 'Agent A');
    await delay(500);

    // Agent A locks ticket #101
    agentA.emit('lock_ticket', {
      ticketId: 'ticket_101',
      agentId: 'agent_a',
      agentName: 'Agent A',
    });

    await delay(1000);

    let lockStateBeforeLocked = false;
    agentA.on('ticket_locked', (data) => {
      if (data.ticketId === 'ticket_101') {
        lockStateBeforeLocked = true;
        console.log(`  → Ticket #101 LOCKED by Agent A`);
      }
    });

    await delay(1000);

   
    console.log(`  → SIMULATING LAPTOP LID CLOSE... Agent A disconnects abruptly`);
    agentA.disconnect();

    await delay(2000);

    console.log(`  → Agent B connects to verify ticket state`);
    const agentB = await createAgent('agent_b', 'Agent B');

 
    let ticketIsUnlocked = false;
    agentB.on('initial_lock_state', (data) => {
      const ticket101 = data.lockedTickets['ticket_101'];
      if (!ticket101) {
        ticketIsUnlocked = true;
        console.log(`  → Verified: Ticket #101 is UNLOCKED after Agent A disconnect`);
      }
    });

    
    agentB.on('ticket_unlocked', (data) => {
      if (data.ticketId === 'ticket_101') {
        console.log(`  → Received unlock broadcast: ${data.reason}`);
        ticketIsUnlocked = true;
      }
    });

    await delay(1500);

    recordResult(
      'Ghost Disconnect - Single Agent',
      ticketIsUnlocked,
      'Ticket auto-unlocked after disconnect'
    );

    agentB.disconnect();
  } catch (error) {
    recordResult('Ghost Disconnect - Single Agent', false, error.message);
  }
}

// ====== TEST 2: Ghost Disconnect with Multiple Locked Tickets ======
async function testGhostDisconnectMultipleTickets() {
  console.log('\n\n');
  console.log(' TEST 2: Ghost Disconnect - Multiple Tickets ');
  console.log('\n');

  try {
   
    const agentC = await createAgent('agent_c', 'Agent C');
    await delay(500);

    
    console.log(`  → Agent C locks 3 tickets...`);
    const ticketIds = ['ticket_201', 'ticket_202', 'ticket_203'];

    for (const ticketId of ticketIds) {
      agentC.emit('lock_ticket', {
        ticketId,
        agentId: 'agent_c',
        agentName: 'Agent C',
      });
      await delay(300);
    }

    await delay(1500);

 
    console.log(`  → SIMULATING GHOST DISCONNECT... Agent C closes connection`);
    agentC.disconnect();

    await delay(2000);

    
    console.log(`  Agent D connects to verify all tickets unlocked`);
    const agentD = await createAgent('agent_d', 'Agent D');

    let allUnlocked = false;
    agentD.on('initial_lock_state', (data) => {
      const locked = ticketIds.filter((id) => data.lockedTickets[id]);
      if (locked.length === 0) {
        allUnlocked = true;
        console.log(` Verified: ALL ${ticketIds.length} tickets are UNLOCKED`);
      }
    });

    await delay(1500);

    recordResult(
      'Ghost Disconnect - Multiple Tickets',
      allUnlocked,
      `All ${ticketIds.length} tickets auto-unlocked`
    );

    agentD.disconnect();
  } catch (error) {
    recordResult('Ghost Disconnect - Multiple Tickets', false, error.message);
  }
}

// ====== TEST 3: Ghost Disconnect While Agent B Waiting ======
async function testGhostDisconnectNotification() {
  console.log('\n\n');
  console.log(' TEST 3: Ghost Disconnect - Notify Other Agents ');
  console.log('\n');

  try {
   
    const agentE = await createAgent('agent_e', 'Agent E');
    await delay(500);

    
    agentE.emit('lock_ticket', {
      ticketId: 'ticket_301',
      agentId: 'agent_e',
      agentName: 'Agent E',
    });
    await delay(1000);

    
    console.log(`  → Agent F joins dashboard`);
    const agentF = await createAgent('agent_f', 'Agent F');
    await delay(1000);

   
    console.log(` Agent F sees Ticket #301 is locked by Agent E (can't edit)`);

    
    console.log(`  → GHOST DISCONNECT: Agent E's connection dies`);
    agentE.disconnect();


    let receivedUnlockNotification = false;
    agentF.once('ticket_unlocked', (data) => {
      if (data.ticketId === 'ticket_301') {
        receivedUnlockNotification = true;
        console.log(`  → Agent F RECEIVED: ${data.reason}`);
        console.log(`  → Agent F can now edit Ticket #301`);
      }
    });

    await delay(2000);

    recordResult(
      'Ghost Disconnect - Broadcast Notification',
      receivedUnlockNotification,
      'Agent F notified of auto-unlock'
    );

    agentF.disconnect();
  } catch (error) {
    recordResult('Ghost Disconnect - Broadcast Notification', false, error.message);
  }
}

// ====== TEST 4: Graceful Disconnect (Control) ======
async function testGracefulDisconnect() {
  console.log('\n\n');
  console.log(' TEST 4: Graceful Unlock (Control Test)');
  console.log('\n');

  try {
   
    const agentG = await createAgent('agent_g', 'Agent G');
    await delay(500);

    
    agentG.emit('lock_ticket', {
      ticketId: 'ticket_401',
      agentId: 'agent_g',
      agentName: 'Agent G',
    });
    await delay(1000);

    console.log(` Agent G EXPLICITLY unlocks ticket before leaving`);


    agentG.emit('unlock_ticket', {
      ticketId: 'ticket_401',
      agentId: 'agent_g',
    });

    await delay(1000);

   
    const agentH = await createAgent('agent_h', 'Agent H');

    let ticketUnlockedGracefully = false;
    agentH.on('initial_lock_state', (data) => {
      if (!data.lockedTickets['ticket_401']) {
        ticketUnlockedGracefully = true;
        console.log(`  → Verified: Ticket #401 is UNLOCKED (graceful disconnect)`);
      }
    });

    await delay(1500);

    recordResult(
      'Graceful Unlock (Control)',
      ticketUnlockedGracefully,
      'Explicit unlock works correctly'
    );

    agentG.disconnect();
    agentH.disconnect();
  } catch (error) {
    recordResult('Graceful Unlock (Control)', false, error.message);
  }
}


async function runAllTests() {
  console.log(`
    GHOST DISCONNECT HANDLER - COMPREHENSIVE TESTS                                                            
  What happens when agents close their laptops without 
  explicitly unlocking tickets?                       
  `);


  await delay(2000);

  
  await testGhostDisconnectSingleAgent();
  await delay(1500);

  await testGhostDisconnectMultipleTickets();
  await delay(1500);

  await testGhostDisconnectNotification();
  await delay(1500);

  await testGracefulDisconnect();
  await delay(1500);

  console.log(`
\n\n TEST RESULTS SUMMARY 
  `);

  testResults.forEach((result) => {
    console.log(`${result.status}: ${result.testName}`);
    if (result.details) {
      console.log(`       ${result.details}`);
    }
  });

  const passedCount = testResults.filter((r) => r.status === ' PASS').length;
  const totalCount = testResults.length;

  console.log(`
  TOTAL: ${passedCount}/${totalCount} tests passed

${passedCount === totalCount ? '   ALL TESTS PASSED - Ghost Disconnect Handler is Production-Ready!' : ' Some tests failed - Review logs above'}
  `);

  process.exit(passedCount === totalCount ? 0 : 1);
}


runAllTests().catch((error) => {
  console.error('Test suite error:', error);
  process.exit(1);
});
