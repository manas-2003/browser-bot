/**
 * Amazon Shopping Demo
 *
 * Phase 3: Real-world E-commerce Demo
 *
 * This demo shows BrowserBot autonomously:
 * 1. Opening Amazon
 * 2. Searching for "men's t-shirt"
 * 3. Selecting a product
 * 4. Adding it to cart
 */

import { BrowserBot } from '../src/agent/BrowserBot.js';

async function runAmazonDemo() {
  console.log('═'.repeat(70));
  console.log('🛒 AMAZON SHOPPING DEMO');
  console.log('═'.repeat(70));
  console.log('');
  console.log('Task: Open Amazon, search for men\'s t-shirt, and add one to cart');
  console.log('');
  console.log('═'.repeat(70));
  console.log('');

  const bot = new BrowserBot();

  try {
    // Initialize BrowserBot
    console.log('⚙️  Initializing BrowserBot...\n');
    await bot.initialize();

    console.log('✅ BrowserBot ready!\n');
    console.log('Starting autonomous shopping task...\n');

    // Task: Amazon shopping automation
    const task = `
Open Amazon (https://www.amazon.com) and do the following:
1. Search for "men's t-shirt"
2. Click on the first product from the search results
3. Add the product to cart
4. Confirm that the item was added to cart

Report back with:
- Product name
- Price
- Confirmation that it's in the cart
`;

    // Run the autonomous agent
    const result = await bot.run(task, {
      maxSteps: 20, // Allow more steps for e-commerce flow
      maxFailures: 5, // Be more tolerant of failures
      temperature: 0.7,
      maxTokens: 3000,
    });

    // Display results
    console.log('\n' + '═'.repeat(70));
    console.log('📊 DEMO RESULTS');
    console.log('═'.repeat(70));
    console.log(`✅ Success: ${result.success}`);
    console.log(`📝 Message: ${result.message}`);
    console.log(`🔢 Steps Taken: ${result.stepsTaken}`);
    console.log(`🚪 Exit Reason: ${result.exitReason}`);
    console.log('═'.repeat(70));
    console.log('');

    // Show conversation history
    if (result.conversationHistory.length > 0) {
      console.log('📜 Conversation Summary:');
      console.log('─'.repeat(70));

      // Show last few messages
      const lastMessages = result.conversationHistory.slice(-5);
      lastMessages.forEach((msg, idx) => {
        const role = msg.role.toUpperCase().padEnd(10);
        const preview = msg.content.substring(0, 150);
        console.log(`${idx + 1}. [${role}] ${preview}${msg.content.length > 150 ? '...' : ''}`);
      });
      console.log('─'.repeat(70));
      console.log('');
    }

    // Cleanup
    await bot.cleanup();

    if (result.success) {
      console.log('✅ DEMO SUCCESSFUL!');
      console.log('   BrowserBot successfully completed the Amazon shopping task.');
      process.exit(0);
    } else {
      console.log('⚠️  DEMO INCOMPLETE');
      console.log(`   Reason: ${result.exitReason}`);
      console.log(`   Steps taken: ${result.stepsTaken}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ DEMO FAILED:', error);
    await bot.cleanup();
    process.exit(1);
  }
}

// Run the demo
console.log('\n🚀 Starting Amazon Shopping Demo...\n');
runAmazonDemo();
