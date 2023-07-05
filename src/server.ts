import {NextFunction, Request, Response} from "express";

const express = require('express');
const axios = require('axios');

const app = express();
const port = 8080;

const SOL: number = 1000;
const F1_API_URL: string = 'https://ergast.com/api/f1'

const Scraper = require('images-scraper');

const google = new Scraper({
    puppeteer: {
        headless: true
    },
    tbs: {
        isz: "m"
    }
});

const imagesCache: Record<string, string> = {}

 interface RaceInfo {
    round: number;
    raceName: string;
    circuitName: string;
    circuitId: string;
}

interface RaceDetails {
    info: RaceInfo;
    standings: Result[];
    circuitImage: string;
}

interface Result {
    position: string;
    points: string;
    startingPosition: string;
    driver: Driver;
}

interface Driver {
    firstName: string;
    lastName: string;
    code: string;
    number: string;
    nationality: string;
    constructor: string;
}

app.use(express.json());
app.use(function (req: Request, res: Response, next: NextFunction) {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept'
    );
    next();
});
const router = express.Router();
router.get('/test', (req: Request, res: Response) => res.send('Hello world !'));
router.get('/f1/seasons/:seasonYear', async (req: Request, res: Response) => {
    const reqURL = F1_API_URL + `/${req.params.seasonYear}.json`;
    const axiosRes = await axios.get(reqURL).catch((err: any) => res.json(err));
    res.json(axiosRes.data);
    return;
});
router.get('/f1/seasons/:seasonYear/rounds/:roundNumber', async (req: Request, res: Response) => {
    const reqURL = F1_API_URL + `/${req.params.seasonYear}/${req.params.roundNumber}/results.json`;
    const axiosRes = await axios.get(reqURL).catch((err: any) => res.json(err));
    const details: RaceDetails = {
        info: {
            round: Number(req.params.roundNumber),
            raceName: '',
            circuitName: '',
            circuitId: ''
        },
        standings: [],
        circuitImage: ''
    };

    axiosRes.data.MRData.RaceTable.Races[0].Results.forEach((result: any )=> {
            details.standings.push({
                position: result.position,
                points: result.points,
                startingPosition: result.grid,
                driver: {
                    firstName: result.Driver.givenName,
                    lastName: result.Driver.familyName,
                    code: result.Driver.code,
                    nationality: result.Driver.nationality,
                    number: result.Driver.permanentNumber,
                    constructor: result.Constructor.name
                }
            });
        }
    );

    details.info.circuitName = axiosRes.data.MRData.RaceTable.Races[0].Circuit.circuitName;
    details.info.circuitId = axiosRes.data.MRData.RaceTable.Races[0].Circuit.circuitId;
    details.info.raceName = axiosRes.data.MRData.RaceTable.Races[0].raceName;

    let query = 'formula 1 ' + details.info.circuitName + ' official layout';
    console.log(query);
    if (!imagesCache[query]) {
        const circuitImage = await google.scrape(query, 1);

        imagesCache[query] = circuitImage[0].url;
    }

    details.circuitImage = imagesCache[query];

    console.log(imagesCache[query]);

    res.json(details);
    return;
})

router.get('/f1/seasons/:seasonYear/rounds', async (req: Request, res: Response) => {
    const reqURL = F1_API_URL + `/${req.params.seasonYear}.json`;
    const axiosRes = await axios.get(reqURL).catch((err: any) => res.json(err));

    const startRound: number = parseInt(req.query.startRound as string);
    const endRound: number = parseInt(req.query.endRound as string);


    let racesNames: Array<RaceInfo> = new Array<RaceInfo>();
    axiosRes.data.MRData.RaceTable.Races.forEach((race: any) => {
        racesNames.push(
            {
                round: race.round,
                raceName: race.raceName,
                circuitName: race.Circuit.circuitName,
                circuitId: race.Circuit.circuitId
            },
        )
    });

    if (startRound > endRound) {
        res.status(422).send({
            message: "Invalid query params. StartRound must be less or equal to endRound."
        });
        return;
    }

    if (startRound) {
        racesNames = racesNames.filter((race: RaceInfo): boolean => race.round >= startRound);
    }

    if (endRound) {
        racesNames = racesNames.filter((race: RaceInfo): boolean => race.round <= endRound);
    }


    res.json(racesNames);
    return;
});

app.use('/', router);

app.listen(port, () => {
    console.log(`Test backend is running on port ${port}`);
});
