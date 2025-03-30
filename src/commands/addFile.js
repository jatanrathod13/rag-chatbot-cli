import fs from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';
import { addDocument } from '../supabaseService.js';
import { generateEmbedding } from '../openaiService.js';
import ora from 'ora';

/**
 * Handles adding a document from a local file path.
 * @param {string} filePath - The path to the local file.
 */
export async function runAddFileCommand(filePath) {
    // Start spinner immediately for feedback
    const spinner = ora(chalk.blue(`Processing file: ${filePath}...`)).start();
    let absolutePath;

    try {
        // 1. Resolve path and read file
        absolutePath = path.resolve(filePath);
        spinner.text = chalk.blue(`Reading file contents from: ${absolutePath}...`);

        let fileContent;
        try {
            await fs.access(absolutePath); // Check existence and read permissions
            fileContent = await fs.readFile(absolutePath, 'utf-8');
        } catch (readError) {
            spinner.fail(chalk.red('Failed to read file.')); // Stop spinner on read error
            if (readError.code === 'ENOENT') {
                console.error(chalk.red(`Error: File not found at path: ${absolutePath}`));
            } else if (readError.code === 'EACCES') {
                console.error(chalk.red(`Error: Permission denied to read file: ${absolutePath}`));
            } else {
                console.error(chalk.red(`Error reading file ${absolutePath}: ${readError.message}`));
            }
            return; // Exit the command function on read error
        }
        spinner.succeed(chalk.green(`Successfully read file: ${absolutePath}`));

        // 2. Extract document name
        const documentName = path.basename(absolutePath);

        // 3. Add document using the service (spinner handled mostly inside)
        // Spinner will be updated by addDocument
        await addDocument(documentName, fileContent, generateEmbedding);
        
        // Success message is handled within addDocument's spinner.succeed
        // If addDocument throws, it will be caught below.

    } catch (error) {
        // Catch errors from addDocument or any unexpected issues
        // Spinner should have been failed by the service function if it errored during its process
        // If the error happened *before* calling addDocument (e.g., path resolution), fail it here.
        if (spinner.isSpinning) {
            spinner.fail(chalk.red('An error occurred.'));
        }
        console.error(chalk.red(`\n❌ Failed to add document from file "${filePath}":`));
        console.error(chalk.red(error.message)); // Display the specific error message
        // Add specific advice if known?
        if (error.message.includes('embedding')) {
             console.log(chalk.yellow('This might be due to an issue with the OpenAI API key or service.'));
        }
        if (error.message.includes('insert document sections') || error.message.includes('insert document metadata')) {
             console.log(chalk.yellow('This might indicate an issue connecting to or writing to the Supabase database.'));
        }
    }
} 