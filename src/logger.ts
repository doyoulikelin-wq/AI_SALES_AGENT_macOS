export type LogLevel = "debug" | "info" | "warn" | "error";

const rank: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

export class Logger {
  constructor(private readonly level: LogLevel = "info") {}

  debug(message: string, meta?: Record<string, unknown>): void {
    this.write("debug", message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.write("info", message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.write("warn", message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.write("error", message, meta);
  }

  private write(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (rank[level] < rank[this.level]) return;
    const line = {
      ts: new Date().toISOString(),
      level,
      message,
      ...(meta ? { meta } : {})
    };
    const output = JSON.stringify(line);
    if (level === "error") {
      console.error(output);
    } else {
      console.log(output);
    }
  }
}
