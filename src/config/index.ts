import { config } from 'dotenv';

export class ConfigService {
  private static _instance: ConfigService;

  constructor() {
    config({ path: '.env' });
    for (const envName of Object.keys(process.env)) {
      process.env[envName] = process.env[envName].replace(/\\n/g, '\n');
    }
  }

  static getInstance() {
    if (this._instance) return this._instance;
    this._instance = new ConfigService();
    Object.freeze(this._instance);
    return this._instance;
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get nodeEnv(): string {
    return this.get('NODE_ENV') || 'development';
  }

  public get(key: string): string {
    return process.env[key];
  }

  public getNumber(key: string): number {
    return Number(this.get(key));
  }
}
