const Discord = require('discord.io');
const logger = require('winston');
const auth = require('./auth.json');
const delay = require('delay');
const fs = require('fs');

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
const roleJoueur = "679302521956597760";
const roleBotOverlord = "679853889260093512";

const channelLoupGarou = "679142469685739531";
const vocalLoupGarou = "679145725463887922";

var created = false;
var started = false;

var gameMasterID = null;

var participantsID = [];
var alive = [];

const roles = ["loup", "loup", "loup", "loup", "voyante", "chasseur", "cupidon", "sorciere"];

let listEmojis = [];

let potionVie = true;
let potionMort = true;

let emojiChoice = [];
let emojiToIdAssociation = new Map();
let idToEmojiAssociation = new Map();
let votes = new Map();

let morts = [];

let idToRoleAssociation = new Map();

var loup = [];
var voyante = [];
var chasseur = [];
var cupidon = [];
var sorciere = [];
var villageois = [];

var turn = 0;

const turnDay = 0;
const turnCupidon = 1;
const turnVoyante = 4;//changement temporaire remetre a 2 plus tard
const turnLoup = 3;
const turnSorciere = 2;//changement temporaire remetre a 4 plus tard

let allEmojiList = [];

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';
// Initialize Discord Bot
var bot = new Discord.Client({
    token: auth.token,
    autorun: true
});

bot.on('ready', async (evt) => {
    console.log('Connected');
    console.log('Logged in as: ');
    console.log(bot.username + ' - (' + bot.id + ')');

    try {
        const data = fs.readFileSync('emoji.txt', 'utf8');
        allEmojiList = data.split(" ");
    } catch (err) {
        console.error(err);
    }
});

