import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const appInfoPath = path.join(rootDir, 'src', 'app-info.json');
const distDir = path.join(rootDir, 'dist');
const outputPath = path.join(distDir, 'summary.txt');

async function main() {
  console.log(chalk.cyan('\n🏗️  Building Freespirits workflow summary...'));

  const rawData = await readFile(appInfoPath, 'utf8');
  const appInfo = JSON.parse(rawData);

  await mkdir(distDir, { recursive: true });

  const lines = [
    `${appInfo.name} (v${appInfo.version})`,
    appInfo.description,
    '',
    'Workflow steps:',
    ...appInfo.steps.map((step, index) => `${index + 1}. ${step.title} [${step.id}]\n${step.details}`),
    '',
    `Generated: ${new Date().toISOString()}`
  ];

  await writeFile(outputPath, lines.join('\n'), 'utf8');

  console.log(chalk.green(`\n✅  Summary written to ${path.relative(rootDir, outputPath)}\n`));
}

main().catch(error => {
  console.error(chalk.red('\n❌  Build failed.'));
  console.error(error);
  process.exitCode = 1;
});
