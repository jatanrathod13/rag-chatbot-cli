#!/usr/bin/env node

import { Command } from 'commander';
import { createRequire } from 'node:module'; // Use createRequire to import JSON
import { hasConfig } from '../src/config.js';
import { runConfigureWizard } from '../src/commands/configure.js';
import { runSetupDbCommand } from '../src/commands/setupDb.js'; // Import setupDb command
import { runAddFileCommand } from '../src/commands/addFile.js'; // Import addFile command
import { runListDocsCommand } from '../src/commands/listDocs.js'; // Import listDocs command
import { runDeleteDocCommand } from '../src/commands/deleteDoc.js'; // Import deleteDoc command
import {
    checkDatabaseSetup,
    executeSetupSql,
    getSetupSql
} from '../src/supabaseService.js'; // Import check/execute/get SQL
import inquirer from 'inquirer'; // Need inquirer for prompts
import chalk from 'chalk';
import { startChatLoop } from '../src/chat.js'; // Import the chat loop

// Helper to read package.json
const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const program = new Command();

// Program definition
program
    .name(Object.keys(pkg.bin)[0] || 'ragchat') // Use the name from bin in package.json
    .version(pkg.version)
    .description(pkg.description);

// 'configure' command
program
    .command('configure')
    .description('Configure Supabase and OpenAI credentials.')
    .action(runConfigureWizard); // Direct action assignment

// 'setup-db' command
program
    .command('setup-db')
    .alias('db-setup')
    .description('Check and setup the required Supabase database components.')
    .action(runSetupDbCommand); // Direct action assignment

// 'add' command
program
    .command('add <file_path>')
    .description('Add a document to the RAG system from a local file.')
    .action(async (filePath) => {
        // Ensure config and DB setup are checked before running add
        // This prevents running 'add' on an uninitialized system
        if (!hasConfig()) {
            console.error(chalk.red('Configuration not found. Please run `ragchat configure` first.'));
            process.exit(1);
        }
        try {
            const setupStatus = await checkDatabaseSetup();
            if (!setupStatus.allExist) {
                console.error(chalk.red('Database setup is incomplete. Please run `ragchat setup-db` or allow automatic setup first.'));
                 // Maybe offer to run setup here?
                 console.log(chalk.yellow(`Missing: ${setupStatus.missing.join(', ')}`));
                process.exit(1);
            }
            // If config and DB are okay, proceed with adding the file
            await runAddFileCommand(filePath);
        } catch (error) {
             console.error(chalk.red('Failed to check database status before adding file:'));
             console.error(chalk.red(error.message)); // Show specific error
             process.exit(1);
        }
    });

// 'list' command
program
    .command('list')
    .description('List all documents currently in the RAG system.')
    .action(async () => {
        // Similar checks needed before listing
        if (!hasConfig()) {
            console.error(chalk.red('Configuration not found. Please run `ragchat configure` first.'));
            process.exit(1);
        }
        try {
            const setupStatus = await checkDatabaseSetup();
            if (!setupStatus.allExist) {
                console.error(chalk.red('Database setup is incomplete. Please run `ragchat setup-db` first.'));
                console.log(chalk.yellow(`Missing: ${setupStatus.missing.join(', ')}`));
                process.exit(1);
            }
            await runListDocsCommand();
        } catch (error) {
            console.error(chalk.red('Failed to check database status before listing documents:'));
            console.error(chalk.red(error.message)); // Show specific error
            process.exit(1);
        }
    });

// 'delete' command
program
    .command('delete <identifier>')
    .description('Delete a document (and its sections) by ID or name.')
    .action(async (identifier) => {
        // Similar checks needed before deleting
        if (!hasConfig()) {
            console.error(chalk.red('Configuration not found. Please run `ragchat configure` first.'));
            process.exit(1);
        }
        try {
            const setupStatus = await checkDatabaseSetup();
            if (!setupStatus.allExist) {
                console.error(chalk.red('Database setup is incomplete. Please run `ragchat setup-db` first.'));
                console.log(chalk.yellow(`Missing: ${setupStatus.missing.join(', ')}`));
                process.exit(1);
            }
            await runDeleteDocCommand(identifier);
        } catch (error) {
            console.error(chalk.red('Failed to check database status before deleting document:'));
            console.error(chalk.red(error.message)); // Show specific error
            process.exit(1);
        }
    });

// Default action (when run without specific command like 'configure')
program.action(async () => {
    console.log(chalk.cyan(`Welcome to ${pkg.name} v${pkg.version}!`));

    // 1. Check Configuration
    if (!hasConfig()) {
        console.log(chalk.yellow('Configuration not found. Running setup wizard...'));
        await runConfigureWizard();
        if (!hasConfig()) {
            console.error(chalk.red('Configuration is required to proceed. Exiting.'));
            process.exit(1);
        }
        console.log(chalk.green('Configuration saved.')); // Feedback after wizard
    }
    // If config existed initially or was just created, continue...

    // 2. Check Database Setup
    try {
        console.log(chalk.blue('\nChecking database status...'));
        const setupStatus = await checkDatabaseSetup();

        if (!setupStatus.allExist) {
            console.log(chalk.yellow('\nDatabase setup is incomplete. Missing components:'));
            for (const item of setupStatus.missing) {
                console.log(chalk.yellow(`- ${item}`));
            }

            const { confirmSetup } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'confirmSetup',
                    message: 'May I attempt to create these missing components automatically?',
                    default: true
                }
            ]);

            if (confirmSetup) {
                console.log(chalk.blue('Attempting automatic database setup...'));
                const success = await executeSetupSql();
                if (!success) {
                    await printManualInstructions(); // Print instructions on failure
                    console.error(chalk.red('Automatic setup failed. Please run the SQL manually. Exiting.'));
                    process.exit(1);
                }
                console.log(chalk.green('Automatic setup completed successfully!'));
            } else {
                await printManualInstructions();
                console.log(chalk.yellow('Automatic setup cancelled. Please run the SQL manually. Exiting.'));
                process.exit(1);
            }
        }
        // If DB was already set up or was just set up successfully, continue...

        // 3. Start the main application logic (Chat Interface)
        console.log(chalk.green('\nConfiguration and database setup verified.'));
        await startChatLoop(); // Call the imported chat loop function

    } catch (error) {
        console.error(chalk.red('\n❌ An error occurred during startup:'));
        console.error(chalk.red(error.message)); // Show specific error
        console.log(chalk.yellow('Please check the error message, your network connection, and configuration.'));
        process.exit(1);
    }
});

/**
 * Helper function to retrieve and print the setup SQL for manual execution.
 * (Duplicated from setupDb.js for use in the main action)
 */
async function printManualInstructions() {
    console.log(chalk.yellow('\n👉 Please try running the following SQL commands manually in your Supabase SQL Editor:'));
    console.log(chalk.yellow(chalk.dim('----------------------------------------------------------------------')));
    try {
        const sqlContent = await getSetupSql();
        console.log(chalk.white(sqlContent));
    } catch (sqlError) {
        console.error(chalk.red('\n❌ Could not retrieve the setup SQL script:'));
        console.error(chalk.red(sqlError.message)); // Show specific error
        console.log(chalk.red('Please refer to the setup SQL commands in the project documentation or README.'));
    }
    console.log(chalk.yellow(chalk.dim('----------------------------------------------------------------------')));
}

// Parse arguments
program.parse(process.argv); 