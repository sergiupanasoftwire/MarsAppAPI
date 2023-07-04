import {NextFunction, Request, Response} from "express";

const express = require('express');
const axios = require('axios');

const app = express();
const port = 8080;

const SOL: number = 1000;
const F1_API_URL: string = 'https://ergast.com/api/f1'

class RaceInfo {
    round: number;
    raceName: string;
    circuitName: string;
    circuitId: string;

    constructor(round: number, raceName: string, circuitName: string, circuitId: string) {
        this.round = round;
        this.raceName = raceName;
        this.circuitName = circuitName;
        this.circuitId = circuitId;
    }
}

app.use(express.json());
app.use(function(req: Request, res: Response, next: NextFunction) {
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
    const reqURL = F1_API_URL + `/${req.params.seasonYear}/${req.params.roundNumber}.json`;
    const axiosRes = await axios.get(reqURL).catch((err: any) => res.json(err));
    res.json(axiosRes.data);
    return;
})

router.get('/f1/seasons/:seasonYear/rounds',  async (req: Request, res: Response) => {
    const reqURL = F1_API_URL + `/${req.params.seasonYear}.json`;
    const axiosRes = await axios.get(reqURL).catch((err: any) => res.json(err));

    const startRound: number = parseInt(req.query.startRound as string);
    const endRound: number = parseInt(req.query.endRound as string);

    let racesNames: Array<RaceInfo> = new Array<RaceInfo>();
    axiosRes.data.MRData.RaceTable.Races.forEach((race: any) => {
        racesNames.push(
            new RaceInfo(race.round, race.raceName, race.Circuit.circuitName, race.Circuit.circuitId)
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
