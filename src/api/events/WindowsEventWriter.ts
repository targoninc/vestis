import winston from 'winston';
import SyslogTransport from 'winston-syslog';
import {EventWriter} from "./EventWriter";

// Define your application name and Windows Event Log settings
const APP_NAME = 'Vestis';
const LOG_HOST = 'localhost';
const LOG_PORT = 514; // Standard syslog port

// Create a Winston logger with Syslog transport configured for Windows
const log = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    defaultMeta: { service: APP_NAME },
    transports: [
        // Console transport for development
        new winston.transports.Console({
            format: winston.format.simple(),
        }),
        // Syslog transport configured for Windows Event Log
        new SyslogTransport.Syslog({
            host: LOG_HOST,
            port: LOG_PORT,
            protocol: 'udp4',
            facility: "local0",
            localhost: process.env.COMPUTERNAME || 'localhost',
            type: 'RFC5424',
            app_name: APP_NAME,
        }),
    ],
});

export class WindowsEventWriter extends EventWriter {
    static info(message: string, data: any): void {
        log.info(message);
    }

    static error(message: string, data: any): void {
        log.error(message);
    }

    static warn(message: string, data: any): void {
        log.warn(message);
    }
}