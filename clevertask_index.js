const express = require("express");
const fs = require("fs");

const Api = require("./api");
const logger = require("./logger");
const config = require("./config");
const utils = require("./utills");
const {value} = require("lodash/seq");
const app = express();

const accountsStateIds = {};

app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Установка виджета
app.get("/login", async (req) => {
    const authCode = req.query.code;
    const subDomain = req.query.referer.split(".")[0];
    logger.debug("Запрос на установку получен");
    const api = new Api(subDomain, authCode);
    await api.getAccessToken();
    const accountId = (await api.getAccountData()).id;
    accountsStateIds[subDomain] = accountId;
});

const getSubdomainForDelete = (state, value) => {
    return Object.keys(state).find((key) => state[key] === value);
};
// Удаление виджета
app.get("/delete", (req) => {
    const accountId = Number(req.query.account_id);
    const subDomain = getSubdomainForDelete(accountsStateIds, accountId);
    if (subDomain) {
        const AMO_TOKEN_PATH = `./authclients/${subDomain}_amo_token.json`;
        fs.unlinkSync(AMO_TOKEN_PATH);
        logger.debug("Файл авторизации удален");
    }
});

app.post("/hook", async (req) => {
    try {
        //Обработка webhook
    } catch (err) {
        logger.error(err);
    }
});
app.listen(config.PORT, () => logger.debug("Server started on ", config.PORT));
