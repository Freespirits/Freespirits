import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outputPath = path.join(rootDir, 'dist', 'summary.txt');

async function main() {
  console.log(chalk.cyan('\n👀  Previewing build output...\n'));

  let contents;
  try {
    contents = await readFile(outputPath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(chalk.red('No build artifacts found. Have you run "npm run build"?'));
      process.exitCode = 1;
      return;
    }

    throw error;
  }

  console.log(chalk.white(contents));
  console.log(chalk.green('\n✅  Preview complete.\n'));
}

main().catch(error => {
  console.error(chalk.red('\n❌  Preview failed.'));
  console.error(error);
  process.exitCode = 1;
});