bot.on('message', async (user, userID, channelID, message, evt) => {
    let directMessage = false;

    try {
        if (evt.d.member.roles.length > 0 && evt.d.member.roles[0] === roleBot) {
            return;
        }
    } catch (Exception) {
        directMessage = true;
        console.log(user + "<@!" + userID + "> : " + message);
    }


    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`
    if (message.substring(0, 1) === '!') {
        var args = message.substring(1).split(' ');
        var cmd = args[0].toLocaleLowerCase();
        args = args.splice(1);

        switch (cmd) {
            case 'display':
                if (!directMessage) { deleteMessage(channelID, evt.d.id); }
                if (created && started) {
                    listEmojiId(channelID, participantsID);
                }
                return;
            case 'done':
                if (!directMessage) { deleteMessage(channelID, evt.d.id); }
                else if (created && started && turn != turnDay && as(turnOf(turn), userID)) {
                    if (await endTurn(turn) === true) {
                        nextTurn();
                    }
                }
                return;
            case 'emoji':
                if (!directMessage) deleteMessage(channelID, evt.d.id);

                if (!directMessage && (as(evt.d.member.roles, roleAdmin) || as(evt.d.member.roles, roleBotOverlord))) {
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

                if (!directMessage && (as(evt.d.member.roles, roleAdmin) || as(evt.d.member.roles, roleBotOverlord)) && args.length > 0) {
                    send(message.substr(5), channelID, listEmojis);
                }
                return;
            case 'dm':
                if (!directMessage) deleteMessage(channelID, evt.d.id);

                if (!directMessage && (as(evt.d.member.roles, roleAdmin) && as(evt.d.member.roles, roleBotOverlord)) && args.length > 0) {
                    send(message.substr(27), args[0].replace("<@!", "").replace(">", ""), listEmojis);
                }
                return;
            case 'clear':
                if (!directMessage && as(evt.d.member.roles, roleAdmin) && args.length > 0) {
                    clearMessage(channelID, (args[0].toLowerCase() === "all" ? null : args[0]));
                }
                return;
            case 'ping':
                await bot.sendMessage({
                    to: channelID,
                    message: 'Pong!'
                });
                return;
            case 'join':
                if (!directMessage) deleteMessage(channelID, evt.d.id);

                if (created && !started) {
                    var i = 0;
                    do {
                        let id = "";

                        if (args.length == 0) {
                            id = userID;
                        } else if (as(evt.d.member.roles, roleAdmin)) {
                            id = args[i].replace("<@!", "").replace(">", "");
                        } else {
                            break;
                        }

                        if (!as(participantsID, id) && participantsID.length < 20) {
                            participantsID.push(id);
                            await play([id]);
                            await send("<@!" + id + "> a rejoin la partie", channelLoupGarou);
                        }

                        i++;
                    } while (i < args.length);
                }
                break;
        }

        switch (channelID) {
            case channelLoupGarou:
                switch (cmd) {
                    case 'create':
                        deleteMessage(channelID, evt.d.id);
                        if (!started && !created) {
                            gameMasterID = userID;

                            participantsID = [];
                            participantsID.push(gameMasterID);

                            await play([gameMasterID]);

                            //send("DM beep beep", participantsID[participantsID.length - 1]);

                            created = true;
                            await send("<@!" + userID + "> a créé une nouvelle partie. ", channelID);
                        }
                        break;
                    case 'start':
                        deleteMessage(channelID, evt.d.id);
                        if (created && !started && (userID === gameMasterID || as(evt.d.member.roles, roleAdmin))) {
                            started = true;

                            var choixLoup = true;

                            potionVie = true;
                            potionMort = true;

                            loup = [];
                            voyante = [];
                            chasseur = [];
                            cupidon = [];
                            sorciere = [];
                            villageois = [];

                            idToRoleAssociation = new Map();

                            morts = [];

                            let copyEmoji = allEmojiList;
                            emojiChoice = [];
                            emojiToIdAssociation = new Map();
                            idToEmojiAssociation = new Map();
                            votes = new Map();
                            alive = [];
                            var choix = [];
                            for (var i = 0; i < participantsID.length; i++) {
                                alive.push(participantsID[i]);
                                choix.push(participantsID[i]);
                                votes.set(participantsID[i], []);
                            }

                            var role = [];
                            for (var i = 0; i < roles.length; i++) {
                                role.push(roles[i]);
                            }

                            var first = true;
                            while (choix.length > 0) {
                                var i = role.length > 0 ? Math.floor(Math.random() * role.length) : -1;
                                var j = Math.floor(Math.random() * choix.length);
                                let k = Math.floor(Math.random() * copyEmoji.length);

                                while (i >= 0 && role[i] == "loup" && !choixLoup && asElse(role, "loup")) {
                                    i = Math.floor(Math.random() * role.length);
                                }
                                choixLoup = true;

                                if (choix.length == 1 && first) {
                                    i = role.length - 1;
                                    first = false;
                                }

                                switch (i >= 0 ? role[i] : "villageois") {
                                    case "loup":
                                        loup.push(choix[j]);
                                        choixLoup = false;
                                        //first = false;
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
                                        first = false;
                                        break;
                                    default:
                                        villageois.push(choix[j]);
                                        break;
                                }

                                send("Le rôle " + (i >= 0 ? role[i] : "villageois") + " vous a été attribuer <@!" + choix[j] + ">", choix[j], [copyEmoji[k]]);
                                emojiToIdAssociation.set(copyEmoji[k], choix[j]);
                                idToEmojiAssociation.set(choix[j], copyEmoji[k]);
                                idToRoleAssociation.set(choix[j], (i >= 0 ? role[i] : "villageois"));
                                emojiChoice.push(copyEmoji[k]);

                                await delay(200);

                                copyEmoji.splice(k, 1);
                                choix.splice(j, 1);
                                if (i >= 0) role.splice(i, 1);
                            }

                            await delay(100);

                            for (let i = 0; i < loup.length; i++) {
                                for (let j = 0; j < loup.length; j++) {
                                    if (i != j) {
                                        send("Vous jouer avec <@!" + loup[j] + ">", loup[i]);
                                    }
                                }

                                if (loup.length > 1) {
                                    await delay(100);
                                    send("Vous devriez créer un groupe DM avec " + ((loup.length > 2) ? "eu" : "lui"), loup[i]);
                                }
                            }

                            send("<@!" + userID + "> a fait débuter la partie. ", channelID);

                            await delay(100);

                            listEmojiId(channelLoupGarou, participantsID);
                        }
                        break;
                    case 'end':
                        deleteMessage(channelID, evt.d.id);
                        if (created && (userID === gameMasterID || as(evt.d.member.roles, roleAdmin))) {
                            await stopPlay(participantsID);

                            gameMasterID = null;
                            participantsID = [];

                            created = false;
                            started = false;

                            send("<@!" + userID + "> a mis fin à la partie. ", channelID);
                            stopPlay(participantsID);
                        }
                        break;
                    case 'next':
                        deleteMessage(channelID, evt.d.id);
                        if ((userID === gameMasterID || as(evt.d.member.roles, roleAdmin))) {
                            nextTurn();
                        }
                        break;
                    case 'kill':
                        deleteMessage(channelID, evt.d.id);
                        if (created && started && (userID === gameMasterID || as(evt.d.member.roles, roleAdmin))) {
                            morts.push(args[0].replace("<@!", "").replace(">", ""));
                        }
                        break;
                }
        }
    }
});

async function listEmojiId(channelID, array) {
    let msg = "";
    console.log(idToEmojiAssociation);
    for (var i = 0; i < array.length; i++) {
        msg += "<@!" + array[i] + "> : " + idToEmojiAssociation.get(array[i]) + " ; ";
    }
    await delay(100);

    send(msg, channelID, emojiChoice);
}

async function nextTurn() {
    if (created && started) {
        turn++;
        turn %= 5;

        for (var i = 0; i < participantsID.length; i++) {
            votes.set(participantsID[i], []);
        }

        send("C'est le " + turnOfString(turn), channelLoupGarou);

        let joueurTurn = turnOf(turn);
        if (joueurTurn != null) {
            for (let i = 0; i < joueurTurn.length; i++) {
                send("C'est a toi de jouer", joueurTurn[i]);
            }
        }

        await delay(150);
        doTurn(turn);
    }
}

bot.on('messageReactionAdd', async (reaction, user) => {
    try {
        if (created && started && reaction.d.guild_id == undefined) {
            if (turnOf(turn) === null || as(turnOf(turn), reaction.d.user_id)) {
                votes.get(reaction.d.user_id).push(reaction.d.emoji.name);
                console.log(votes);
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
                            await delay(500);
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
    for (var i = 0; i < array.length; i++) {
        if (array[i] == match) {
            return true;
        }
    }
    return false;
}

function asElse(array, match) {
    for (var i = 0; i < array.length; i++) {
        if (array[i] != match) {
            return true;
        }
    }
    return false;
}

async function clearMessage(channelID, limit) {
    var b = [];

    if (limit != null) {
        limit = parseInt(limit) + 1;
        await bot.getMessages({ channelID: channelID, limit: limit }, async (err, response) => {
            if (err) {
                console.log(err);
            } else {
                b = [];
                for (var c = 0; c < limit && c < response.length; c++) b.push(response[c].id);
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
            await bot.getMessages({ channelID: channelID, limit: 100 }, async (err, response) => {
                if (err) {
                    console.log(err);
                } else {
                    b = [];
                    for (var c = 0; c < response.length; c++) b.push(response[c].id);
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

async function play(players) {
    for (var i = 0; i < players.length; i++) {
        let doIt = false;
        let player = players[i];

        do {
            await bot.addToRole({
                serverID: serverID,
                userID: players[i],
                roleID: roleJoueur
            }, async (err, response) => {
                if (err) {
                    logger.error(err);
                    doIt = true;
                    await delay(200);
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
                        await delay(200);
                    } else {
                        doIt = !as(response.roles, roleJoueur);
                    }
                });
            }
        } while (doIt);
    }
}

async function stopPlay(players) {
    for (var i = 0; i < players.length; i++) {
        let doIt = false;
        let player = players[i];

        do {
            await bot.removeFromRole({
                serverID: serverID,
                userID: players[i],
                roleID: roleJoueur
            }, async (err, response) => {
                if (err) {
                    logger.error(err);
                    doIt = true;
                    await delay(200);
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
                        await delay(200);
                    } else {
                        doIt = as(response.roles, roleJoueur);
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
    }
}

async function doTurn(turn) {
    switch (turn) {
        case turnDay:
            send("Les votes du jour n'ont pas encore été implémenter", channelLoupGarou);
            morts = [];
            break;
        case turnCupidon:
            send("Le tour du cupidon n'a pas encore été implémenter", channelLoupGarou);
            break;
        case turnVoyante:
            send("Le tour de la voyante n'a pas encore été implémenter", channelLoupGarou);
            break;
        case turnLoup:
            send("Le tour des loups-garous n'a pas encore été implémenter", channelLoupGarou);
            break;
        case turnSorciere:
            for (let i = 0; i < sorciere.length; i++) {
                let vie = morts.length > 0 && potionVie;
                let mort = potionMort && (alive.length - morts.length) > 1;

                if (morts.length > 0) { send("<@!" + morts[0] + "> est mort cette nuit, voulez-vous...", sorciere[i]); }
                else { send("Personne n'est mort cette nuit, voulez-vous...", sorciere[i]); }

                if (vie || mort) {
                    await delay(150);
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
                    send(message, sorciere[i], emote);
                }
            }
            break;
    }
}

async function endTurn(turn) {
    let approval = true;

    switch (turn) {
        case turnDay:
            break;
        case turnCupidon:
            break;
        case turnVoyante:
            break;
        case turnLoup:
            break;
        case turnSorciere:
            for (let i = 0; i < sorciere.length && approval; i++) {
                if ((morts.length > 0 && potionVie) || potionMort) {
                    if (votes.has(sorciere[i])) {
                        let vote = votes.get(sorciere[i]);
                        if (vote.length > 0) {
                            let j = 0;
                            for (; j < vote.length && (!(vote[j] === '😇' && potionVie) && vote[j] != '😐' && !(vote[j] === '🤢' && potionMort)); j++);

                            if (j < vote.length) {
                                switch (vote[j]) {
                                    case '😇':
                                        potionVie = false;
                                        break;
                                    case '😐':
                                        break;
                                    case '🤢':
                                        potionMort = false;
                                        send("Qui ? ", sorciere[i], emojiChoice);
                                        break;
                                }
                            } else {
                                approval = false;
                            }
                        } else {
                            approval = false;
                        }
                    } else {
                        approval = false;
                    }
                }
            }
            break;
        default:
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

function kill(ID) {
    ID = ID.replace("<@!", "").replace(">", "");
    for (let i = 0; i < alive.length; i++) {
        if (alive[i] === ID) {
            alive.slice(i, 1);
            break;
        }
    }
}