const Discord = require('discord.io');
const logger = require('winston');
const auth = require('./auth.json');
const fs = require('fs');
const i2c = require('i2c-bus');

const URM09_ADDR = 0x11;

const SLAVEADDR_INDEX = 0x00;
const PID_INDEX = 0x01;
const VERSION_INDEX = 0x02;

const DIST_H_INDEX = 0x03;
const DIST_L_INDEX = 0x04;

const TEMP_H_INDEX = 0x05;
const TEMP_L_INDEX = 0x06;

const CFG_INDEX = 0x07;
const CMD_INDEX = 0x08;

const serverID = "678456625895440404";

const roleAdmin = "678456723337379860";
const roleBot = "678656177340416000";
const roleMember = "678655026406883489";
const roleRobot = "678655929272762389";
const roleKiosque = "678658232020893696";
const roleVideo = "678655962713948250";
const roleProg = "678655809437040661";
const roleJournal = "678655993923633212";
const roleWeb = "678659252146929674";
const roleBotOverlord = "679853889260093512";

const roleMaitreDeJeu = "680962987489886234";
const roleJoueur = "679302521956597760";
const roleMort = "680963175302430772";

const channelLoupGarou = "679142469685739531";

const channelDiscution = "678669416996667403";

let created = false;
let started = false;

let gameMasterID = "";

let participantsID = [];
let alive = [];

const roles = ["loup", "loup", "loup", "loup", "voyante", "chasseur", "cupidon", "sorciere", "voleur"];

let listEmojis = [];

let potionVie = true;
let potionMort = true;

let emojiVillage = [];
let emojiLoup = [];

let emojiChoice = [];
let emojiToIdAssociation = new Map();
let idToEmojiAssociation = new Map();
let votes = new Map();

let morts = [];

let idToRoleAssociation = new Map();

let loup = [];
let voyante = [];
let chasseur = [];
let cupidon = [];
let sorciere = [];
let voleur = [];
let villageois = [];

let turn = 0;
let alt = 0;

const turnDay = 0;
const turnCupidon = 1;
const turnVoyante = 2;
const turnLoup = 3;
const turnSorciere = 4;
const turnVoleur = 5;

let allEmojiList = [];

let couple = [];

let makingSure = 0;

let now = new Date();
let waitTime = now.getTime();
const votingTime = 10000;
const voteChoiceAmount = 4; // up to that many option possible on day vote

let journer = 0;

let fini = false;

let killRight = [];

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';
// Initialize Discord Bot
let bot = new Discord.Client({
    token: auth.token,
    autorun: true
});

bot.on('disconnect', async (evt) => {
    var minutes = 1000 * 60;
    var hours = minutes * 60;
    var days = hours * 24;
    var years = days * 365;
    var d = new Date();

    console.log(d.getDate());
    console.log(d.getHours());
    console.log(d.getMinutes());
    console.log(d.getSeconds());

    bot.connect();
});

bot.on('ready', async (evt) => {
    console.log('Connected');
    console.log('Logged in as: ');
    console.log(bot.username + ' - (' + bot.id + ')');

    try {
        const data = fs.readFileSync('./emoji.txt', 'utf8');
        allEmojiList = data.split(" ");
    } catch (err) {
        console.error(err);
    }

    button();
});

