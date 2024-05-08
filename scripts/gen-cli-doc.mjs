import { readFile, readdir, writeFile } from 'fs/promises';
import { join } from 'desm';
import path from 'path';

let out = `---
# ATTENTION: This file is automatically generated through script/gen-cli-doc.mjs, do not change it manually!

toc_max_heading_level: 4
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Platformatic CLI

## Installation and usage

Install the Platformatic CLI as a dependency for your project:

<Tabs groupId="package-manager">
<TabItem value="npm" label="npm">

\`\`\`bash
npm install platformatic
\`\`\`

</TabItem>
<TabItem value="yarn" label="Yarn">

\`\`\`bash
yarn add platformatic
\`\`\`

</TabItem>
<TabItem value="pnpm" label="pnpm">

\`\`\`bash
pnpm add platformatic
\`\`\`

</TabItem>
</Tabs>

Once it's installed, you can run it with:

<Tabs groupId="package-manager">
<TabItem value="npm" label="npm">

\`\`\`bash
npx platformatic
\`\`\`

</TabItem>
<TabItem value="yarn" label="Yarn">

\`\`\`bash
yarn platformatic
\`\`\`

</TabItem>
<TabItem value="pnpm" label="pnpm">

\`\`\`bash
pnpm platformatic
\`\`\`

</TabItem>
</Tabs>

:::info

The \`platformatic\` package can be installed globally, but installing it as a
project dependency ensures that everyone working on the project is using the
same version of the Platformatic CLI.

:::

## Commands

### help

`;

// Command: help

const cliHelpDir = join(import.meta.url, '../packages/cli/help')
const cliHelp = path.join(cliHelpDir, 'help.txt')
const cliHelps = await readdir(cliHelpDir)
const mainCliHelp = await readFile(cliHelp, 'utf8')

out += `
${mainCliHelp.trim()}
`;

for (const helpFile of cliHelps) {
    if (helpFile === 'help.txt') continue;

    const helpPath = path.join(cliHelpDir, helpFile);
    const content = await readFile(helpPath, 'utf8');
    out += `
#### ${helpFile.replace('.txt', '')}

${content}
`;
}

// Process each command in a similar fashion for client, composer, db, service, frontend, runtime, ctl

const commands = [
    { command: 'client', dir: '../packages/client-cli/help' },
    { command: 'composer', dir: '../packages/composer/help' },
    { command: 'db', dir: '../packages/db/help' },
    { command: 'service', dir: '../packages/service/help' },
    { command: 'frontend', dir: '../packages/frontend-template/help' },
    { command: 'runtime', dir: '../packages/runtime/help' },
    { command: 'ctl', dir: '../packages/control/help' }
];

for (const { command, dir } of commands) {
    const commandDir = join(import.meta.url, dir);
    const commandFiles = await readdir(commandDir);

    out += `
### ${command}

\`\`\`bash
platformatic ${command} <command>
\`\`\`

`;

    for (const file of commandFiles) {
        const filePath = path.join(commandDir, file);
        const commandContent = await readFile(filePath, 'utf8');
        out += `
#### ${file.replace('.txt', '')}

${commandContent}
`;
    }
}

await writeFile(join(import.meta.url, '..', 'docs', 'cli.md'), out);
