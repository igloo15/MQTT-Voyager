"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsStore = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const DATA_DIR = process.env.DATA_DIR || path_1.default.join(process.cwd(), 'data');
const FILE = path_1.default.join(DATA_DIR, 'settings.json');
function readFile() {
    try {
        if (fs_1.default.existsSync(FILE)) {
            return JSON.parse(fs_1.default.readFileSync(FILE, 'utf8'));
        }
    }
    catch (e) {
        console.error('Failed to read settings file:', e);
    }
    return {};
}
function writeFile(data) {
    fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
    fs_1.default.writeFileSync(FILE, JSON.stringify(data, null, 2));
}
class SettingsStore {
    get(key) {
        const data = readFile();
        return key ? data[key] : data;
    }
    set(key, value) {
        const data = readFile();
        data[key] = value;
        writeFile(data);
    }
    setAll(data) {
        writeFile(data);
    }
}
exports.SettingsStore = SettingsStore;
//# sourceMappingURL=SettingsStore.js.map