bot.on('message', async (user, userID, channelID, message, evt) => {
    let directMessage = false;
    let botoverlord = false;
    let admin = false;

    try {
        if (evt.d.member.roles.length > 0 && evt.d.member.roles[0] === roleBot) {
            return;
        }
        botoverlord = as(evt.d.member.roles, roleBotOverlord);
        admin = as(evt.d.member.roles, roleAdmin);
    } catch (Exception) {
        directMessage = true;
        console.log(user + "<@!" + userID + "> : " + message);
    }

    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`
    if (message.substring(0, 1) === '!') {
        let args = message.substring(1).split(' ');
        let cmd = args[0].toLocaleLowerCase();
        args = args.splice(1);

        switch (cmd) {
            case 'display':
                if (!directMessage) { deleteMessage(channelID, evt.d.id); }
                if (created && started) {
                    listEmojiId(channelID, alive);
                }
                return;
            case 'done':
                if (!directMessage) {
                    deleteMessage(channelID, evt.d.id);
                }
                if (created && started && ((directMessage && turn != turnDay && as(turnOf(turn), userID)) || (!directMessage && turn === turnDay && ((userID === gameMasterID) || as(evt.d.member.roles, roleMaitreDeJeu))))) {
                    if (await doTurn(turn) === true) {
                        nextTurn();
                    }
                }
                return;
            case 'emoji':
                if (!directMessage) deleteMessage(channelID, evt.d.id);

                if (!directMessage && (admin || botoverlord)) {
                    if (args.length > 0) {
                        listEmojis = message.substr(5).replace(">", "").split(" ");
                        console.log(message);
                    } else {
                        listEmojis = [];
                    }
                }
                return;
            case 'say':
                if (!directMessage) deleteMessage(channelID, evt.d.id);

                if (!directMessage && (admin || botoverlord) && args.length > 0) {
                    send(message.substr(5), channelID, listEmojis);
                }
                return;
            case 'dm':
                if (!directMessage) deleteMessage(channelID, evt.d.id);

                if (!directMessage && (admin && botoverlord) && args.length > 0) {
                    send(message.substr(27), args[0].replace("<@!", "").replace(">", ""), listEmojis);
                }
                return;
            case 'clear':
                if (!directMessage && admin && args.length > 0) {
                    clearMessage(channelID, (args[0].toLowerCase() === "all" ? null : args[0]));
                }
                return;
            case 'ping':
                bot.sendMessage({
                    to: channelID,
                    message: '!pong'
                });
                return;
            case 'join':
                if (!directMessage) deleteMessage(channelID, evt.d.id);

                if (created) {
                    let i = 0;
                    do {
                        let id = "";

                        if (args.length == 0) {
                            id = userID;
                        } else if (admin) {
                            id = args[i].replace("<@!", "").replace(">", "");
                        } else {
                            break;
                        }

                        if (!as(participantsID, id) && participantsID.length < 20) {
                            participantsID.push(id);
                            if (started) {
                                await play([id], roleMort);
                            } else {
                                await play([id], roleJoueur);
                            }
                            await send("<@!" + id + "> a rejoin la partie", channelLoupGarou);
                        }

                        i++;
                    } while (i < args.length);
                }
                return;
            case 'create':
                if (!directMessage) deleteMessage(channelID, evt.d.id);

                if (!started && !created) {
                    clearMessage(channelLoupGarou, null);

                    await sleep(1000);

                    gameMasterID = userID;

                    participantsID = [];
                    participantsID.push(gameMasterID);

                    await play([gameMasterID], roleMaitreDeJeu);

                    await sleep(1000);

                    await play([gameMasterID]);

                    created = true;
                    await send("<@!" + userID + "> a créé une nouvelle partie. ", channelLoupGarou);
                    if (channelID != channelLoupGarou) {
                        await sleep(1000);
                        await send("<@!" + userID + "> a créé une nouvelle partie. ", channelID);
                    }
                }
                return;
            case 'help':
                if (!directMessage) deleteMessage(channelID, evt.d.id);

                let msg = "Definition : ... = message ; @ = utilisateur ; :_: = listes de _ ; # = nombre ; / = ou";

                if (botoverlord || admin) {
                    msg += "\n!say ... => Fait dire ... a <@!" + bot.id + ">";

                    msg += "\n!emoji :emoji: => Liste de réaction que <@!" + bot.id + "> utilisera lors de la prochaine utilisation de !say";
                }

                if (botoverlord && admin) {
                    msg += "\n!dm @ ... => Fait dire ... a <@!" + bot.id + "> dans les dm de @";
                }

                if (admin) {
                    msg += "\n!clear # / all => Delete les # dernier messages ou tout les messages envoyer dans cette channel";

                    msg += "\n!join :@: => Tout les @ mentionner vont rejoindre la partie de loups-garous en cours de création ou en tant que spectateur si débuter";


                    msg += "\n!overthrow :@: => Remplace le maitre de jeu de force";
                }

                msg += "\n!ping => !pong";

                msg += "\n!help => Ce menu";

                msg += "\n!create => Crée une nouvelle partie de loups-garous et te met maitre de jeu (le maitre de jeu jou également, puisque la majorité des choses son gérer par <@!" + bot.id + ">)";

                msg += "\n!join => Rejoin la partie de loups-garous en cours de création ou en tant que spectateur si débuter";

                msg += "\n!start => Si maitre de jeu, fait commencer le jeu de loups-garous déjà créer";

                msg += "\n!end => Si maitre de jeu, fait terminer le jeu de loups-garous";

                msg += "\n!done => Fini ton tour dans loup-garous, le jour seulement le maitre de jeu peu le faire";

                msg += "\n!next => Si maitre de jeu, force la fin du tour actuelle (pas la journer au complet)";

                msg += "\n!display => Montre la liste des attribution emoji/joueur pour les votes de loups-garous";

                msg += "\n!kill @ => Si maitre de jeu ou quand le chasseur meurt, tue @";

                await sleep(1000);
                send(msg, channelID);
                return;
        }

        switch (channelID) {
            case channelLoupGarou:
                switch (cmd) {
                    case 'start':
                        deleteMessage(channelID, evt.d.id);
                        if (created && !started && (userID === gameMasterID || as(evt.d.member.roles, roleMaitreDeJeu))) {
                            started = true;

                            let choixLoup = true;

                            potionVie = true;
                            potionMort = true;

                            loup = [];
                            voyante = [];
                            chasseur = [];
                            cupidon = [];
                            sorciere = [];
                            voleur = [];
                            villageois = [];

                            idToRoleAssociation = new Map();
                            fini = false;

                            morts = [];
                            couple = [];

                            emojiVillage = [];
                            emojiLoup = [];

                            let copyEmoji = allEmojiList;
                            emojiChoice = [];
                            emojiToIdAssociation = new Map();
                            idToEmojiAssociation = new Map();
                            votes = new Map();
                            alive = [];
                            let choix = [];
                            for (let i = 0; i < participantsID.length; i++) {
                                alive.push(participantsID[i]);
                                choix.push(participantsID[i]);
                                votes.set(participantsID[i], []);
                            }

                            let role = [];
                            for (let i = 0; i < roles.length; i++) {
                                role.push(roles[i]);
                            }

                            let first = true;
                            while (choix.length > 0) {
                                let i = role.length > 0 ? Math.floor(Math.random() * role.length) : -1;
                                let j = Math.floor(Math.random() * choix.length);
                                let k = Math.floor(Math.random() * copyEmoji.length);

                                while (i >= 0 && role[i] == "loup" && !choixLoup && asElse(role, "loup")) {
                                    i = Math.floor(Math.random() * role.length);
                                }
                                choixLoup = true;

                                if (choix.length == 1 && first) {
                                    i = 0;
                                    first = false;
                                }

                                switch (i >= 0 ? role[i] : "villageois") {
                                    case "loup":
                                        loup.push(choix[j]);
                                        choixLoup = false;
                                        first = false;
                                        break;
                                    case "voyante":
                                        voyante.push(choix[j]);
                                        break;
                                    case "chasseur":
                                        chasseur.push(choix[j]);
                                        break;
                                    case "cupidon":
                                        cupidon.push(choix[j]);
                                        break;
                                    case "sorciere":
                                        sorciere.push(choix[j]);
                                        break;
                                    case "voleur":
                                        voleur.push(choix[j]);
                                        break;
                                    default:
                                        villageois.push(choix[j]);
                                        break;
                                }

                                if ((i >= 0 ? role[i] : "villageois") === "loup") {
                                    emojiLoup.push(copyEmoji[k]);
                                } else {
                                    emojiVillage.push(copyEmoji[k]);
                                }

                                send("Le rôle " + (i >= 0 ? role[i] : "villageois") + " vous a été attribuer <@!" + choix[j] + ">", choix[j], [copyEmoji[k]]);
                                emojiToIdAssociation.set(copyEmoji[k], choix[j]);
                                idToEmojiAssociation.set(choix[j], copyEmoji[k]);
                                idToRoleAssociation.set(choix[j], (i >= 0 ? role[i] : "villageois"));
                                emojiChoice.push(copyEmoji[k]);

                                await sleep(200);

                                copyEmoji.splice(k, 1);
                                choix.splice(j, 1);
                                if (i >= 0) role.splice(i, 1);
                            }

                            await sleep(1000);

                            for (let i = 0; i < loup.length; i++) {
                                for (let j = 0; j < loup.length; j++) {
                                    if (i != j) {
                                        send("Vous jouer avec <@!" + loup[j] + ">", loup[i]);
                                    }
                                }

                                if (loup.length > 1) {
                                    await sleep(100);
                                    send("Vous devriez créer un groupe DM avec " + ((loup.length > 2) ? "eu" : "lui"), loup[i]);
                                }
                            }

                            send("<@!" + userID + "> a fait débuter la partie. ", channelID);

                            await sleep(1000);

                            listEmojiId(channelLoupGarou, alive);
                        }
                        break;
                    case 'end':
                        deleteMessage(channelID, evt.d.id);
                        if (created && (userID === gameMasterID || as(evt.d.member.roles, roleMaitreDeJeu))) {
                            if (makingSure == 0 && !fini) {
                                send("<@!" + userID + ">, voulez-vous vraiment forcer la fin du jeu ? (si oui refaire la commande, sinon ne rien faire)", channelLoupGarou);
                                makingSure = 1;
                            } else {
                                stopPlay(participantsID);

                                await sleep(1000);

                                stopPlay(participantsID, roleMort);

                                await sleep(1000);

                                stopPlay(participantsID, roleMaitreDeJeu);

                                await sleep(200);

                                gameMasterID = null;
                                participantsID = [];

                                created = false;
                                started = false;
                                fini = true;

                                send("<@!" + userID + "> a mis fin à la partie. ", channelID);
                                stopPlay(participantsID);
                            }
                        }
                        break;
                    case 'next':
                        deleteMessage(channelID, evt.d.id);
                        if (created && started && ((userID === gameMasterID || as(evt.d.member.roles, roleMaitreDeJeu)))) {
                            if (makingSure == 0) {
                                send("<@!" + userID + ">, voulez-vous vraiment forcer la fin du tour ? (si oui refaire la commande, sinon ne rien faire)", channelLoupGarou);
                                makingSure = 1;
                            } else {
                                nextTurn();
                                makingSure = 0;
                            }
                        }
                        break;
                    case 'kill':
                        deleteMessage(channelID, evt.d.id);
                        if (created && started && (userID === gameMasterID || as(evt.d.member.roles, roleMaitreDeJeu) || as(killRight, userID))) {
                            let id = args[0].replace("<@!", "").replace(">", "");
                            if (makingSure == 0 && !as(killRight, userID)) {
                                send("<@!" + userID + ">, voulez-vous vraiment éliminer <@!" + id + "> de force ? (si oui refaire la commande, sinon ne rien faire)");
                                makingSure = 1;
                            } else {
                                killRight = deleteFromArray(killRight, userID);
                                kill(id);
                                makingSure = 0;
                            }
                        }
                        break;
                    case 'overthrow':
                        deleteMessage(channelID, evt.d.id);
                        if (created && as(evt.d.member.roles, roleAdmin)) {
                            if (makingSure == 0) {
                                await sleep(500);
                                send("<@!" + userID + ">, voulez-vous vraiment remplacer <@!" + gameMasterID + "> de force ? (si oui refaire la commande, sinon ne rien faire)", channelLoupGarou);
                                makingSure = 1;
                            } else {
                                await sleep(500);
                                stopPlay([gameMasterID], roleMaitreDeJeu);
                                gameMasterID = userID;
                                await sleep(500);
                                play([gameMasterID], roleMaitreDeJeu);
                                makingSure = 0;
                            }
                        }
                        break;
                }
        }
    }
});

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
async function listEmojiId(channelID, array) {
    let msg = "";
    let emot = [];
    console.log(idToEmojiAssociation);
    for (let i = 0; i < array.length; i++) {
        msg += "<@!" + array[i] + "> : " + idToEmojiAssociation.get(array[i]) + " ; ";
        emot.push(idToEmojiAssociation.get(array[i]));
    }
    await sleep(100);

    send(msg, channelID, emot);
}

async function nextTurn() {
    if (created && started && !fini) {
        makingSure = 0;
        alt = 0;

        if (loup.length > 0 && alive.length > loup.length && !(couple.length == 2 && alive.length == 2)) {
            do {
                turn++;
                turn %= 6;
            } while (!(turnOf(turn) === null || turnOf(turn) == undefined || turnOf(turn).length > 0));

            for (let i = 0; i < alive.length; i++) {
                votes.set(alive[i], []);
            }

            await sleep(2000);

            send("C'est le " + turnOfString(turn), channelLoupGarou);

            await sleep(150);

            doTurn(turn);
        } else {
            let msg = "";
            let emot = [];
            if (couple.length == 2 && alive.length == 2) {
                msg = "Le couple a gagner !!! ";
                emot = [idToEmojiAssociation.get(couple[0]), idToEmojiAssociation.get(couple[1])];
            } else if (loup.length == 0) {
                msg = "Le village a ganer !!! ";
                emot = emojiLoup;
            } else if (alive.length == loup.length) {
                msg = "Les loups-garous on gagner !!! ";
                emot = emojiVillage;
            }

            send(msg, channelLoupGarou, emot);
            await sleep(2000);

            send("<@!" + gameMasterID + "> veuiller faire \"!end\" quand vous aurez fini. ", channelLoupGarou);

            fini = true;
        }
    } else {

    }
}

bot.on('messageReactionAdd', async (reaction, user) => {
    try {
        if (created && started && (turnOf(turn) === null || reaction.d.guild_id == undefined)) {
            if (turnOf(turn) === null || as(turnOf(turn), reaction.d.user_id)) {
                votes.get(reaction.d.user_id).push(reaction.d.emoji.name);
            }
        }
    } catch (err) {
        return;
    }

    switch (reaction.d.channel_id) {
        case '678654094210236456':

            switch (reaction.d.message_id) {
                case '678715439995682816':

                    let message = reaction.d.member.nick + ' a rejoin ';

                    switch (reaction.d.emoji.name) {
                        case '🤖':
                            message += 'robot';
                            bot.addToRole({
                                serverID: serverID,
                                userID: reaction.d.user_id,
                                roleID: roleRobot
                            }, function (err, response) {
                                if (err) {
                                    logger.error(err);
                                } else {
                                    logger.info(response);
                                }
                            });
                            break;
                        case '🏠':
                            message += 'kiosque';
                            bot.addToRole({
                                serverID: serverID,
                                userID: reaction.d.user_id,
                                roleID: roleKiosque
                            }, function (err, response) {
                                if (err) {
                                    logger.error(err);
                                } else {
                                    logger.info(response);
                                }
                            });
                            break;
                        case '🎥':
                            message += 'video';
                            bot.addToRole({
                                serverID: serverID,
                                userID: reaction.d.user_id,
                                roleID: roleVideo
                            }, function (err, response) {
                                if (err) {
                                    logger.error(err);
                                } else {
                                    logger.info(response);
                                }
                            });
                            break;
                        case '💻':
                            message += 'programmation';
                            bot.addToRole({
                                serverID: serverID,
                                userID: reaction.d.user_id,
                                roleID: roleProg
                            }, function (err, response) {
                                if (err) {
                                    logger.error(err);
                                } else {
                                    logger.info(response);
                                }
                            });
                            break;
                        case '📰':
                            message += 'journal';
                            bot.addToRole({
                                serverID: serverID,
                                userID: reaction.d.user_id,
                                roleID: roleJournal
                            }, function (err, response) {
                                if (err) {
                                    logger.error(err);
                                } else {
                                    logger.info(response);
                                }
                            });
                            break;
                        case '📲':
                            message += 'site web';
                            bot.addToRole({
                                serverID: serverID,
                                userID: reaction.d.user_id,
                                roleID: roleWeb
                            }, function (err, response) {
                                if (err) {
                                    logger.error(err);
                                } else {
                                    logger.info(response);
                                }
                            });
                            break;
                        default:
                            return;
                    }

                    console.log(message);
            }
            break;
        case '678468929898938475':

            switch (reaction.d.message_id) {
                case '678723559153074197':
                    switch (reaction.d.emoji.name) {
                        case '✅':
                            bot.addToRole({
                                serverID: serverID,
                                userID: reaction.d.user_id,
                                roleID: roleMember
                            }, function (err, response) {
                                if (err) {
                                    logger.error(err);
                                } else {
                                    logger.info(response);
                                }
                            });
                            console.log(reaction.d.member.nick + " est maintenant membre");
                            break;
                    }
                    break;
            }
            break;
    }

});

bot.on('messageReactionRemove', function (reaction) {
    try {
        if (created && started && reaction.d.guild_id == undefined) {
            if (turnOf(turn) === null || as(turnOf(turn), reaction.d.user_id)) {
                let buf = votes.get(reaction.d.user_id);
                for (let i = 0; i < buf.length; i++) {
                    if (buf[i] === reaction.d.emoji.name) {
                        buf.splice(i, 1);
                    }
                }
                votes.set(reaction.d.user_id, buf);
            }
        }
    } catch (err) {
        return;
    }

    switch (reaction.d.channel_id) {
        case '678654094210236456':
            switch (reaction.d.message_id) {
                case '678715439995682816':
                    //console.log(reaction);
                    //console.log(reaction.d.emoji.name);

                    let message = reaction.d.user_id + ' a quiter ';

                    switch (reaction.d.emoji.name) {
                        case '🤖':
                            message += 'robot';
                            bot.removeFromRole({
                                serverID: serverID,
                                userID: reaction.d.user_id,
                                roleID: roleRobot
                            }, function (err, response) {
                                if (err) {
                                    logger.error(err);
                                } else {
                                    logger.info(response);
                                }
                            });
                            break;
                        case '🏠':
                            message += 'kiosque';
                            bot.removeFromRole({
                                serverID: serverID,
                                userID: reaction.d.user_id,
                                roleID: roleKiosque
                            }, function (err, response) {
                                if (err) {
                                    logger.error(err);
                                } else {
                                    logger.info(response);
                                }
                            });
                            break;
                        case '🎥':
                            message += 'video';
                            bot.removeFromRole({
                                serverID: serverID,
                                userID: reaction.d.user_id,
                                roleID: roleVideo
                            }, function (err, response) {
                                if (err) {
                                    logger.error(err);
                                } else {
                                    logger.info(response);
                                }
                            });
                            break;
                        case '💻':
                            message += 'programmation';
                            bot.removeFromRole({
                                serverID: serverID,
                                userID: reaction.d.user_id,
                                roleID: roleProg
                            }, function (err, response) {
                                if (err) {
                                    logger.error(err);
                                } else {
                                    logger.info(response);
                                }
                            });
                            break;
                        case '📰':
                            message += 'journal';
                            bot.removeFromRole({
                                serverID: serverID,
                                userID: reaction.d.user_id,
                                roleID: roleJournal
                            }, function (err, response) {
                                if (err) {
                                    logger.error(err);
                                } else {
                                    logger.info(response);
                                }
                            });
                            break;
                        case '📲':
                            message += 'site web';
                            bot.removeFromRole({
                                serverID: serverID,
                                userID: reaction.d.user_id,
                                roleID: roleWeb
                            }, function (err, response) {
                                if (err) {
                                    logger.error(err);
                                } else {
                                    logger.info(response);
                                }
                            });
                            break;
                        default:
                            return;
                    }

                    console.log(message);
            }
            break;
    }
});

async function send(message, ID, emoji) {
    console.log(message);
    try {
        await bot.sendMessage({
            to: ID,
            message: message
        }, async (err, response) => {
            if (err) {
                logger.error(err);
            } else {
                if (emoji != null) {
                    try {
                        for (let i = 0; i < emoji.length; i++) {
                            await sleep(750);
                            bot.addReaction({
                                channelID: ID,
                                messageID: response.id,
                                reaction: emoji[i].replace(">", "")
                            }, function (err, response) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    console.log(response);
                                }
                            });
                        }
                    } catch (Exception) {
                    }
                }
            }
        });
    } catch (Exception) {
    }
}

function as(array, match) {
    for (let i = 0; i < array.length; i++) {
        if (array[i] == match) {
            return true;
        }
    }
    return false;
}

function asElse(array, match) {
    for (let i = 0; i < array.length; i++) {
        if (array[i] != match) {
            return true;
        }
    }
    return false;
}

async function clearMessage(channelID, limit) {
    let b = [];

    if (limit != null) {
        limit = parseInt(limit) + 1;
        bot.getMessages({ channelID: channelID, limit: limit }, async (err, response) => {
            if (err) {
                console.log(err);
            } else {
                b = [];
                for (let c = 0; c < limit && c < response.length; c++) b.push(response[c].id);
                await bot.deleteMessages({
                    channelID: channelID,
                    messageID: b
                }, function (err, response) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log(response);
                    }
                });
            }
        });
    } else {
        do {
            bot.getMessages({ channelID: channelID, limit: 100 }, async (err, response) => {
                if (err) {
                    console.log(err);
                } else {
                    b = [];
                    for (let c = 0; c < response.length; c++) b.push(response[c].id);
                    await bot.deleteMessages({
                        channelID: channelID,
                        messageID: b
                    }, function (err, response) {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log(response);
                        }
                    });
                }
            });
        } while (b >= 100);
    }
}

async function play(players, giveRole) {
    if (giveRole === undefined) {
        giveRole = roleJoueur;
    }

    for (let i = 0; i < players.length; i++) {
        let doIt = false;
        let player = players[i];

        do {
            await bot.addToRole({
                serverID: serverID,
                userID: players[i],
                roleID: giveRole
            }, async (err, response) => {
                if (err) {
                    logger.error(err);
                    doIt = true;
                    await sleep(200);
                } else {
                    console.log(response);
                    doIt = false;
                }
            });

            if (!doIt) {
                await bot.getMember({ serverID: serverID, userID: player }, async (err, response) => {
                    if (err) {
                        logger.error(err);
                        doIt = true;
                        await sleep(200);
                    } else {
                        doIt = !as(response.roles, giveRole);
                    }
                });
            }
        } while (doIt);
    }
}

async function stopPlay(players, giveRole) {
    if (giveRole === undefined) {
        giveRole = roleJoueur;
    }

    for (let i = 0; i < players.length; i++) {
        let doIt = false;
        let player = players[i];

        do {
            await bot.removeFromRole({
                serverID: serverID,
                userID: players[i],
                roleID: giveRole
            }, async (err, response) => {
                if (err) {
                    logger.error(err);
                    doIt = true;
                    await sleep(200);
                } else {
                    console.log(response);
                    doIt = false;
                }
            });

            if (!doIt) {
                await bot.getMember({ serverID: serverID, userID: player }, async (err, response) => {
                    if (err) {
                        logger.error(err);
                        doIt = true;
                        await sleep(200);
                    } else {
                        doIt = as(response.roles, giveRole);
                    }
                });
            }
        } while (doIt);
    }
}

function turnOf(turn) {
    switch (turn) {
        case turnDay:
            return null;
        case turnCupidon:
            return cupidon;
        case turnVoyante:
            return voyante;
        case turnLoup:
            return loup;
        case turnSorciere:
            return sorciere;
        case turnVoleur:
            return voleur;
    }
}

function turnOfString(turn) {
    switch (turn) {
        case turnDay:
            return "jour";
        case turnCupidon:
            return "tour du cupidon";
        case turnVoyante:
            return "tour de la voyante";
        case turnLoup:
            return "tour des loups-garous";
        case turnSorciere:
            return "tour de la sorciere";
        case turnVoleur:
            return "tour du voleur";
    }
}

async function doTurn(turn) {
    let approval = true;
    switch (turn) {
        case turnDay:
            approval = await tourDay();
            break;
        case turnCupidon:
            approval = await tourCupidon();
            break;
        case turnVoyante:
            approval = await tourVoyante();
            break;
        case turnLoup:
            approval = await tourLoup();
            break;
        case turnSorciere:
            approval = await tourSorciere();
            break;
        case turnVoleur:
            approval = await tourVoleur();
            break;
    }

    console.log(approval);
    return approval;
}

async function deleteMessage(channelID, messageID) {
    bot.deleteMessage({ channelID: channelID, messageID: messageID }, function (err, response) {
        if (err) {
            logger.error(err);
        } else {
            console.log(response);
        }
    });
}

async function kill(ID) {
    let emot = [];
    let pass = false;
    let loop = false;
    ID = ID.replace("<@!", "").replace(">", "");

    do {
        loop = false;
        for (let i = 0; i < alive.length; i++) {
            if (alive[i] === ID) {
                let roleEst = await idToRoleAssociation.get(ID);
                pass = true;

                await sleep(500);

                switch (roleEst) {
                    case 'loup':
                        for (let j = 0; j < loup.length; j++) {
                            if (loup[j] === ID) {
                                loup.splice(j, 1);
                            }
                        }
                        break;
                    case "voyante":
                        for (let j = 0; j < voyante.length; j++) {
                            if (voyante[j] === ID) {
                                voyante.splice(j, 1);
                            }
                        }
                        break;
                    case "chasseur":
                        for (let j = 0; j < chasseur.length; j++) {
                            if (chasseur[j] === ID) {
                                chasseur.splice(j, 1);
                                killRight.push(ID);
                                send("<@!" + ID + "> faite \"!kill @user\" pour choisir qui tuer ! ", channelLoupGarou);
                            }
                        }
                        break;
                    case "cupidon":
                        for (let j = 0; j < cupidon.length; j++) {
                            if (cupidon[j] === ID) {
                                cupidon.splice(j, 1);
                            }
                        }
                        break;
                    case "sorciere":
                        for (let j = 0; j < sorciere.length; j++) {
                            if (sorciere[j] === ID) {
                                sorciere.splice(j, 1);
                            }
                        }
                        break;
                    case "voleur":
                        for (let j = 0; j < voleur.length; j++) {
                            if (voleur[j] === ID) {
                                voleur.splice(j, 1);
                            }
                        }
                        break;
                    default:
                        for (let j = 0; j < villageois.length; j++) {
                            if (villageois[j] === ID) {
                                villageois.splice(j, 1);
                            }
                        }
                        break;
                }

                emot.push(idToEmojiAssociation.get(ID));
                emojiToIdAssociation.delete(emot);
                idToEmojiAssociation.delete(ID);
                idToRoleAssociation.delete(ID);
                alive.splice(i, 1);
                votes.delete(ID);

                for (let j = 0; j < emojiChoice.length; j++) {
                    if (emojiChoice[j] === emot) {
                        emojiChoice.splice(j, 1);
                    }
                }

                let msg = "<@!" + ID + "> est est mort ! Il était un " + roleEst + " ! ";
                send(msg, channelLoupGarou, emot);
                await sleep(500);
                stopPlay([ID], roleJoueur);
                await sleep(150);
                play([ID], roleMort);
                break;
            }
        }

        if (as(couple, ID)) {
            let id;
            if (ID == couple[0]) {
                id = couple[1];
            } else {
                id = couple[0];
            }

            emot.push(idToEmojiAssociation.get(id));

            send("<@!" + ID + "> était en couple avec <@!" + id + "> ! ", channelLoupGarou, emot);

            couple = [];
            ID = id;
            loop = true;
        }

    } while (loop);

    return pass;
}

async function tourDay() {
    let approval = true;
    let votePick = [];

    if (alt < 3 && journer > 0) {
        now = new Date();
        let timeLeft = now.getTime() - waitTime;
        if (timeLeft >= votingTime) {
            switch (alt) {
                case 0:
                    for (let i = 0; i < morts.length; i++) {
                        if (await kill(morts[i]) === true) {
                            await sleep(500);
                        }
                    }
                    morts = [];

                    await sleep(1000);

                    send("(jour " + journer + ") Qui acusez-vous ? (phase préliminaire) ", channelLoupGarou);

                    await sleep(159);

                    listEmojiId(channelLoupGarou, alive);

                    now = new Date();
                    waitTime = now.getTime();
                    approval = false;
                    journer++;
                    alt = 1;
                    break;
                case 1:
                    for (let i = 0; i < alive.length; i++) {
                        if (votes.has(alive[i])) {
                            let vote = votes.get(alive[i]);
                            if (vote.length > 0) {
                                let j = vote.length - 1;
                                for (; j >= 0 && (!as(emojiChoice, vote[j]) || emojiToIdAssociation.get(vote[j]) === alive[i]); j--);

                                if (j < vote.length) {
                                    let id = emojiToIdAssociation.get(vote[j]);
                                    votePick.push(id);
                                }
                            }
                        }
                    }

                    if (votePick.length > 0) {
                        let count = new Map();
                        let opt = [];

                        for (let i = 0; i < votePick.length; i++) {
                            if (count.has(votePick[i])) {
                                count.set(votePick[i], count.get(votePick[i]) + 1);
                            } else {
                                count.set(votePick[i], 1);
                                opt.push(votePick[i]);
                            }
                        }

                        let id = [];
                        let bigest = [];

                        while (opt.length > 0) {
                            let bigId = 0;
                            let big = count.get(opt[bigId]);
                            for (let j = 0; j < opt.length; j++) {
                                let buf = count.get(opt[j]);
                                if (buf > big) {
                                    bigId = j;
                                    big = buf;
                                }
                            }
                            id.push(opt[bigId]);
                            bigest.push(count.get(opt[bigId]));
                            count.delete(opt[bigId]);
                            opt.splice(bigId, 1);
                        }

                        let accusers = [];

                        for (let i = 0; i < voteChoiceAmount && i < id.length; i++) {
                            accusers.push(id[i]);
                        }

                        send("Qui ferez-vous bruler sur le bucher ? (phase final - faire des débats) ", channelLoupGarou);

                        await sleep(1500);

                        listEmojiId(channelLoupGarou, accusers);

                        for (let i = 0; i < alive.length; i++) {
                            votes.set(alive[i], []);
                        }

                        now = new Date();
                        waitTime = now.getTime();
                        approval = false;
                        alt = 2;
                    } else {
                        send("Personne n'as voter ! ", channelLoupGarou);
                        now = new Date();
                        waitTime = now.getTime();
                        approval = false;
                    }
                    break;
                case 2:
                    for (let i = 0; i < alive.length && approval; i++) {
                        if (votes.has(alive[i])) {
                            let vote = votes.get(alive[i]);
                            if (vote.length > 0) {
                                let j = vote.length - 1;
                                for (; j >= 0 && (!as(emojiChoice, vote[j]) || emojiToIdAssociation.get(vote[j]) === alive[i]); j--);

                                if (j < vote.length) {
                                    let id = emojiToIdAssociation.get(vote[j]);
                                    votePick.push(id);
                                } else {
                                    approval = false;
                                }
                            }
                        }
                    }

                    if (approval && votePick.length > 0) {
                        let count = new Map();
                        let opt = [];

                        for (let i = 0; i < votePick.length; i++) {
                            if (count.has(votePick[i])) {
                                count.set(votePick[i], count.get(votePick[i]) + 1);
                            } else {
                                count.set(votePick[i], 1);
                                opt.push(votePick[i]);
                            }
                        }

                        let bigId = 0;
                        let big = count.get(opt[bigId]);
                        for (let j = 0; j < opt.length; j++) {
                            let buf = count.get(opt[j]);
                            if (buf > big) {
                                bigId = j;
                                big = buf;
                            }
                        }

                        let dead = opt[bigId];

                        if (await kill(dead) === true) {
                            await sleep(500);
                        }

                        approval = false;
                        avt = 3;
                    } else {
                        send("Il reste des gens qui n'on pas voter ! ", channelLoupGarou);
                        now = new Date();
                        waitTime = now.getTime();
                        approval = false;
                    }
                    break;
            }
        } else {
            approval = false;
            send("Laisser le temps au gens de voter avant de faire \"!done\" ! Il reste " + Math.max(Math.floor((votingTime - timeLeft) / 1000), 0) + " seconde au minimum pour voter . ", channelLoupGarou);
            waitTime += timeLeft / 2;
        }
        approval = false;
    } else if (journer === 0) {
        journer++;
    }

    return approval;
}

async function tourCupidon() {
    let approval = true;

    if (couple.length === 0) {
        for (let i = 0; i < cupidon.length && approval; i++) {
            switch (alt) {
                case 0:
                    send("Qui veut tu mettre en couple ? ", cupidon[i], emojiChoice);
                    approval = false;
                    alt = 1;
                    break;
                case 1:
                    if (votes.has(cupidon[i])) {
                        let vote = votes.get(cupidon[i]);
                        if (vote.length > 0) {
                            let j = 0;
                            for (; j < vote.length && !as(emojiChoice, vote[j]); j++); // est ce que le cupidon peut se mettre en couple lui-même ? emojiToIdAssociation.get(vote[j]) === cupidon[i]

                            let k = j + 1;
                            for (; k < vote.length && !as(emojiChoice, vote[k]); k++); // est ce que le cupidon peut se mettre en couple lui-même ? emojiToIdAssociation.get(vote[j]) === cupidon[i]

                            if (k < vote.length) {
                                couple = [emojiToIdAssociation.get(vote[j]), emojiToIdAssociation.get(vote[k])];
                                send("<@!" + couple[0] + "> est maintenant en couple avec <@!" + couple[1] + "> ! ", cupidon[i], [vote[j], vote[k]]);
                                await sleep(500);
                                send("Vous ête maintenant en couple avec <@!" + couple[1] + "> ! ", couple[0], [vote[k]]);
                                await sleep(500);
                                send("Vous ête maintenant en couple avec <@!" + couple[0] + "> ! ", couple[1], [vote[j]]);
                            } else {
                                send("Votre vote est invalide ! ", cupidon[i]);
                                approval = false;
                            }
                        } else {
                            send("Vous n'avez pas voter ! ", cupidon[i]);
                            approval = false;
                        }
                    } else {
                        send("Vous n'avez pas de droit de vote !? Vous devrier le dire a un admin c'est étrange... ", cupidon[i]);
                        approval = false;
                    }
                    break;
            }
        }
    }

    return approval;
}

async function tourVoyante() {
    let approval = true;

    for (let i = 0; i < voyante.length && approval; i++) {
        switch (alt) {
            case 0:
                send("L'identité de quelle joueur voulez-vous connaitre ? ", voyante[i], emojiChoice);
                approval = false;
                alt = 1;
                break;
            case 1:
                if (votes.has(voyante[i])) {
                    let vote = votes.get(voyante[i]);
                    if (vote.length > 0) {
                        let j = 0;
                        for (; j < vote.length && (!as(emojiChoice, vote[j]) || emojiToIdAssociation.get(vote[j]) === voyante[i]); j++);

                        if (j < vote.length) {
                            let id = emojiToIdAssociation.get(vote[j]);
                            send("<@!" + id + "> est un " + idToRoleAssociation.get(id) + " ! ", voyante[i], [vote[j]]);
                        } else {
                            send("Votre vote est invalide ! ", voyante[i]);
                            approval = false;
                        }
                    } else {
                        send("Vous n'avez pas voter ! ", voyante[i]);
                        approval = false;
                    }
                } else {
                    send("Vous n'avez pas de droit de vote !? Vous devrier le dire a un admin c'est étrange... ", voyante[i]);
                    approval = false;
                }
                break;
        }
    }

    return approval;
}

async function tourLoup() {
    let approval = true;
    let votePick = [];

    switch (alt) {
        case 0:
            for (let i = 0; i < loup.length; i++) {
                send("Qui voulez-vous dévorer cette nuit ? ", loup[i], emojiChoice);
                approval = false;
                alt = 1;
            }
            break;
        case 1:
            for (let i = 0; i < loup.length && approval; i++) {
                if (votes.has(loup[i])) {
                    let vote = votes.get(loup[i]);
                    if (vote.length > 0) {
                        let j = vote.length - 1;
                        for (; j >= 0 && (!as(emojiChoice, vote[j]) || as(loup, emojiToIdAssociation.get(vote[j]))); j--);

                        if (j < vote.length) {
                            let id = emojiToIdAssociation.get(vote[j]);
                            votePick.push(id);
                        } else {
                            send("Votre vote est invalide ! ", loup[i]);
                            approval = false;
                        }
                    } else {
                        send("Vous n'avez pas voter ! ", loup[i]);
                        approval = false;
                    }
                } else {
                    send("Vous n'avez pas de droit de vote !? Vous devrier le dire a un admin c'est étrange... ", loup[i]);
                    approval = false;
                }
            }

            if (approval) {
                console.log(votePick);

                let count = new Map();
                let opt = [];

                for (let i = 0; i < votePick.length; i++) {
                    if (count.has(votePick[i])) {
                        count.set(votePick[i], count.get(votePick[i]) + 1);
                    } else {
                        count.set(votePick[i], 1);
                        opt.push(votePick[i]);
                    }
                }

                let bigest = 0;
                let id = opt[0];
                let equal = false;
                let equalId = opt[0];

                for (let j = 0; j < opt.length; j++) {
                    let buf = count.get(opt[j]);
                    if (buf > bigest) {
                        bigest = buf;
                        id = opt[j];
                        equal = false;
                    } else if (buf === bigest) {
                        equal = true;
                        equalId = opt[j];
                    }
                }

                await sleep(150);

                let msg, emo;

                if (equal) {
                    approval = false;
                    msg = "<@!" + id + "> et <@!" + equalId + "> on tout les deux autant de votes, décider vous ! ";
                    emo = [idToEmojiAssociation.get(id), idToEmojiAssociation.get(equalId)];
                } else {
                    morts.push(id);
                    msg = "Vous avez dévorer <@!" + id + "> ! ";
                    emo = [idToEmojiAssociation.get(id)];
                }

                for (let i = 0; i < loup.length; i++) {
                    send(msg, loup[i], emo);
                    votes.set(loup[i], []);
                    await sleep(2000);
                }
            }
            break;
    }

    return approval;
}

async function tourSorciere() {
    let approval = true;

    for (let i = 0; i < sorciere.length && approval; i++) {
        switch (alt) {
            case 0:
                let vie = morts.length > 0 && potionVie;
                let mort = potionMort && (alive.length - morts.length) > 1;

                if (morts.length > 0) {
                    send("<@!" + morts[0] + "> est mort cette nuit, voulez-vous...", sorciere[i]);
                    if (!mort && !vie) {
                        break;
                    }
                }
                else {
                    send("Personne n'est mort cette nuit, voulez-vous...", sorciere[i]);
                    if (!mort) {
                        break;
                    }
                }

                await sleep(250);

                let message = "";
                let emote = [];
                if (vie) {
                    message += "Le réssucité :innocent: ? ";
                    emote.push('😇');
                }
                message += (mort ? "N" : "Ou n") + "e rien faire :neutral_face: ? ";
                emote.push('😐');
                if (mort) {
                    message += "Ou empoisoner quelqu'un d'autre :nauseated_face: ? ";
                    emote.push('🤢');
                }

                await sleep(250);
                send(message, sorciere[i], emote);

                approval = false;
                alt = 1;
                break;
            case 1:
                if ((morts.length > 0 && potionVie) || potionMort) {
                    if (votes.has(sorciere[i])) {
                        let vote = votes.get(sorciere[i]);
                        if (vote.length > 0) {
                            let j = 0;
                            let vie = morts.length > 0 && potionVie;
                            let mort = potionMort && (alive.length - morts.length) > 1;
                            for (; j < vote.length && (!(vote[j] === '😇' && vie) && vote[j] != '😐' && !(vote[j] === '🤢' && mort)); j++);

                            await sleep(150);

                            if (j < vote.length) {
                                switch (vote[j]) {
                                    case '😇':
                                        potionVie = false;
                                        morts.pop();
                                        break;
                                    case '😐':
                                        break;
                                    case '🤢':
                                        potionMort = false;
                                        votes.set(sorciere[i], []);
                                        approval = false;
                                        send("Qui ? ", sorciere[i], emojiChoice);
                                        alt = 2;
                                        break;
                                }
                            } else {
                                send("Votre vote est invalide ! ", sorciere[i]);
                                approval = false;
                            }
                        } else {
                            send("Vous n'avez pas voter ! ", sorciere[i]);
                            approval = false;
                        }
                    } else {
                        send("Vous n'avez pas de droit de vote !? Vous devrier le dire a un admin c'est étrange... ", sorciere[i]);
                        approval = false;
                    }
                }
                break;
            case 2:
                if (votes.has(sorciere[i])) {
                    let vote = votes.get(sorciere[i]);
                    if (vote.length > 0) {
                        let j = 0;
                        for (; j < vote.length && (!as(emojiChoice, vote[j]) || emojiToIdAssociation.get(vote[j]) === sorciere[i]); j++);

                        if (j < vote.length) {
                            let id = emojiToIdAssociation.get(vote[j]);
                            morts.push(id);
                            send("Vous avez empoisoner <@!" + id + "> ! ", sorciere[i], [vote[j]]);
                        } else {
                            send("Votre vote est invalide ! ", sorciere[i]);
                            approval = false;
                        }
                    } else {
                        send("Vous n'avez pas voter ! ", sorciere[i]);
                        approval = false;
                    }
                } else {
                    send("Vous n'avez pas de droit de vote !? Vous devrier le dire a un admin c'est étrange... ", sorciere[i]);
                    approval = false;
                }
                break;
        }
    }

    return approval;
}

async function tourVoleur() {
    let approval = true;

    for (let i = 0; i < voleur.length && approval; i++) {
        switch (alt) {
            case 0:
                send("Quelle joueur voulez-vous voler ? ", voleur[i], emojiChoice);
                approval = false;
                alt = 1;
                break;
            case 1:
                if (votes.has(voleur[i])) {
                    let vote = votes.get(voleur[i]);
                    if (vote.length > 0) {
                        let j = 0;
                        for (; j < vote.length && (!as(emojiChoice, vote[j]) || emojiToIdAssociation.get(vote[j]) === voleur[i]); j++);

                        if (j < vote.length) {
                            let idVoleur = voleur[i];
                            let id = emojiToIdAssociation.get(vote[j]);
                            let newRole = idToRoleAssociation.get(id);
                            idToRoleAssociation.set(id, "voleur");
                            idToRoleAssociation.set(idVoleur, newRole);

                            voleur.splice(i, 1);
                            voleur.push(id);

                            switch (newRole) {
                                case "loup":
                                    loup.push(idVoleur);
                                    emojiLoup.push(idToEmojiAssociation.get(idVoleur));
                                    emojiVillage.push(idToEmojiAssociation.get(id));
                                    await sleep(200);
                                    loup = deleteFromArray(loup, id);
                                    emojiLoup = deleteFromArray(emojiLoup, idToEmojiAssociation.get(id));
                                    emojiVillage = deleteFromArray(emojiVillage, idToEmojiAssociation.get(idVoleur));
                                    break;
                                case "voyante":
                                    voyante.push(idVoleur);
                                    await sleep(200);
                                    voyante = deleteFromArray(voyante, id);
                                    break;
                                case "chasseur":
                                    chasseur.push(idVoleur);
                                    await sleep(200);
                                    chasseur = deleteFromArray(chasseur, id);
                                    break;
                                case "cupidon":
                                    cupidon.push(idVoleur);
                                    await sleep(200);
                                    cupidon = deleteFromArray(cupidon, id);
                                    break;
                                case "sorciere":
                                    sorciere.push(idVoleur);
                                    await sleep(200);
                                    sorciere = deleteFromArray(sorciere, id);
                                    break;
                                case "voleur":
                                    voleur.push(idVoleur);
                                    await sleep(200);
                                    voleur = deleteFromArray(voleur, id);
                                    break;
                                default:
                                    villageois.push(idVoleur);
                                    await sleep(200);
                                    villageois = deleteFromArray(villageois, id);
                                    break;
                            }

                            send("Vous avez voler <@!" + id + "> et avez aquéri son rôle " + newRole + " <@!" + idVoleur + "> ! ", idVoleur, [idToEmojiAssociation.get(idVoleur)]);
                            await sleep(1000);
                            send("Vous vous ête fait volez <@!" + id + "> ! Vous ête maintenant le voleur ! ", id, [vote[j]]);
                            await sleep(1000);
                            if (newRole == "loup") {
                                for (let k = 0; k < loup.length - 1; k++) {
                                    send("<@!" + id + "> n'est plus un loup, <@!" + idVoleur + "> est maintenant un loup", loup[k], [idToEmojiAssociation.get(idVoleur)]);
                                    await sleep(1000);
                                }
                            }
                        } else {
                            send("Votre vote est invalide ! ", voleur[i]);
                            approval = false;
                        }
                    } else {
                        send("Vous n'avez pas voter ! ", voleur[i]);
                        approval = false;
                    }
                } else {
                    send("Vous n'avez pas de droit de vote !? Vous devrier le dire a un admin c'est étrange... ", voleur[i]);
                    approval = false;
                }
                break;
        }
    }

    return approval;
}

function deleteFromArray(array, match) {
    for (let i = 0; i < array.length; i++) {
        if (array[i] == match) {
            array.splice(i, 1);
        }
    }
    return array;
}

function conversion(rawData) {
    let data = (rawData >> 8) + ((rawData & 0xff) << 8);
    return data;
}

async function button() {
    let i2c1 = i2c.openSync(1);
    i2c1.writeWordSync(URM09_ADDR, CFG_INDEX, (0x00 | 0x20));
    await sleep(100);

    let dist = 0;
    //let temp = 0;

    let as = 0;

    while (true) {
        i2c1.writeWordSync(URM09_ADDR, CMD_INDEX, 0x01);
        await sleep(50);

        dist = conversion(i2c1.readWordSync(URM09_ADDR, DIST_H_INDEX));
        //temp = conversion(i2c1.readWordSync(URM09_ADDR, TEMP_H_INDEX));

        if (dist <= 20) {
            if (as == 0) {
                console.log(dist);
                send("test", channelDiscution);
            }

            as = 5;

            //console.log(dist);
        } else if (dist <= 300 && as > 0) {
            as--;
        }
        //console.log(temp);
    }

    i2c1.closeSync();
}