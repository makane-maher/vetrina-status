import Router from 'express';
import hbs from "hbs";
import axios from "axios";
import { fileURLToPath } from 'url';
import * as path from "path";
import * as cron from 'node-cron';
import * as dotenv from "dotenv";

dotenv.config();

const BOT_STATUS_API = process.env.BOT_STATUS_API;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const CRON_INTERVAL = process.env.CRON_INTERVAL ?? '*/30 * * * *';
const MENTION = process.env.MENTION ?? '';
const BOT_NAME = process.env.BOT_NAME ?? 'Bot';

if (!BOT_STATUS_API) {
    throw new Error('No Bot API URL defined in .env file.');
}

if (!WEBHOOK_URL) {
    throw new Error('No webhook URL defined in .env file.');
}

const log = console.log;
const error = console.error;
const warn = console.warn;

console.log = function (...args) {
    log.call(console, `\x1b[36m[LOG]  | ${new Date().toISOString()} |`, ...args);
}
console.warn = function (...args) {
    warn.call(console, `\x1b[33m[WARN] | ${new Date().toISOString()} |`, ...args);
}
console.error = function (...args) {
    error.call(console, `\x1b[31m[ERR]  | ${new Date().toISOString()} |`, ...args);
}

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

router.set('view engine', 'hbs')
router.set('views', path.join(__dirname, 'views'));

hbs.registerHelper('equals', (value1, value2, options) => {
    return value1 == value2 ? options.fn(this) : options.inverse(this);
});

var isActive = true;

function sendMessageViaWebhook({title, description, color, mention }) {
    const time = new Date();

    axios.post(WEBHOOK_URL, {
        avatar_url: process.env.AVATAR_URL,
        username: `${BOT_NAME} Status`,
        content: mention ? MENTION ? `<@${MENTION}>` : '' : '',
        embeds: [
            {
                title,
                description,
                color,
                fields: [
                    { name: 'Report Time', value: `<t:${Math.floor(+time/1000)}:R>` },
                ],
            }
        ],
    }).catch((e) => {
        console.error('Could not send Discord message.');
    });
}

cron.schedule(CRON_INTERVAL, () => {
    axios.get(BOT_STATUS_API).then((res) => {
        if (!isActive) {
            sendMessageViaWebhook({
                title: 'All Systems Green',
                description: `${BOT_NAME} operation is back to normal.`,
                color: 1170739,
                mention: false,
            });
        }
        isActive = true;
    }).catch((reason) => {
        if (!isActive) {
            return;
        }

        isActive = false;

        sendMessageViaWebhook({
            title: 'Down Alert!',
            description: `A problem has been detected with **${BOT_NAME}**.`,
            color: 16711680,
            mention: true,
        });
    });
});

router.use((req, res, next) => {
    console.log(`| ${new Date().toISOString()} | ${req.method} | ${req.hostname} | ${req.baseUrl}${req.path}`);
    return next();
});

const StatusCode = {
    OKAY: 'okay',
    ERROR: 'error'
};

router.get('/status', (req, res) => {
    axios.get(BOT_STATUS_API).then(data => {
        return res.render('status.hbs', {
            botName: BOT_NAME,
            message: 'Gud!',
            statusCode: StatusCode.OKAY,
        });
    }).catch(err => {
        return res.render('status.hbs', {
            botName: BOT_NAME,
            message: 'Bad!',
            statusCode: StatusCode.ERROR,
        });
    });

});

const port = process.env.PORT ?? 3000;

router.listen(port, () => {
    console.log(`Health check server running on port ${port}.`);
});