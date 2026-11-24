import fs from 'fs';
import path from 'path';
import { loadYaml } from '@netcracker/qubership-apihub-api-unifier'

export const v1 = loadYaml(fs.readFileSync(path.join(__dirname, '../resources/openapi/v1.yml'), 'utf8')));
export const v2 = loadYaml(fs.readFileSync(path.join(__dirname, '../resources/openapi/v2.yml'), 'utf8')));
export const diff = JSON.parse(fs.readFileSync(path.join(__dirname, '../resources/openapi/v1v2diff.json'), 'utf8'));
