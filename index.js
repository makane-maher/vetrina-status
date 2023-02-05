import Router from 'express';
import hbs from "hbs";
import axios from "axios";
import { fileURLToPath } from 'url';
import * as path from "path";
import * as cron from 'node-cron';
import * as dotenv from "dotenv";

dotenv.config();

const VETRINA_BOT_API = process.env.VETRINA_BOT_API;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const CRON_INTERVAL = process.env.CRON_INTERVAL;
const MAHER = process.env.MAHER;

if (!VETRINA_BOT_API) {
    throw new Error('No Vetrina Bot API URL defined in .env file.');
}

if (!WEBHOOK_URL) {
    throw new Error('No webhook URL defined in .env file.');
}

if (!CRON_INTERVAL) {
    throw new Error('No Cron interval defined in .env file.');
}

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

router.set('view engine', 'hbs')
router.set('views', path.join(__dirname, 'views'));

hbs.registerHelper('equals', (value1, value2, options) => {
    return value1 == value2 ? options.fn(this) : options.inverse(this);
});

var isActive = true;

cron.schedule(CRON_INTERVAL, () => {
    axios.get(VETRINA_BOT_API).then((res) => {
        if (!isActive) {
            const time = new Date();

            axios.post(WEBHOOK_URL, {
                avatar_url: process.env.AVATAR_URL,
                username: 'Vetrina Status',
                content: '<@1044221313574764584>',
                embeds: [
                    {
                        title: 'All Systems Green',
                        description: 'Bot operation is back to normal.',
                        color: 1170739,
                        fields: [
                            { name: 'Report Time', value: `<t:${Math.floor(+time/1000)}:R>` },
                        ],
                    }
                ],
            });
        }
        isActive = true;
    }).catch((reason) => {
        if (!isActive) {
            return;
        }

        isActive = false;
        const time = new Date();

        axios.post(WEBHOOK_URL, {
            avatar_url: process.env.AVATAR_URL,
            username: 'Vetrina Status',
            content: '<@1044221313574764584>',
            embeds: [
                {
                    title: 'Down Alert!',
                    description: 'A problem has been detected with **Vetrina Bot**.',
                    color: 16711680,
                    fields: [
                        { name: 'Report Time', value: `<t:${Math.floor(+time/1000)}:R>` },
                    ],
                }
            ],
        });
    });
});

router.use((req, res, next) => {
    console.log(`| ${req.method} | ${req.hostname} | ${req.baseUrl}${req.path}`);
    return next();
});

const StatusCode = {
    OKAY: 'okay',
    ERROR: 'error'
};

router.get('/status', (req, res) => {
    if (isActive) {
        return res.render('status.hbs', {
            message: 'Gud!',
            status: 200,
            statusCode: StatusCode.OKAY,
        });
    }
    return res.render('status.hbs', {
        message: 'Bad!',
        statusCode: StatusCode.ERROR,
    });

});

const port = process.env.PORT ?? 3005;

router.listen(port, () => {
    console.log(`Health check server running on port ${port}.`);
});