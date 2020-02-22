const Discord = require('discord.io');
const logger = require('winston');
const auth = require('./auth.json');
const delay = require('delay');

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

const roles = ["loup", "loup", "loup", "loup", "voyante", "chasseur", "cupidon", "sorciere"];

var loup = [];
var voyante = [];
var chasseur = [];
var cupidon = [];
var sorciere = [];
var villageois = [];

var turn = 0;

const turnDay = 0;
const turnCupidon = 1;
const turnVoyante = 2;
const turnLoup = 3;
const turnSorciere = 4;

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

bot.on('ready', function (evt) {
    console.log('Connected');
    console.log('Logged in as: ');
    console.log(bot.username + ' - (' + bot.id + ')');
});

bot.on('message', async (user, userID, channelID, message, evt) => {
    let directMessage = false;

    try {
        if (evt.d.member.roles.length > 0 && evt.d.member.roles[0] === roleBot) {
            return;
        }
    } catch (Exception) {
        directMessage = true;
        console.log(message);
    }

    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`
    if (message.substring(0, 1) === '!') {
        var args = message.substring(1).split(' ');
        var cmd = args[0].toLocaleLowerCase();
        args = args.splice(1);

        switch (cmd) {
            case 'say':
                if (!directMessage) deleteMessage(channelID, evt.d.id);

                if (!directMessage && (as(evt.d.member.roles, roleAdmin) && as(evt.d.member.roles, roleBotOverlord)) && args.length > 0) {
                    send(message.substr(5), channelID);
                }
                return;
            case 'dm':
                if (!directMessage) deleteMessage(channelID, evt.d.id);

                if (!directMessage && (as(evt.d.member.roles, roleAdmin) || as(evt.d.member.roles, roleBotOverlord)) && args.length > 0) {
                    send(message.substr(27), args[0].replace("<@!", "").replace(">", ""));
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
                deleteMessage(channelID, evt.d.id);

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

                        if (!as(participantsID, id)) {
                            participantsID.push(id);
                            await play([id]);
                            await send("<@!" + id + "> a rejoin la partie", channelLoupGarou);
                            await send(" ", id);
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

                            loup = [];
                            voyante = [];
                            chasseur = [];
                            cupidon = [];
                            sorciere = [];
                            villageois = [];

                            var choix = [];
                            for (var i = 0; i < participantsID.length; i++) {
                                choix.push(participantsID[i]);
                            }

                            var role = [];
                            for (var i = 0; i < roles.length; i++) {
                                role.push(roles[i]);
                            }

                            var first = true;
                            while (choix.length > 0) {
                                var i = role.length > 0 ? Math.floor(Math.random() * role.length) : -1;
                                var j = Math.floor(Math.random() * choix.length);

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
                                    default:
                                        villageois.push(choix[j]);
                                        break;
                                }

                                send("Le rôle " + (i >= 0 ? role[i] : "villageois") + " vous a été attribuer <@!" + choix[j] + ">", choix[j]);

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

                            await send("<@!" + userID + "> a fait débuter la partie. ", channelID);
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
                    case 'nextturn':
                        deleteMessage(channelID, evt.d.id);
                        if (created && (userID === gameMasterID || as(evt.d.member.roles, roleAdmin))) {
                            turn++;
                            turn %= 4;
                            send("C'est maintenant le tour des " + turnOfString(turn), channelID);
                            let joueurTurn = turnOf(turn);
                            for (let i = 0; i < joueurTurn.length; i++) {
                                send("C'est a toi de jouer", joueurTurn[i]);
                            }
                        }
                        break;
                }
            case channelTurn:
                break;
        }
    }
});

bot.on('messageReactionAdd', function (reaction, user) {
    switch (reaction.d.channel_id) {
        case '678654094210236456':

            switch (reaction.d.message_id) {
                case '678715439995682816':
                    //console.log(reaction);
                    //console.log(reaction);

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

async function send(message, ID) {
    console.log(message);
    try {
        await bot.sendMessage({
            to: ID,
            message: message
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
        case turnCupidon:
            return "cupidon";
        case turnVoyante:
            return "voyante";
        case turnLoup:
            return "loup";
        case turnSorciere:
            return "sorciere";
    }
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