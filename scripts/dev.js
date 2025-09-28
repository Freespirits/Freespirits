import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const appInfoPath = path.join(rootDir, 'src', 'app-info.json');

async function main() {
  console.log(chalk.cyan('\n🔧  Freespirits development readiness check'));

  const rawData = await readFile(appInfoPath, 'utf8');
  const appInfo = JSON.parse(rawData);

  console.log(chalk.white(`\nProject: ${chalk.bold(appInfo.name)}`));
  console.log(chalk.white(`Version: ${chalk.bold(appInfo.version)}`));
  console.log(chalk.white(`Maintainer: ${chalk.bold(appInfo.maintainer)}`));
  console.log(chalk.gray(`\n${appInfo.description}\n`));

  console.log(chalk.magenta('Configured workflow steps:'));
  for (const [index, step] of appInfo.steps.entries()) {
    const counter = chalk.yellow(String(index + 1).padStart(2, '0'));
    console.log(`${counter}. ${chalk.bold(step.title)} — ${step.details}`);
  }

  console.log(chalk.green('\n✨  Configuration looks good. You can run "npm run build" next.\n'));
}

main().catch(error => {
  console.error(chalk.red('\n❌  Development check failed.'));
  console.error(error);
  process.exitCode = 1;
});
