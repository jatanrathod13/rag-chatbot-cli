import inquirer from 'inquirer';
import chalk from 'chalk';
import boxen from 'boxen';
import ora from 'ora';

// Import RAG core functions
import {
    generateEmbedding,
    generateResponse
} from './openaiService.js';
import {
    addDocument,
    searchDocumentSections,
    getDocumentDetails
} from './supabaseService.js';

// --- Helper Functions ---

/**
 * Processes a user query using the RAG pipeline.
 * @param {string} query - The user's query.
 * @returns {Promise<string>} The AI-generated response.
 */
async function processQuery(query) {
    const spinner = ora({ text: chalk.blue('Processing your query...'), spinner: 'dots' }).start();
    try {
        // 1. Generate embedding
        spinner.text = chalk.blue('Generating query embedding...');
        const queryEmbedding = await generateEmbedding(query);

        // 2. Search documents
        spinner.text = chalk.blue('Searching relevant documents...');
        const relevantSections = await searchDocumentSections(queryEmbedding);

        // 3. Generate Response (passing getDocumentDetails as the callback)
        spinner.text = chalk.blue('Generating response...');
        const response = await generateResponse(query, relevantSections, getDocumentDetails);

        spinner.succeed(chalk.green('Processed query successfully!'));
        return response;

    } catch (error) {
        spinner.fail(chalk.red('Error processing query:'));
        console.error(error.message || error);
        return chalk.red('Sorry, I encountered an error. Please try again.');
    }
}

/**
 * Handles the interactive process of adding a new document.
 */
async function handleAddDocument() {
    try {
        const { name } = await inquirer.prompt([
            {
                type: 'input',
                name: 'name',
                message: 'Enter a name for the new document:',
                validate: input => input.trim() !== '' ? true : 'Document name cannot be empty.'
            }
        ]);

        const { content } = await inquirer.prompt([
            {
                type: 'editor',
                name: 'content',
                message: 'Enter the document content (press Enter, then Ctrl+D or Esc when done):',
                validate: input => input.trim() !== '' ? true : 'Document content cannot be empty.',
                waitForUserInput: true // Keep editor open until user explicitly finishes
            }
        ]);

        // Call supabaseService.addDocument, passing the generateEmbedding function from openaiService
        await addDocument(name, content, generateEmbedding);
        // addDocument already provides spinner feedback

    } catch (error) {
        // Catch errors from inquirer prompts or the addDocument service call
        console.error(chalk.red('\n❌ Error during interactive document addition:'));
        console.error(chalk.red(error.message)); // Display the specific error

        // Add specific advice if known?
        if (error.message.includes('embedding')) {
             console.log(chalk.yellow('This might be due to an issue with the OpenAI API key or service.'));
        }
        if (error.message.includes('insert document sections') || error.message.includes('insert document metadata')) {
             console.log(chalk.yellow('This might indicate an issue connecting to or writing to the Supabase database.'));
        }
         if (error.isTtyError || error.message.includes('canceled')) {
             console.log(chalk.yellow('Document addition cancelled.'));
         }
    }
}

// --- Main Chat Loop ---

/**
 * Starts the main interactive chat interface.
 */
export async function startChatLoop() {
    console.log(boxen(chalk.bold.cyan('RAG Chatbot Ready!'), {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan'
    }));

    console.log(chalk.yellow('Commands:'));
    console.log(`${chalk.green('•')} Ask any question to get an AI response.`);
    console.log(`${chalk.green('•')} Type ${chalk.bold.white('add')} to add a new document.`);
    console.log(`${chalk.green('•')} Type ${chalk.bold.white('exit')} or press ${chalk.bold.white('Ctrl+C')} to quit.`);

    let exitRequested = false;
    while (!exitRequested) {
        try {
            const { input } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'input',
                    message: chalk.green('You:'),
                    prefix: '🧠',
                }
            ]);

            const command = input.trim().toLowerCase();

            if (command === 'exit') {
                exitRequested = true;
                continue;
            }

            if (command === 'add') {
                await handleAddDocument();
                continue;
            }

            // Process as a query
            const response = await processQuery(input);

            console.log(boxen(chalk.cyan(response), {
                padding: 1,
                margin: { top: 1, bottom: 1 },
                borderStyle: 'round',
                borderColor: 'blue',
                title: '🤖 AI',
                titleAlignment: 'left'
            }));

        } catch (error) {
            // Handle potential errors from inquirer prompt itself (e.g., Ctrl+C)
            if (error.isTtyError) {
                console.log(chalk.yellow('\nPrompt failed. Exiting...'));
                exitRequested = true;
            } else if (error.message.includes('canceled')) { // Handle Ctrl+C during prompt
                 console.log(chalk.yellow('\nOperation cancelled. Exiting...'));
                 exitRequested = true;
            } else {
                console.error(chalk.red('\nAn unexpected error occurred in the chat loop:'), error);
                // Decide whether to exit or continue
                // exitRequested = true; 
            }
        }
    }

    console.log(chalk.yellow('\nThank you for using RAG Chatbot! Goodbye! 👋'));
    // process.exit(0); // Let the main cli script handle exit
} 