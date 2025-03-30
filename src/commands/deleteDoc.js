import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { findDocumentByNameOrId, deleteDocumentById, getDocumentDetails } from '../supabaseService.js';

/**
 * Handles deleting a document identified by ID or name using service functions.
 * @param {string | number} identifier - The ID or name of the document to delete.
 */
export async function runDeleteDocCommand(identifier) {
    let documentId;
    let documentName;

    try {
        console.log(chalk.blue(`Finding document matching "${identifier}"...`));
        documentId = await findDocumentByNameOrId(identifier);
        
        try {
            const details = await getDocumentDetails(documentId);
            documentName = details.name;
        } catch (detailsError) {
            console.warn(chalk.yellow(`\nWarning: Could not fetch document name for ID ${documentId}. Proceeding with deletion confirmation.`));
            documentName = `ID: ${documentId}`;
        }

        console.log(chalk.green(`Found document: "${documentName}" (ID: ${documentId})`));

        const { confirmDelete } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirmDelete',
                message: `Are you sure you want to delete document "${chalk.yellow(documentName)}" (ID: ${documentId})? This will also delete all its sections.`,
                default: false
            }
        ]);

        if (!confirmDelete) {
            console.log(chalk.yellow('Deletion cancelled.'));
            return;
        }

        await deleteDocumentById(documentId);

    } catch (error) {
        console.error(chalk.red(`\n❌ Error during deletion process for "${identifier}":`));
        console.error(chalk.red(error.message));
        
        if (error.message.includes('Multiple documents found')) {
            console.log(chalk.yellow('Please be more specific or use the document ID.'));
        }
        if (error.message.includes('not found')) {
             console.log(chalk.yellow('Use the `list` command to see available documents and their IDs.'));
        }
        if (error.message.includes('Failed to delete')) {
             console.log(chalk.yellow('Please check database permissions or connection status.'));
        }
    }
} 