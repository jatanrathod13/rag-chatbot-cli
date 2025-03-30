import Table from 'cli-table3';
import chalk from 'chalk';
import ora from 'ora';
import { listDocuments } from '../supabaseService.js';

/**
 * Fetches and displays a list of documents using the supabaseService.
 */
export async function runListDocsCommand() {
    try {
        console.log(chalk.blue('Fetching document list...')); // Simple message instead of spinner
        const documents = await listDocuments(); // Call the service function

        if (!documents || documents.length === 0) {
            console.log(chalk.yellow('\nNo documents found in the database.'));
            console.log(chalk.cyan('You can add documents using the `add <file_path>` command or the interactive `add` command within the chat.'));
            return;
        }

        console.log(chalk.green('\nAvailable Documents:'));
        const table = new Table({
            head: [chalk.cyan('ID'), chalk.cyan('Name'), chalk.cyan('Created At')],
            colWidths: [10, 40, 30] 
        });

        for (const doc of documents) {
            table.push([
                doc.id,
                doc.name,
                // Format date with better error handling
                formatDate(doc.created_at)
            ]);
        }

        console.log(table.toString());

    } catch (error) {
        console.error(chalk.red('\n❌ Error listing documents:'));
        console.error(chalk.red(error.message));
        console.log(chalk.yellow('Please check your network connection and Supabase configuration.'));
    }
}

/**
 * Helper function to format dates safely
 * @param {string|null} dateString - The date string to format
 * @returns {string} Formatted date or placeholder
 * 
 * Note: This function was added to fix the "Invalid Date" issue in the document listing.
 * The issue was caused by:
 * 1. Not requesting the created_at field in the SQL query
 * 2. Not handling potential invalid or null date values properly
 * 
 * The solution includes both requesting the field from the database and
 * providing robust error handling when formatting the date.
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        // Check if date is valid
        if (Number.isNaN(date.getTime())) return 'N/A';
        return date.toLocaleString();
    } catch (error) {
        return 'N/A';
    }
} 