// Path: packages/utils/src/add-path-comment.ts
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const getTrackedFiles = (): string[] => {
  const output = execSync('git ls-files', { encoding: 'utf-8' });
  return output.trim().split('\n');
};

const updateFilePath = (filePath: string) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const relativePath = path.relative(process.cwd(), filePath);

  const pathCommentRegex = /^\/\/\/?\s*(?:Path|File): (.+)$/;
  const match = lines[0].match(pathCommentRegex);

  if (match) {
    lines[0] = `// Path: ${relativePath}`;
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log(`Updated path comment in ${filePath}`);
  } else {
    lines.unshift(`// Path: ${relativePath}`);
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log(`Added path comment to ${filePath}`);
  }
};

const trackedFiles = getTrackedFiles();
trackedFiles.forEach((filePath) => {
  if (path.extname(filePath) === '.ts') {
    updateFilePath(filePath);
  }
});
