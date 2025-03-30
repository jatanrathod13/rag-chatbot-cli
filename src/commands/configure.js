import inquirer from 'inquirer';
import { saveConfig, getConfig } from '../config.js';
import chalk from 'chalk';

/**
 * Runs the interactive configuration wizard.
 * Prompts the user for Supabase and OpenAI credentials and saves them.
 */
export async function runConfigureWizard() {
    console.log(chalk.cyan('Welcome to the RAG Chatbot CLI setup wizard!'));
    console.log('Please provide your Supabase and OpenAI credentials.');

    const currentConfig = getConfig();

    const questions = [
        {
            type: 'input',
            name: 'supabaseUrl',
            message: 'Enter your Supabase Project URL:',
            default: currentConfig.supabaseUrl,
            validate: (input) => {
                if (!input) return 'Supabase URL cannot be empty.';
                // Basic check for URL format
                try {
                    new URL(input);
                    return true;
                } catch (error) {
                    return 'Please enter a valid URL (e.g., https://<your-project-ref>.supabase.co)';
                }
            }
        },
        {
            type: 'password', // Use password type for keys
            name: 'supabaseKey',
            mask: '*',
            message: `Enter your Supabase Anon Key (${chalk.yellow('Use the public anon key, NOT the service_role key')}):`,
            default: currentConfig.supabaseKey, // Be cautious pre-filling sensitive keys
            validate: (input) => input ? true : 'Supabase Key cannot be empty.'
        },
        {
            type: 'password',
            name: 'openaiApiKey',
            mask: '*',
            message: 'Enter your OpenAI API Key:',
            default: currentConfig.openaiApiKey,
            validate: (input) => input ? true : 'OpenAI API Key cannot be empty.'
        }
    ];

    try {
        const answers = await inquirer.prompt(questions);
        saveConfig(answers);
        console.log(chalk.green('\nConfiguration saved successfully!'));
    } catch (error) {
        console.error(chalk.red('\nError during configuration:'), error);
        console.log(chalk.yellow('Configuration was not saved.'));
    }
}

// // Example usage (if you want to run this file directly for testing)
// if (import.meta.url.startsWith('file:') && process.argv[1] === new URL(import.meta.url).pathname) {
//     runConfigureWizard();
// } 