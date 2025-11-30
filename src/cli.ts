/**
 * Interactive CLI for BrowserBot
 */

import prompts from 'prompts';
import { BrowserBot } from './agent/BrowserBot.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Get task details from user
 */
async function getTaskDetails() {
  const questions = [
    {
      type: 'text' as const,
      name: 'task',
      message: 'What do you want the browser to do?',
      validate: (value: string) => value.length > 0 || 'Please enter a task description',
    },
    {
      type: 'number' as const,
      name: 'maxSteps',
      message: 'Maximum number of steps?',
      initial: 10,
      min: 1,
      max: 100,
    },
  ];

  return await prompts(questions);
}

/**
 * Main CLI function
 */
async function main() {
  console.log('\n🤖 Welcome to BrowserBot - Autonomous Browser Agent\n');

  // Get task details from user
  const answers = await getTaskDetails();

  // User cancelled
  if (!answers.task) {
    console.log('\n❌ Task cancelled by user\n');
    process.exit(0);
  }

  // Create and initialize agent
  const agent = new BrowserBot();

  try {
    await agent.initialize();

    // Run the task
    const result = await agent.run(answers.task, {
      maxSteps: answers.maxSteps,
      maxFailures: 3,
    });

    // Display results
    console.log('\n' + '═'.repeat(70));
    console.log('📊 FINAL RESULT');
    console.log('═'.repeat(70));
    console.log(`Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Message: ${result.message}`);
    console.log(`Steps taken: ${result.stepsTaken}`);
    console.log(`Exit reason: ${result.exitReason}`);
    console.log('═'.repeat(70));
    console.log('');

  } catch (error) {
    console.error('\n❌ Error running BrowserBot:', error);
    process.exit(1);
  } finally {
    // Cleanup
    await agent.cleanup();
  }
}

// Run CLI
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
