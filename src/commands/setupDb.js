import inquirer from 'inquirer';
import chalk from 'chalk';
import {
    checkDatabaseSetup,
    executeSetupSql,
    getSetupSql
} from '../supabaseService.js';

/**
 * Runs the database setup check and potentially executes the setup script.
 * Handles user prompts for confirmation and provides manual instructions on failure.
 */
export async function runSetupDbCommand() {
    console.log(chalk.cyan('Running database setup check...'));

    try {
        const setupStatus = await checkDatabaseSetup();

        if (setupStatus.allExist) {
            console.log(chalk.green('Database is already correctly set up. No action needed.'));
            return;
        }

        console.log(chalk.yellow('The following required database components are missing:'));
        for (const item of setupStatus.missing) {
            console.log(chalk.yellow(`- ${item}`));
        }

        const { confirmSetup } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirmSetup',
                message: 'May I attempt to create these missing components in your Supabase project?',
                default: true
            }
        ]);

        if (confirmSetup) {
            console.log(chalk.blue('Attempting automatic database setup...'));
            const success = await executeSetupSql();

            if (success) {
                console.log(chalk.green('Automatic setup completed successfully!'));
                
                // Double-check to verify the setup worked
                const verificationStatus = await checkDatabaseSetup();
                if (!verificationStatus.allExist) {
                    console.log(chalk.yellow('Setup reported success but some components are still missing.'));
                    console.log(chalk.yellow('This might be due to permission limitations or pending propagation.'));
                    console.log(chalk.yellow('Please try again in a moment or set up the database manually.'));
                    
                    // Ask if they would like to run setup again
                    const { retry } = await inquirer.prompt([
                        {
                            type: 'confirm',
                            name: 'retry',
                            message: 'Would you like to refresh the database status and try again?',
                            default: true
                        }
                    ]);
                    
                    if (retry) {
                        console.log(chalk.blue('Refreshing database status...'));
                        // Recursive call to try again
                        await runSetupDbCommand();
                        return;
                    }
                }
            } else {
                console.log(chalk.red('Automatic setup reported failure.'));
                console.log(chalk.yellow('This is often because the anon key cannot execute SQL statements directly.'));
                
                // Ask if they want to verify manual execution
                const { manuallySet } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'manuallySet',
                        message: 'Have you manually executed the SQL in the Supabase SQL Editor as instructed?',
                        default: false
                    }
                ]);
                
                if (manuallySet) {
                    console.log(chalk.blue('Checking if manual setup was successful...'));
                    // Re-check if the manual setup worked
                    const manualStatus = await checkDatabaseSetup();
                    if (manualStatus.allExist) {
                        console.log(chalk.green('Database setup is now complete! Thank you for the manual setup.'));
                        return;
                    } else {
                        console.log(chalk.yellow('Some components are still missing after manual setup:'));
                        for (const item of manualStatus.missing) {
                            console.log(chalk.yellow(`- ${item}`));
                        }
                        
                        await printManualInstructions();
                    }
                } else {
                    await printManualInstructions();
                }
            }
        } else {
            console.log(chalk.yellow('Automatic setup cancelled.'));
            await printManualInstructions();
        }

    } catch (error) {
        // Catch errors from checkDatabaseSetup or executeSetupSql or inquirer
        console.error(chalk.red('\n❌ An error occurred during the database setup process:'));
        console.error(chalk.red(error.message)); // Display the specific error message from the service
        // Provide guidance based on common errors
        if (error.message.includes('permission') || (error.message.includes('SQL Execution Error') && error.message.includes('42501'))) { // 42501 is insufficient_privilege
            console.log(chalk.yellow('This might be due to insufficient database permissions for the provided Supabase key.'));
        }
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            console.log(chalk.yellow('Please check your network connection and Supabase credentials.'));
        }
        await printManualInstructions(); // Still offer manual instructions
    }
}

/**
 * Helper function to retrieve and print the setup SQL for manual execution.
 */
async function printManualInstructions() {
    console.log(chalk.yellow('\n👉 Please try running the following SQL commands manually in your Supabase SQL Editor:'));
    console.log(chalk.yellow(chalk.dim('----------------------------------------------------------------------')));
    try {
        const sqlContent = await getSetupSql();
        console.log(chalk.white(sqlContent));
    } catch (sqlError) {
        console.error(chalk.red('\n❌ Could not retrieve the setup SQL script:'));
        console.error(chalk.red(sqlError.message)); // Display specific error
        console.log(chalk.red('Please refer to the setup SQL commands in the project documentation or README.'));
    }
    console.log(chalk.yellow(chalk.dim('----------------------------------------------------------------------')));
    
    console.log(chalk.cyan('\n📋 INSTRUCTIONS:'));
    console.log(chalk.cyan('1. Go to your Supabase dashboard: https://app.supabase.io'));
    console.log(chalk.cyan('2. Navigate to your project'));
    console.log(chalk.cyan('3. Go to "SQL Editor" in the left sidebar'));
    console.log(chalk.cyan('4. Create a "New Query"'));
    console.log(chalk.cyan('5. Paste the SQL above and run it'));
    console.log(chalk.cyan('6. After running the SQL, come back and run `ragchat setup-db` again to verify the setup'));
}

// // Example usage (if you want to run this file directly for testing)
// if (import.meta.url.startsWith('file:') && process.argv[1] === new URL(import.meta.url).pathname) {
//     runSetupDbCommand();
// } 