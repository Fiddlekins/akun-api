import {swcDir} from '@swc/cli';
import {exec} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

async function copyFiles(source, dest, ignoreRegex) {
    const files = await fs.readdir(source, {withFileTypes: true});
    await Promise.all(files.map(async (file) => {
        if (file.isDirectory()) {
            await fs.mkdir(path.join(dest, file.name));
            await copyFiles(path.join(source, file.name), path.join(dest, file.name), ignoreRegex);
        } else {
            if (!ignoreRegex || !ignoreRegex.test(file.name)) {
                await fs.copyFile(path.join(source, file.name), path.join(dest, file.name));
            }
        }
    }));
}

async function copyDirectory(source, dest, ignoreRegex) {
    const srcDirName = path.basename(source);
    const newDirPath = path.join(dest, srcDirName);
    await fs.mkdir(newDirPath);
    await copyFiles(source, newDirPath, ignoreRegex);
}

async function createStageTsconfig(source, dest) {
    const config = JSON.parse(await fs.readFile(source, 'utf8'));
    const stageConfig = {
        ...config,
        compilerOptions: {
            ...config.compilerOptions,
            'outDir': `../${config.compilerOptions.outDir}`,
            'allowImportingTsExtensions': false,
        },
        'include': ['./**/*.ts'],
    };
    await fs.writeFile(dest, JSON.stringify(stageConfig, null, 2), 'utf8');
    return stageConfig;
}

async function rewriteImportExtensions(source) {
    const files = await fs.readdir(source, {withFileTypes: true});
    await Promise.all(files.map(async (file) => {
        if (file.isDirectory()) {
            await rewriteImportExtensions(path.join(source, file.name));
        } else {
            if (/\.(js|jsx|ts|tsx)$/.test(file.name)) {
                const filePath = path.join(source, file.name);
                let text = await fs.readFile(filePath, 'utf8');
                text = text
                    .split(/\n/)
                    .map((line) => {
                        const match = line.match(/^(.+)\.ts(x?)(['"];\r?)$/);
                        if (match) {
                            const [, start, jsx, end] = match;
                            return `${start}.js${jsx}${end}`;
                        } else {
                            return line;
                        }
                    })
                    .join('\n');
                await fs.writeFile(filePath, text, 'utf8');
            }
        }
    }));
}

function runTsc(config) {
    return new Promise((resolve, reject) => {
        exec(`.\\node_modules\\.bin\\tsc -p ${config}`, (err, stdout, stderr) => {
            if (err) {
                reject(stdout + '\n' + stderr);
            } else {
                resolve(stdout);
            }
        });
    })
}

async function runSwc() {
    const swcOptions = {
        jsc: {
            target: 'esnext',
            externalHelpers: false,
        },
        module: {
            type: 'es6',
        },
        sourceMaps: true,
    };
    await swcDir({
        cliOptions: {
            outDir: './dist',
            filenames: ['./src/'],
            extensions: ['.ts'],
            stripLeadingPaths: true,
        },
        swcOptions,
    });
}

async function restoreImportExtensions(source, extension) {
    const files = await fs.readdir(source, {withFileTypes: true});
    await Promise.all(files.map(async (file) => {
        if (file.isDirectory()) {
            await restoreImportExtensions(path.join(source, file.name), extension);
        } else {
            if (/\.(js|jsx|ts|tsx)$/.test(file.name)) {
                const filePath = path.join(source, file.name);
                let text = await fs.readFile(filePath, 'utf8');
                text = text
                    .split(/\n/)
                    .map((line) => {
                        const match = line.match(/(.+from "\..+)\.[jt]s(x?)(['"];)$/);
                        if (match) {
                            const [, start, jsx, end] = match;
                            return `${start}.${extension}${end}`;
                        } else {
                            return line;
                        }
                    })
                    .join('\n');
                await fs.writeFile(filePath, text, 'utf8');
            }
        }
    }));
}

async function buildTsc() {
    let currentTime = Date.now();

    // Clear dist
    await fs.rm('./dist', {recursive: true, force: true});
    await fs.mkdir('./dist');
    console.log(`Clearing dist took ${Date.now() - currentTime}ms`);
    currentTime = Date.now();

    // Clear staging area
    await fs.rm('./stage', {recursive: true, force: true});
    console.log(`Clearing stage took ${Date.now() - currentTime}ms`);
    currentTime = Date.now();

    // Create staging area
    await fs.mkdir('./stage');
    await fs.mkdir('./stage/src');
    await copyFiles('./src/', './stage/src');
    await createStageTsconfig('./tsconfig.json', './stage/tsconfig.json');
    console.log(`Creating stage took ${Date.now() - currentTime}ms`);
    currentTime = Date.now();

    // Fix imports
    await rewriteImportExtensions('./stage/src');
    console.log(`Rewriting stage imports took ${Date.now() - currentTime}ms`);
    currentTime = Date.now();

    // Running tsc
    await runTsc('./stage/tsconfig.json');
    console.log(`Running tsc took ${Date.now() - currentTime}ms`);
    currentTime = Date.now();

    // Clear staging area
    await fs.rm('./stage', {recursive: true, force: true});
    console.log(`Clearing stage took ${Date.now() - currentTime}ms`);
    currentTime = Date.now();

    // Fix imports
    // await restoreImportExtensions('./dist', 'js');
}

async function buildSwc() {
    let currentTime = Date.now();

    try {
        // Running swc
        await runSwc();
        console.log(`Running swc took ${Date.now() - currentTime}ms`);
        currentTime = Date.now();
    } catch (err) {
        console.error(err);
        // rewrite imports regardless of success
    }

    // Fix imports
    await restoreImportExtensions('./dist', 'js');
    console.log(`Rewriting dist imports took ${Date.now() - currentTime}ms`);
    currentTime = Date.now();
}

async function main() {
    // await buildTsc();
    await buildSwc();
}

main().catch(console.error);
