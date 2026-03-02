import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'settings.json');

function readFile(): Record<string, any> {
  try {
    if (fs.existsSync(FILE)) {
      return JSON.parse(fs.readFileSync(FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Failed to read settings file:', e);
  }
  return {};
}

function writeFile(data: Record<string, any>): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

export class SettingsStore {
  get(key?: string): any {
    const data = readFile();
    return key ? data[key] : data;
  }

  set(key: string, value: any): void {
    const data = readFile();
    data[key] = value;
    writeFile(data);
  }

  setAll(data: Record<string, any>): void {
    writeFile(data);
  }
}
